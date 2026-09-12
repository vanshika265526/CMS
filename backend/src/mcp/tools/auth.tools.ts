import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import User from '../../models/User.js';
import { loginUser, getUserProfile, changePassword } from '../../controllers/authController.js';
import { runController } from '../controllerAdapter.js';
import { paginate, toObjectId } from '../helpers.js';
import { success, error } from '../types.js';
import { getCurrentUser, requireAuth, requireRole } from '../context.js';
import { withTimeout } from '../utils/withTimeout.js';

const ADMIN = ['SUPER_ADMIN', 'COLLEGE_ADMIN'];

export function registerAuthTools(server: McpServer) {

  // ─── auth_login ─────────────────────────────────────────────────
  // Public tool: exchanges credentials for a JWT. Reuses the real loginUser
  // controller (rate-limiting, lockout, session creation all preserved).
  server.tool(
    'auth_login',
    'Authenticate with email/registrationId + password and receive a JWT. Pass the returned token as a Bearer token on subsequent MCP requests to act as that user. Reuses the live login controller (account lockout, sessions, password policy all enforced).',
    {
      identifier: z.string().describe('Email address or registration/enrollment ID'),
      password: z.string().describe('Account password'),
    },
    async (params) => {
      try {
        const outcome = await withTimeout(
          runController(loginUser, {
            body: { identifier: params.identifier, password: params.password },
            headers: { 'user-agent': 'mcp-client' },
          }),
          'auth_login'
        );
        if (outcome.status >= 400) {
          return error(outcome.body?.message || 'Login failed');
        }
        return success({
          message: '✅ Authenticated. Use `token` as your Bearer token on future MCP calls.',
          ...outcome.body,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── auth_profile ───────────────────────────────────────────────
  server.tool(
    'auth_profile',
    'Return the profile of the currently authenticated user (derived from the Bearer JWT on this MCP request).',
    {},
    async () => {
      try {
        const ctx = requireAuth();
        if (ctx.isService) {
          return success({ role: 'SERVICE', message: 'Authenticated via service token (no user profile).' });
        }
        const outcome = await runController(getUserProfile, { user: ctx.user });
        if (outcome.status >= 400) return error(outcome.body?.message || 'Profile not found');
        return success(outcome.body);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── auth_change_password ───────────────────────────────────────
  server.tool(
    'auth_change_password',
    'Change the authenticated user\'s password. Enforces the strong-password policy (min 8 chars, uppercase, number, special char).',
    {
      currentPassword: z.string().describe('Current password'),
      newPassword: z.string().describe('New password (must meet strength policy)'),
    },
    async (params) => {
      try {
        const ctx = requireAuth();
        if (ctx.isService) return error('Service token cannot change a user password.');
        const outcome = await runController(changePassword, {
          user: ctx.user,
          body: { currentPassword: params.currentPassword, newPassword: params.newPassword },
        });
        if (outcome.status >= 400) return error(outcome.body?.message || 'Password change failed');
        return success(outcome.body);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── user_list ──────────────────────────────────────────────────
  server.tool(
    'user_list',
    'List system users (login accounts). Admin only. Filter by role, active state, college, or free-text search on name/email.',
    {
      role: z.enum(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'LIBRARIAN']).optional(),
      isActive: z.boolean().optional().describe('Filter by active state'),
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      search: z.string().optional().describe('Search by name or email'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const ctx = requireRole(...ADMIN);
        const filter: any = {};
        if (params.role) filter.role = params.role;
        if (typeof params.isActive === 'boolean') filter.isActive = params.isActive;
        // College admins are scoped to their own college unless they pass an explicit one.
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        else if (!ctx.isService && ctx.role !== 'SUPER_ADMIN' && ctx.user?.collegeId) {
          filter.collegeId = ctx.user.collegeId;
        }
        if (params.search) {
          const regex = new RegExp(params.search, 'i');
          filter.$or = [{ name: regex }, { email: regex }, { registrationId: regex }];
        }

        const query = User.find(filter)
          .select('-password -authentication')
          .sort({ createdAt: -1 });
        const countQuery = User.countDocuments(filter);
        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── user_get ───────────────────────────────────────────────────
  server.tool(
    'user_get',
    'Get a single user account by _id or email. Admin only.',
    {
      id: z.string().optional().describe('User _id (ObjectId)'),
      email: z.string().optional().describe('User email'),
    },
    async (params) => {
      try {
        requireRole(...ADMIN);
        if (!params.id && !params.email) return error('Provide either id or email');
        const filter = params.id ? { _id: toObjectId(params.id, 'id') } : { email: params.email };
        const user = await User.findOne(filter).select('-password').lean();
        if (!user) return error('User not found');
        return success(user);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── user_create ────────────────────────────────────────────────
  server.tool(
    'user_create',
    'Create a new login account. Admin only. Password is hashed automatically. New users are flagged mustChangePassword.',
    {
      name: z.string(),
      email: z.string().describe('Unique email address'),
      password: z.string().describe('Initial password'),
      role: z.enum(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'LIBRARIAN']),
      collegeId: z.string().optional().describe('College ObjectId'),
      phone: z.string().optional(),
      registrationId: z.string().optional(),
    },
    async (params) => {
      try {
        const ctx = requireRole(...ADMIN);
        const existing = await User.findOne({ email: params.email.toLowerCase() });
        if (existing) return error(`A user with email "${params.email}" already exists`);

        // College admins can only create users within their own college.
        const collegeId = params.collegeId
          ? toObjectId(params.collegeId, 'collegeId')
          : ctx.user?.collegeId;

        const user = await User.create({
          name: params.name,
          email: params.email.toLowerCase(),
          password: params.password, // hashed by the User pre-save hook
          role: params.role,
          collegeId,
          phone: params.phone,
          registrationId: params.registrationId,
          isActive: true,
          mustChangePassword: true,
        });

        return success({
          message: '✅ User created',
          userId: user._id,
          email: user.email,
          role: user.role,
        });
      } catch (err: any) {
        if (err?.code === 11000) return error('Duplicate key: email or registrationId already in use');
        return error(err.message);
      }
    }
  );

  // ─── user_update ────────────────────────────────────────────────
  server.tool(
    'user_update',
    'Update a user account. Admin only. Use the "password" field to reset a password (it is re-hashed). Use isActive to enable/disable login.',
    {
      id: z.string().describe('User _id (ObjectId)'),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      role: z.enum(['SUPER_ADMIN', 'COLLEGE_ADMIN', 'TEACHER', 'STUDENT', 'PARENT', 'LIBRARIAN']).optional(),
      isActive: z.boolean().optional(),
      password: z.string().optional().describe('New password (will be hashed)'),
    },
    async (params) => {
      try {
        requireRole(...ADMIN);
        const user = await User.findById(toObjectId(params.id, 'id'));
        if (!user) return error('User not found');

        if (params.name !== undefined) user.name = params.name;
        if (params.email !== undefined) user.email = params.email.toLowerCase();
        if (params.phone !== undefined) user.phone = params.phone;
        if (params.role !== undefined) user.role = params.role as any;
        if (params.isActive !== undefined) user.isActive = params.isActive;
        if (params.password !== undefined) {
          user.password = params.password; // re-hashed by pre-save hook
          user.mustChangePassword = true;
        }
        await user.save();

        const safe = user.toObject();
        delete (safe as any).password;
        return success({ message: '✅ User updated', user: safe });
      } catch (err: any) {
        if (err?.code === 11000) return error('Duplicate key: email already in use');
        return error(err.message);
      }
    }
  );

  // ─── user_delete ────────────────────────────────────────────────
  server.tool(
    'user_delete',
    'Deactivate (default) or permanently delete a user account. Admin only. Soft-delete sets isActive=false.',
    {
      id: z.string().describe('User _id (ObjectId)'),
      hard: z.boolean().optional().describe('If true, permanently delete. Default: deactivate.'),
    },
    async (params) => {
      try {
        const ctx = requireRole(...ADMIN);
        const id = toObjectId(params.id, 'id');
        const user = await User.findById(id);
        if (!user) return error('User not found');

        // Prevent self-lockout.
        const me = getCurrentUser();
        if (me && String(me._id) === String(user._id)) {
          return error('You cannot delete or deactivate your own account.');
        }

        if (params.hard) {
          if (!ctx.isService && ctx.role !== 'SUPER_ADMIN') {
            return error('Only SUPER_ADMIN (or service token) may hard-delete users.');
          }
          await User.deleteOne({ _id: id });
          return success({ message: `⚠️ User ${user.email} permanently deleted` });
        }
        user.isActive = false;
        await user.save();
        return success({ message: `✅ User ${user.email} deactivated` });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
