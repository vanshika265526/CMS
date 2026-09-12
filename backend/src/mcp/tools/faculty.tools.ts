import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import Faculty from '../../models/Faculty.js';
import User from '../../models/User.js';
import { paginate, toObjectId } from '../helpers.js';
import { success, error } from '../types.js';

export function registerFacultyTools(server: McpServer) {

  // ─── faculty_list ───────────────────────────────────────────────
  server.tool(
    'faculty_list',
    'List/filter faculty profiles. Fields: employeeId, department, designation, qualification, experience, status, personalInfo{name,email,phone}.',
    {
      department: z.string().optional().describe('Filter by department name'),
      status: z.enum(['Active', 'On-Leave', 'Resigned']).optional().describe('Filter by status'),
      search: z.string().optional().describe('Search by name, email, or employeeId'),
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Items per page (default 20, max 100)'),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.department) filter.department = params.department;
        if (params.status) filter.status = params.status;
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        if (params.search) {
          const regex = new RegExp(params.search, 'i');
          filter.$or = [
            { 'personalInfo.name': regex },
            { 'personalInfo.email': regex },
            { employeeId: regex },
            { designation: regex },
          ];
        }

        const query = Faculty.find(filter)
          .select('employeeId department designation qualification experience status personalInfo.name personalInfo.email personalInfo.phone')
          .sort({ createdAt: -1 });
        const countQuery = Faculty.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── faculty_get ────────────────────────────────────────────────
  server.tool(
    'faculty_get',
    'Get a single faculty member by _id or employeeId. Returns full profile with assigned subjects.',
    {
      id: z.string().optional().describe('Faculty _id (ObjectId)'),
      employeeId: z.string().optional().describe('Employee ID string'),
    },
    async (params) => {
      try {
        if (!params.id && !params.employeeId) {
          return error('Provide either id or employeeId');
        }
        const filter = params.id
          ? { _id: toObjectId(params.id, 'id') }
          : { employeeId: params.employeeId };

        const faculty = await Faculty.findOne(filter)
          .populate('userId', 'name email role isActive')
          .lean();

        if (!faculty) return error('Faculty not found');
        return success(faculty);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── faculty_create ─────────────────────────────────────────────
  server.tool(
    'faculty_create',
    'Create a new faculty record. If userId is not provided, it auto-creates a User record (role TEACHER) with a temporary password and uses compensating cleanup on failure.',
    {
      employeeId: z.string().describe('Unique employee identifier'),
      collegeId: z.string().describe('College ObjectId'),
      userId: z.string().optional().describe('Existing User ObjectId (must have role TEACHER if provided)'),
      personalInfo: z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string(),
        photo: z.string().optional(),
      }).describe('Required personal details'),
      department: z.string().optional().describe('Department name'),
      designation: z.string().optional().describe('Designation (default Assistant Professor)'),
      qualification: z.string().optional().describe('Academic qualifications'),
      experience: z.number().optional().describe('Years of experience'),
      joiningDate: z.string().optional().describe('Joining date (ISO string)'),
    },
    async (params) => {
      let createdUserId: string | null = null;
      let createdFacultyId: string | null = null;

      try {
        // Validate uniqueness of employeeId
        const existingFaculty = await Faculty.findOne({ employeeId: params.employeeId, isDeleted: false });
        if (existingFaculty) {
          return error(`Faculty member with Employee ID "${params.employeeId}" already exists`);
        }

        let targetUserId = params.userId;

        if (!targetUserId) {
          // Check if email already exists in User collection
          const existingUser = await User.findOne({ email: params.personalInfo.email });
          if (existingUser) {
            return error(`User with email "${params.personalInfo.email}" already exists. Provide their userId instead.`);
          }

          // Step 1: Auto-create User
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash('Welcome@123', salt);

          const user = await User.create({
            name: params.personalInfo.name,
            email: params.personalInfo.email,
            password: hashedPassword,
            role: 'TEACHER',
            collegeId: toObjectId(params.collegeId, 'collegeId'),
            phone: params.personalInfo.phone,
            mustChangePassword: true,
            isFirstLogin: true,
          });
          createdUserId = user._id.toString();
          targetUserId = createdUserId;
        } else {
          // Verify existing user
          const user = await User.findById(params.userId);
          if (!user) return error(`User ${params.userId} not found`);
          if (user.role !== 'TEACHER') {
            return error(`User ${params.userId} does not have the required role "TEACHER" (has "${user.role}")`);
          }
        }

        // Step 2: Create Faculty
        const faculty = await Faculty.create({
          ...params,
          userId: toObjectId(targetUserId, 'userId'),
          collegeId: toObjectId(params.collegeId, 'collegeId'),
          joiningDate: params.joiningDate ? new Date(params.joiningDate) : undefined,
        });
        createdFacultyId = faculty._id.toString();

        return success({
          message: '✅ Faculty created successfully',
          facultyId: faculty._id,
          employeeId: faculty.employeeId,
          userId: targetUserId,
          tempPassword: createdUserId ? 'Welcome@123 (must change on first login)' : undefined,
        });
      } catch (err: any) {
        // Compensating cleanup
        const cleanup: string[] = [];
        if (createdFacultyId) {
          await Faculty.deleteOne({ _id: createdFacultyId }).catch(() => {});
          cleanup.push(`Faculty ${createdFacultyId} rolled back`);
        }
        if (createdUserId) {
          await User.deleteOne({ _id: createdUserId }).catch(() => {});
          cleanup.push(`User ${createdUserId} rolled back`);
        }
        return error(`Faculty creation failed: ${err.message}. Cleanup: ${cleanup.join(', ') || 'none needed'}`);
      }
    }
  );

  // ─── faculty_update ─────────────────────────────────────────────
  server.tool(
    'faculty_update',
    'Update a faculty record. Pass only fields to change. Supports nested updates via dot notation.',
    {
      id: z.string().describe('Faculty _id (ObjectId)'),
      updates: z.record(z.any()).describe('Key-value pairs to update. Use dot notation for nested fields (e.g. "personalInfo.phone": "1234567890")'),
    },
    async (params) => {
      try {
        const faculty = await Faculty.findByIdAndUpdate(
          toObjectId(params.id, 'id'),
          { $set: params.updates },
          { new: true, runValidators: true }
        ).lean();

        if (!faculty) return error('Faculty not found');
        return success({ message: '✅ Faculty updated', faculty });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── faculty_delete ─────────────────────────────────────────────
  server.tool(
    'faculty_delete',
    'Delete a faculty member. Default: soft-delete (sets isDeleted=true). Pass hard=true for permanent deletion.',
    {
      id: z.string().describe('Faculty _id (ObjectId)'),
      hard: z.boolean().optional().describe('If true, permanently delete. Default: soft-delete'),
    },
    async (params) => {
      try {
        const facultyId = toObjectId(params.id, 'id');
        const faculty = await Faculty.findById(facultyId);
        if (!faculty) return error('Faculty not found');

        if (params.hard) {
          await Faculty.deleteOne({ _id: facultyId });
          return success({ message: `⚠️ Faculty ${faculty.employeeId} permanently deleted` });
        } else {
          await Faculty.updateOne({ _id: facultyId }, { $set: { isDeleted: true } });
          // Deactivate corresponding user
          if (faculty.userId) {
            await User.updateOne({ _id: faculty.userId }, { $set: { isActive: false } });
          }
          return success({ message: `✅ Faculty ${faculty.employeeId} soft-deleted and user deactivated` });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
