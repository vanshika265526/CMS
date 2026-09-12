import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import Student from '../../models/Student.js';
import Admission from '../../models/Admission.js';
import User from '../../models/User.js';
import Department from '../../models/Department.js';
import { paginate, toObjectId, generateStudentId } from '../helpers.js';
import { success, error } from '../types.js';

export function registerStudentTools(server: McpServer) {

  // ─── student_list ───────────────────────────────────────────────
  server.tool(
    'student_list',
    'List/filter students. Fields: uniqueStudentId, enrollmentId, personalInfo{firstName,lastName,email,phone}, academicInfo{course,batch,department,status,semester,rollNumber,section}, batchId, category.',
    {
      batchId: z.string().optional().describe('Filter by batch ObjectId'),
      department: z.string().optional().describe('Filter by department ObjectId'),
      semester: z.number().optional().describe('Filter by semester number'),
      status: z.enum(['active', 'graduated', 'dropped']).optional().describe('Filter by academic status'),
      search: z.string().optional().describe('Search by name, email, or roll number'),
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Items per page (default 20, max 100)'),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.batchId) filter.batchId = toObjectId(params.batchId, 'batchId');
        if (params.department) filter['academicInfo.department'] = toObjectId(params.department, 'department');
        if (params.semester) filter['academicInfo.semester'] = params.semester;
        if (params.status) filter['academicInfo.status'] = params.status;
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        if (params.search) {
          const regex = new RegExp(params.search, 'i');
          filter.$or = [
            { 'personalInfo.firstName': regex },
            { 'personalInfo.lastName': regex },
            { 'personalInfo.email': regex },
            { 'academicInfo.rollNumber': regex },
            { uniqueStudentId: regex },
            { enrollmentId: regex },
          ];
        }

        const query = Student.find(filter)
          .select('uniqueStudentId enrollmentId personalInfo.firstName personalInfo.lastName personalInfo.email academicInfo.course academicInfo.batch academicInfo.status academicInfo.semester academicInfo.rollNumber academicInfo.section')
          .populate('academicInfo.department', 'name')
          .sort({ createdAt: -1 });
        const countQuery = Student.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── student_get ────────────────────────────────────────────────
  server.tool(
    'student_get',
    'Get a single student by _id or uniqueStudentId. Returns full profile with populated batch and department.',
    {
      id: z.string().optional().describe('Student _id (ObjectId)'),
      uniqueStudentId: z.string().optional().describe('Unique student ID string'),
    },
    async (params) => {
      try {
        if (!params.id && !params.uniqueStudentId) {
          return error('Provide either id or uniqueStudentId');
        }
        const filter = params.id
          ? { _id: toObjectId(params.id, 'id') }
          : { uniqueStudentId: params.uniqueStudentId };

        const student = await Student.findOne(filter)
          .populate('academicInfo.department', 'name')
          .populate('batchId', 'name startYear endYear')
          .lean();

        if (!student) return error('Student not found');
        return success(student);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── student_create ─────────────────────────────────────────────
  server.tool(
    'student_create',
    'Create a new student record. Required: uniqueStudentId, userId, personalInfo{firstName,lastName,dob,gender,phone,email,address}, academicInfo{course,batch,department}, parentInfo{name,phone,email,relation}.',
    {
      uniqueStudentId: z.string().describe('Unique student identifier'),
      userId: z.string().describe('User ObjectId (must exist with role STUDENT)'),
      collegeId: z.string().optional().describe('College ObjectId'),
      batchId: z.string().optional().describe('Batch ObjectId'),
      category: z.enum(['GEN', 'SC', 'ST', 'OBC']).optional(),
      personalInfo: z.object({
        firstName: z.string(),
        lastName: z.string(),
        dob: z.string().describe('Date of birth (ISO string)'),
        gender: z.enum(['male', 'female', 'other']),
        phone: z.string(),
        email: z.string(),
        address: z.string(),
        photo: z.string().optional(),
      }),
      academicInfo: z.object({
        course: z.string(),
        batch: z.string(),
        department: z.string().describe('Department ObjectId'),
        status: z.enum(['active', 'graduated', 'dropped']).optional(),
        semester: z.number().optional(),
        rollNumber: z.string().optional(),
        section: z.string().optional(),
      }),
      parentInfo: z.object({
        name: z.string(),
        phone: z.string(),
        email: z.string(),
        relation: z.string(),
      }),
    },
    async (params) => {
      try {
        // Validate uniqueness
        const existing = await Student.findOne({
          $or: [
            { uniqueStudentId: params.uniqueStudentId },
            { 'personalInfo.email': params.personalInfo.email },
          ],
          isDeleted: false,
        });
        if (existing) {
          return error(`Duplicate: student with ID "${params.uniqueStudentId}" or email "${params.personalInfo.email}" already exists`);
        }

        // Validate user exists
        const user = await User.findById(params.userId);
        if (!user) return error(`User ${params.userId} not found`);

        // Validate department exists
        const dept = await Department.findById(params.academicInfo.department);
        if (!dept) return error(`Department ${params.academicInfo.department} not found`);

        const student = await Student.create({
          ...params,
          userId: toObjectId(params.userId, 'userId'),
          collegeId: params.collegeId ? toObjectId(params.collegeId, 'collegeId') : undefined,
          batchId: params.batchId ? toObjectId(params.batchId, 'batchId') : undefined,
          personalInfo: {
            ...params.personalInfo,
            dob: new Date(params.personalInfo.dob),
          },
          academicInfo: {
            ...params.academicInfo,
            department: toObjectId(params.academicInfo.department, 'department'),
          },
        });

        return success({ message: '✅ Student created', studentId: student._id, uniqueStudentId: student.uniqueStudentId });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── student_update ─────────────────────────────────────────────
  server.tool(
    'student_update',
    'Update a student record. Pass only fields to change. Supports nested updates like personalInfo.phone or academicInfo.semester.',
    {
      id: z.string().describe('Student _id (ObjectId)'),
      updates: z.record(z.any()).describe('Key-value pairs to update. Use dot notation for nested fields (e.g. "personalInfo.phone": "1234567890")'),
    },
    async (params) => {
      try {
        const student = await Student.findByIdAndUpdate(
          toObjectId(params.id, 'id'),
          { $set: params.updates },
          { new: true, runValidators: true }
        ).lean();

        if (!student) return error('Student not found');
        return success({ message: '✅ Student updated', student });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── student_delete ─────────────────────────────────────────────
  server.tool(
    'student_delete',
    'Delete a student. Default: soft-delete (sets isDeleted=true). Pass hard=true for permanent deletion.',
    {
      id: z.string().describe('Student _id (ObjectId)'),
      hard: z.boolean().optional().describe('If true, permanently delete. Default: soft-delete'),
    },
    async (params) => {
      try {
        const studentId = toObjectId(params.id, 'id');
        const student = await Student.findById(studentId);
        if (!student) return error('Student not found');

        if (params.hard) {
          await Student.deleteOne({ _id: studentId });
          return success({ message: `⚠️ Student ${student.uniqueStudentId} permanently deleted` });
        } else {
          await Student.updateOne({ _id: studentId }, { $set: { isDeleted: true } });
          // Also deactivate linked user
          if (student.userId) {
            await User.updateOne({ _id: student.userId }, { $set: { isActive: false } });
          }
          return success({ message: `✅ Student ${student.uniqueStudentId} soft-deleted and user deactivated` });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── admission_list ─────────────────────────────────────────────
  server.tool(
    'admission_list',
    'List admissions. Fields: fullName, email, phone, courseId, collegeId, status(enquiry|applied|approved|rejected|enrolled), appliedDate.',
    {
      status: z.enum(['enquiry', 'applied', 'approved', 'rejected', 'enrolled']).optional(),
      collegeId: z.string().optional().describe('College ObjectId'),
      courseId: z.string().optional().describe('Course ObjectId'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.status) filter.status = params.status;
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        if (params.courseId) filter.courseId = toObjectId(params.courseId, 'courseId');

        const query = Admission.find(filter)
          .populate('courseId', 'name code')
          .sort({ appliedDate: -1 });
        const countQuery = Admission.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── admission_update_status ────────────────────────────────────
  server.tool(
    'admission_update_status',
    'Update admission status. Valid transitions: enquiry→applied→approved→enrolled, or →rejected at any stage. Setting status to "enrolled" auto-creates a User (role=STUDENT) and Student record. Uses compensating cleanup on failure (no transactions on Atlas M0).',
    {
      id: z.string().describe('Admission _id'),
      newStatus: z.enum(['enquiry', 'applied', 'approved', 'rejected', 'enrolled']).describe('Target status'),
      remarks: z.string().optional().describe('Optional remarks for the status change'),
    },
    async (params) => {
      try {
        const admission = await Admission.findById(toObjectId(params.id, 'id'))
          .populate('courseId', 'name code department');
        if (!admission) return error('Admission not found');

        // Validate transition
        const validTransitions: Record<string, string[]> = {
          enquiry: ['applied', 'rejected'],
          applied: ['approved', 'rejected'],
          approved: ['enrolled', 'rejected'],
          rejected: [],
          enrolled: [],
        };
        const allowed = validTransitions[admission.status] || [];
        if (!allowed.includes(params.newStatus)) {
          return error(`Invalid transition: ${admission.status} → ${params.newStatus}. Allowed: ${allowed.join(', ') || 'none'}`);
        }

        // If enrolling, auto-create User + Student with compensating cleanup
        if (params.newStatus === 'enrolled') {
          let createdUserId: string | null = null;
          let createdStudentId: string | null = null;

          try {
            // Step 1: Create User
            const salt = await bcrypt.genSalt(10);
            const tempPassword = await bcrypt.hash('Welcome@123', salt);
            const courseDoc = admission.courseId as any;

            const user = await User.create({
              name: admission.fullName,
              email: admission.email,
              password: tempPassword,
              role: 'STUDENT',
              collegeId: admission.collegeId,
              phone: admission.phone,
              mustChangePassword: true,
              isFirstLogin: true,
            });
            createdUserId = user._id.toString();

            // Step 2: Create Student
            const deptId = courseDoc?.department?.toString() || '';
            const admissionYear = new Date().getFullYear();
            const uniqueId = await generateStudentId(deptId, admissionYear);

            const nameParts = admission.fullName.trim().split(/\s+/);
            const firstName = nameParts[0] || admission.fullName;
            const lastName = nameParts.slice(1).join(' ') || '';

            const student = await Student.create({
              uniqueStudentId: uniqueId,
              userId: user._id,
              collegeId: admission.collegeId,
              personalInfo: {
                firstName,
                lastName,
                dob: new Date('2000-01-01'), // Placeholder — should be updated
                gender: 'other',
                phone: admission.phone,
                email: admission.email,
                address: 'To be updated',
              },
              academicInfo: {
                course: courseDoc?.name || 'Unknown',
                batch: `${admissionYear}`,
                department: deptId ? toObjectId(deptId, 'department') : undefined,
                status: 'active',
                semester: 1,
                enrollmentDate: new Date(),
              },
              parentInfo: {
                name: 'To be updated',
                phone: 'To be updated',
                email: 'To be updated',
                relation: 'To be updated',
              },
            });
            createdStudentId = student._id.toString();

            // Step 3: Update Admission
            await Admission.updateOne(
              { _id: admission._id },
              {
                $set: {
                  status: 'enrolled',
                  studentId: student._id,
                  enrolledDate: new Date(),
                  remarks: params.remarks || admission.remarks,
                },
              }
            );

            return success({
              message: '✅ Admission enrolled. User and Student records created.',
              admissionId: admission._id,
              newUserId: user._id,
              newStudentId: student._id,
              uniqueStudentId: uniqueId,
              tempPassword: 'Welcome@123 (must change on first login)',
            });
          } catch (enrollErr: any) {
            // Compensating cleanup
            const cleanup: string[] = [];
            if (createdStudentId) {
              await Student.deleteOne({ _id: createdStudentId }).catch(() => {});
              cleanup.push(`Student ${createdStudentId} rolled back`);
            }
            if (createdUserId) {
              await User.deleteOne({ _id: createdUserId }).catch(() => {});
              cleanup.push(`User ${createdUserId} rolled back`);
            }
            return error(`Enrollment failed: ${enrollErr.message}. Cleanup: ${cleanup.join(', ') || 'none needed'}`);
          }
        }

        // Non-enrollment status update
        await Admission.updateOne(
          { _id: admission._id },
          { $set: { status: params.newStatus, remarks: params.remarks || admission.remarks } }
        );

        return success({
          message: `✅ Admission status updated: ${admission.status} → ${params.newStatus}`,
          admissionId: admission._id,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
