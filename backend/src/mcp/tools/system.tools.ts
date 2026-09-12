import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Student from '../../models/Student.js';
import Faculty from '../../models/Faculty.js';
import Course from '../../models/Course.js';
import Department from '../../models/Department.js';
import Book from '../../models/Book.js';
import AuditLog from '../../models/AuditLog.js';
import SystemSettings from '../../models/SystemSettings.js';
import { getDashboardStats } from '../../controllers/adminDashboardController.js';
import { runController } from '../controllerAdapter.js';
import { success, error } from '../types.js';
import { requireAuth, requireRole, getCurrentUser } from '../context.js';
import { withTimeout } from '../utils/withTimeout.js';

export function registerSystemTools(server: McpServer) {

  // ─── dashboard_stats ────────────────────────────────────────────
  server.tool(
    'dashboard_stats',
    'Aggregate dashboard statistics for the authenticated admin\'s college: active students, active faculty, total revenue, attendance, monthly trends. Reuses the live admin dashboard controller.',
    {},
    async () => {
      try {
        const ctx = requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN');
        if (ctx.isService) {
          return error('dashboard_stats needs a user JWT (it is scoped to the admin\'s college). Use auth_login first.');
        }
        const outcome = await withTimeout(
          runController(getDashboardStats, { user: ctx.user }),
          'dashboard_stats'
        );
        if (outcome.status >= 400) return error(outcome.body?.message || 'Failed to load stats');
        return success(outcome.body);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── recent_activity ────────────────────────────────────────────
  server.tool(
    'recent_activity',
    'Return the most recent audit-log entries (logins, creates, updates, deletes). Admin only. Optionally filter by action or resource type.',
    {
      action: z.enum(['CREATE', 'READ', 'UPDATE', 'DELETE', 'PUBLISH', 'APPROVE', 'LOGIN', 'LOGOUT']).optional(),
      resourceType: z.string().optional().describe('e.g. "Student", "User", "Course"'),
      limit: z.number().optional().describe('Number of entries (default 20, max 100)'),
    },
    async (params) => {
      try {
        requireRole('SUPER_ADMIN', 'COLLEGE_ADMIN');
        const filter: any = {};
        if (params.action) filter.action = params.action;
        if (params.resourceType) filter.resource_type = params.resourceType;
        const limit = Math.min(100, Math.max(1, params.limit || 20));
        const logs = await AuditLog.find(filter)
          .sort({ timestamp: -1 })
          .limit(limit)
          .populate('userId', 'name email role')
          .lean();
        return success({ count: logs.length, activity: logs });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── search_global ──────────────────────────────────────────────
  server.tool(
    'search_global',
    'Full-text style search across the CMS: students, faculty, courses, departments, and library books. Returns grouped matches. Requires authentication.',
    {
      query: z.string().describe('Search term (matched case-insensitively)'),
      limit: z.number().optional().describe('Max results per collection (default 10, max 50)'),
    },
    async (params) => {
      try {
        requireAuth();
        const term = params.query?.trim();
        if (!term) return error('query is required');
        const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        const limit = Math.min(50, Math.max(1, params.limit || 10));

        // Scope each collection to the caller's college when applicable.
        const me = getCurrentUser();
        const collegeFilter = me?.collegeId && me.role !== 'SUPER_ADMIN' ? { collegeId: me.collegeId } : {};

        const safeFind = async (label: string, work: Promise<any[]>) => {
          try {
            return { label, results: await work };
          } catch {
            return { label, results: [], note: 'collection unavailable' };
          }
        };

        const [students, faculty, courses, departments, books] = await Promise.all([
          safeFind('students', Student.find({
            ...collegeFilter,
            $or: [
              { 'personalInfo.firstName': regex },
              { 'personalInfo.lastName': regex },
              { 'personalInfo.email': regex },
              { uniqueStudentId: regex },
              { enrollmentId: regex },
            ],
          }).select('uniqueStudentId enrollmentId personalInfo.firstName personalInfo.lastName personalInfo.email').limit(limit).lean()),
          safeFind('faculty', Faculty.find({
            ...collegeFilter,
            $or: [{ 'personalInfo.name': regex }, { 'personalInfo.email': regex }, { employeeId: regex }],
          }).select('employeeId personalInfo department designation').limit(limit).lean()),
          safeFind('courses', Course.find({
            ...collegeFilter,
            $or: [{ name: regex }, { code: regex }],
          }).select('name code department').limit(limit).lean()),
          safeFind('departments', Department.find({ ...collegeFilter, name: regex }).select('name').limit(limit).lean()),
          safeFind('books', Book.find({
            ...collegeFilter,
            $or: [{ title: regex }, { author: regex }, { isbn: regex }],
          }).select('title author isbn').limit(limit).lean()),
        ]);

        const groups = [students, faculty, courses, departments, books];
        const total = groups.reduce((n, g) => n + g.results.length, 0);
        return success({ query: term, total, groups });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── categories_get ─────────────────────────────────────────────
  server.tool(
    'categories_get',
    'List the CMS taxonomy: departments and courses (the "categories" content is organized under). Requires authentication.',
    {
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
    },
    async (params) => {
      try {
        requireAuth();
        const me = getCurrentUser();
        const filter: any = {};
        if (params.collegeId) filter.collegeId = params.collegeId;
        else if (me?.collegeId && me.role !== 'SUPER_ADMIN') filter.collegeId = me.collegeId;

        const [departments, courses] = await Promise.all([
          Department.find(filter).select('name collegeId').sort({ name: 1 }).lean(),
          Course.find(filter).select('name code department collegeId').sort({ name: 1 }).lean(),
        ]);
        return success({ departments, courses });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── settings_get ───────────────────────────────────────────────
  server.tool(
    'settings_get',
    'Return non-sensitive system settings (timezone, language, maintenance mode, password policy, session timeout). Requires authentication. Secrets are never exposed.',
    {},
    async () => {
      try {
        requireAuth();
        const settings = await SystemSettings.findOne().lean();
        if (!settings) return success({ message: 'No system settings configured; defaults in effect.' });
        // Whitelist fields — never leak anything secret-adjacent.
        return success({
          timezone: settings.timezone,
          language: settings.language,
          maintenance_mode: settings.maintenance_mode,
          password_policy: settings.password_policy,
          session_timeout: settings.session_timeout,
          rate_limiting: settings.rate_limiting,
          two_factor_auth: settings.two_factor_auth,
          updatedAt: settings.updatedAt,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
