import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Course from '../../models/Course.js';
import Subject from '../../models/Subject.js';
import Timetable from '../../models/Timetable.js';
import AuditLog from '../../models/AuditLog.js';
import Batch from '../../models/Batch.js';
import Section from '../../models/Section.js';
import User from '../../models/User.js';
import { paginate, toObjectId } from '../helpers.js';
import { success, error } from '../types.js';
import { DAYS, TIME_SLOT_STARTS, getSlotByStartTime } from '../../constants/timeSlots.js';

export function registerCourseTools(server: McpServer) {

  // ─── course_list ───────────────────────────────────────────────
  server.tool(
    'course_list',
    'List and filter courses. Fields: name, code, duration, totalSeats, description.',
    {
      department: z.string().optional().describe('Filter by department ObjectId'),
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      search: z.string().optional().describe('Search by course name or code'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Items per page (default 20, max 100)'),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.department) filter.department = toObjectId(params.department, 'department');
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        if (params.search) {
          const regex = new RegExp(params.search, 'i');
          filter.$or = [{ name: regex }, { code: regex }];
        }

        const query = Course.find(filter)
          .populate('department', 'name')
          .sort({ createdAt: -1 });
        const countQuery = Course.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── course_get ────────────────────────────────────────────────
  server.tool(
    'course_get',
    'Get a single course by _id or code. Returns full profile with populated subjects.',
    {
      id: z.string().optional().describe('Course _id (ObjectId)'),
      code: z.string().optional().describe('Course code string'),
    },
    async (params) => {
      try {
        if (!params.id && !params.code) {
          return error('Provide either id or code');
        }
        const filter = params.id
          ? { _id: toObjectId(params.id, 'id') }
          : { code: params.code };

        const course = await Course.findOne(filter)
          .populate('department', 'name')
          .populate('subjects', 'name code creditHours')
          .lean();

        if (!course) return error('Course not found');
        return success(course);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── course_create ─────────────────────────────────────────────
  server.tool(
    'course_create',
    'Create a new course. Requires name, code, duration (years), department, collegeId, and totalSeats.',
    {
      name: z.string().describe('Course name'),
      code: z.string().describe('Unique course code'),
      duration: z.number().describe('Course duration in years'),
      department: z.string().describe('Department ObjectId'),
      collegeId: z.string().describe('College ObjectId'),
      totalSeats: z.number().describe('Total seats allocated'),
      description: z.string().optional().describe('Course description'),
      subjects: z.array(z.string()).optional().describe('Array of Subject ObjectIds'),
    },
    async (params) => {
      try {
        const existing = await Course.findOne({ code: params.code, isDeleted: false });
        if (existing) return error(`Course with code "${params.code}" already exists`);

        const course = await Course.create({
          ...params,
          department: toObjectId(params.department, 'department'),
          collegeId: toObjectId(params.collegeId, 'collegeId'),
          subjects: params.subjects?.map(s => toObjectId(s, 'subject')) || [],
        });

        return success({ message: '✅ Course created', courseId: course._id, code: course.code });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── course_update ─────────────────────────────────────────────
  server.tool(
    'course_update',
    'Update a course record. Pass only fields to change. Supports nested/dot notation updates.',
    {
      id: z.string().describe('Course _id (ObjectId)'),
      updates: z.record(z.any()).describe('Key-value updates. (e.g., "description": "New desc", "subjects": ["id1", "id2"])'),
    },
    async (params) => {
      try {
        const updates = { ...params.updates };
        if (updates.department) updates.department = toObjectId(updates.department, 'department');
        if (updates.collegeId) updates.collegeId = toObjectId(updates.collegeId, 'collegeId');
        if (updates.subjects) {
          updates.subjects = updates.subjects.map((s: string) => toObjectId(s, 'subject'));
        }

        const course = await Course.findByIdAndUpdate(
          toObjectId(params.id, 'id'),
          { $set: updates },
          { new: true, runValidators: true }
        ).lean();

        if (!course) return error('Course not found');
        return success({ message: '✅ Course updated', course });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── course_delete ─────────────────────────────────────────────
  server.tool(
    'course_delete',
    'Delete a course. Default: soft-delete (sets isDeleted=true). Pass hard=true for permanent deletion.',
    {
      id: z.string().describe('Course _id (ObjectId)'),
      hard: z.boolean().optional().describe('If true, permanently delete. Default: soft-delete'),
    },
    async (params) => {
      try {
        const courseId = toObjectId(params.id, 'id');
        const course = await Course.findById(courseId);
        if (!course) return error('Course not found');

        if (params.hard) {
          await Course.deleteOne({ _id: courseId });
          return success({ message: `⚠️ Course ${course.code} permanently deleted` });
        } else {
          await Course.updateOne({ _id: courseId }, { $set: { isDeleted: true } });
          return success({ message: `✅ Course ${course.code} soft-deleted` });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── subject_list ──────────────────────────────────────────────
  server.tool(
    'subject_list',
    'List and filter subjects. Fields: name, code, creditHours, courseId.',
    {
      courseId: z.string().optional().describe('Filter by Course ObjectId'),
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      search: z.string().optional().describe('Search by subject name or code'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Items per page (default 20, max 100)'),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.courseId) filter.courseId = toObjectId(params.courseId, 'courseId');
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        if (params.search) {
          const regex = new RegExp(params.search, 'i');
          filter.$or = [{ name: regex }, { code: regex }];
        }

        const query = Subject.find(filter)
          .populate('courseId', 'name code')
          .sort({ createdAt: -1 });
        const countQuery = Subject.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── subject_get ───────────────────────────────────────────────
  server.tool(
    'subject_get',
    'Get a single subject by _id or code.',
    {
      id: z.string().optional().describe('Subject _id (ObjectId)'),
      code: z.string().optional().describe('Subject code string'),
    },
    async (params) => {
      try {
        if (!params.id && !params.code) {
          return error('Provide either id or code');
        }
        const filter = params.id
          ? { _id: toObjectId(params.id, 'id') }
          : { code: params.code };

        const subject = await Subject.findOne(filter)
          .populate('courseId', 'name code')
          .lean();

        if (!subject) return error('Subject not found');
        return success(subject);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── subject_create ────────────────────────────────────────────
  server.tool(
    'subject_create',
    'Create a new subject record. Requires name, code, creditHours, courseId, and collegeId.',
    {
      name: z.string().describe('Subject name'),
      code: z.string().describe('Unique subject code'),
      creditHours: z.number().describe('Subject credit hours'),
      courseId: z.string().describe('Associated Course ObjectId'),
      collegeId: z.string().describe('College ObjectId'),
    },
    async (params) => {
      try {
        const existing = await Subject.findOne({ code: params.code, isDeleted: false });
        if (existing) return error(`Subject with code "${params.code}" already exists`);

        const subject = await Subject.create({
          ...params,
          courseId: toObjectId(params.courseId, 'courseId'),
          collegeId: toObjectId(params.collegeId, 'collegeId'),
        });

        // Auto-append subject to course's subjects list
        await Course.findByIdAndUpdate(subject.courseId, {
          $addToSet: { subjects: subject._id },
        });

        return success({ message: '✅ Subject created', subjectId: subject._id, code: subject.code });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── subject_update ────────────────────────────────────────────
  server.tool(
    'subject_update',
    'Update a subject record. Pass only fields to change.',
    {
      id: z.string().describe('Subject _id (ObjectId)'),
      updates: z.record(z.any()).describe('Key-value updates (e.g., "name": "New name", "creditHours": 4)'),
    },
    async (params) => {
      try {
        const updates = { ...params.updates };
        if (updates.courseId) updates.courseId = toObjectId(updates.courseId, 'courseId');
        if (updates.collegeId) updates.collegeId = toObjectId(updates.collegeId, 'collegeId');

        const subject = await Subject.findByIdAndUpdate(
          toObjectId(params.id, 'id'),
          { $set: updates },
          { new: true, runValidators: true }
        ).lean();

        if (!subject) return error('Subject not found');
        return success({ message: '✅ Subject updated', subject });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── subject_delete ────────────────────────────────────────────
  server.tool(
    'subject_delete',
    'Delete a subject. Default: soft-delete (sets isDeleted=true). Pass hard=true for permanent deletion.',
    {
      id: z.string().describe('Subject _id (ObjectId)'),
      hard: z.boolean().optional().describe('If true, permanently delete. Default: soft-delete'),
    },
    async (params) => {
      try {
        const subjectId = toObjectId(params.id, 'id');
        const subject = await Subject.findById(subjectId);
        if (!subject) return error('Subject not found');

        if (params.hard) {
          await Subject.deleteOne({ _id: subjectId });
          // Remove from Course references as well
          await Course.updateOne({ _id: subject.courseId }, { $pull: { subjects: subjectId } });
          return success({ message: `⚠️ Subject ${subject.code} permanently deleted` });
        } else {
          await Subject.updateOne({ _id: subjectId }, { $set: { isDeleted: true } });
          return success({ message: `✅ Subject ${subject.code} soft-deleted` });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── timetable_list ────────────────────────────────────────────
  server.tool(
    'timetable_list',
    'List timetable slots. Can filter by batch, section, teacher, day, startTime, roomNo, or academicYear.',
    {
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      batchId: z.string().optional().describe('Filter by Batch ObjectId'),
      sectionId: z.string().optional().describe('Filter by Section ObjectId'),
      teacherId: z.string().optional().describe('Filter by teacher User ObjectId'),
      day: z.enum(DAYS).optional().describe('Filter by day of week'),
      startTime: z.enum(TIME_SLOT_STARTS as [string, ...string[]]).optional().describe('Filter by start time slot'),
      roomNo: z.string().optional().describe('Filter by room number'),
      academicYear: z.string().optional().describe('Filter by academic year'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        if (params.batchId) filter.batchId = toObjectId(params.batchId, 'batchId');
        if (params.sectionId) filter.sectionId = toObjectId(params.sectionId, 'sectionId');
        if (params.teacherId) filter.teacherId = toObjectId(params.teacherId, 'teacherId');
        if (params.day) filter.day = params.day;
        if (params.startTime) filter.startTime = params.startTime;
        if (params.roomNo) filter.roomNo = params.roomNo;
        if (params.academicYear) filter.academicYear = params.academicYear;

        const query = Timetable.find(filter)
          .populate('batchId', 'name')
          .populate('sectionId', 'name')
          .populate('teacherId', 'name email')
          .populate('subjectId', 'name code')
          .sort({ day: 1, startTime: 1 });
        const countQuery = Timetable.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── timetable_create ──────────────────────────────────────────
  server.tool(
    'timetable_create',
    'Create a timetable entry with conflict detection (checks teacher, room, and section/batch clashes). Automatically calculates period and end time based on the slot.',
    {
      collegeId: z.string().describe('College ObjectId'),
      teacherId: z.string().describe('Teacher User ObjectId'),
      batchId: z.string().describe('Batch ObjectId'),
      sectionId: z.string().describe('Section ObjectId'),
      subject: z.string().describe('Subject name string'),
      subjectId: z.string().optional().describe('Subject ObjectId'),
      day: z.enum(DAYS).describe('Day of the week'),
      startTime: z.enum(TIME_SLOT_STARTS as [string, ...string[]]).describe('Start time slot (e.g., "09:00")'),
      roomNo: z.string().optional().describe('Room number (e.g. "Room 302")'),
      createdBy: z.string().describe('User ObjectId creating the record'),
      academicYear: z.string().optional().describe('Academic year (e.g. "2026-2027")'),
    },
    async (params) => {
      try {
        const collegeId = toObjectId(params.collegeId, 'collegeId');
        const teacherId = toObjectId(params.teacherId, 'teacherId');
        const batchId = toObjectId(params.batchId, 'batchId');
        const sectionId = toObjectId(params.sectionId, 'sectionId');
        const createdBy = toObjectId(params.createdBy, 'createdBy');
        const subjectId = params.subjectId ? toObjectId(params.subjectId, 'subjectId') : undefined;

        // Get time slot definition
        const slot = getSlotByStartTime(params.startTime);
        if (!slot) {
          return error(`Invalid startTime "${params.startTime}". Available: ${TIME_SLOT_STARTS.join(', ')}`);
        }
        const endTime = slot.end;
        const period = slot.period;

        // 1. Conflict Check: Teacher Clash
        const teacherClash = await Timetable.findOne({
          collegeId,
          teacherId,
          day: params.day,
          startTime: params.startTime,
          isDeleted: false,
        }).populate('batchId sectionId', 'name');
        if (teacherClash) {
          const clashBatch = (teacherClash.batchId as any)?.name || 'Unknown';
          const clashSection = (teacherClash.sectionId as any)?.name || 'Unknown';
          return error(`Clash: Teacher is already scheduled for Batch "${clashBatch}", Section "${clashSection}" at this time.`);
        }

        // 2. Conflict Check: Section/Batch Slot Clash
        const sectionClash = await Timetable.findOne({
          collegeId,
          batchId,
          sectionId,
          day: params.day,
          startTime: params.startTime,
          isDeleted: false,
        }).populate('teacherId', 'name');
        if (sectionClash) {
          const clashTeacher = (sectionClash.teacherId as any)?.name || 'Unknown';
          return error(`Clash: This batch & section are already scheduled with Teacher "${clashTeacher}" at this time.`);
        }

        // 3. Conflict Check: Room Slot Clash (if roomNo is specified and not empty)
        if (params.roomNo && params.roomNo.trim() !== '') {
          const roomClash = await Timetable.findOne({
            collegeId,
            roomNo: params.roomNo.trim(),
            day: params.day,
            startTime: params.startTime,
            isDeleted: false,
          }).populate('batchId sectionId', 'name');
          if (roomClash) {
            const clashBatch = (roomClash.batchId as any)?.name || 'Unknown';
            const clashSection = (roomClash.sectionId as any)?.name || 'Unknown';
            return error(`Clash: Room "${params.roomNo}" is already occupied by Batch "${clashBatch}", Section "${clashSection}" at this time.`);
          }
        }

        // Resolve additional compatibility fields
        const batchDoc = await Batch.findById(batchId);
        const sectionDoc = await Section.findById(sectionId);
        const userDoc = await User.findById(teacherId);

        const timetable = await Timetable.create({
          collegeId,
          teacherId,
          batchId,
          sectionId,
          subject: params.subject,
          subjectId,
          day: params.day,
          startTime: params.startTime,
          endTime,
          roomNo: params.roomNo || '',
          createdBy,
          academicYear: params.academicYear,
          isActive: true,
          // Compatibility aliases
          classId: batchId,
          section: sectionDoc?.name || '',
          room: params.roomNo || '',
          dayOfWeek: params.day,
          period,
        });

        return success({
          message: '✅ Timetable slot scheduled successfully',
          timetableId: timetable._id,
          period,
          endTime,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── timetable_delete ──────────────────────────────────────────
  server.tool(
    'timetable_delete',
    'Permanently delete a timetable slot. Writes an entry to the AuditLog collection before deletion.',
    {
      id: z.string().describe('Timetable entry _id (ObjectId)'),
      deletedBy: z.string().describe('User ObjectId performing the deletion'),
      ipAddress: z.string().optional().describe('Optional IP address of deleting user'),
      userAgent: z.string().optional().describe('Optional User Agent of deleting user'),
    },
    async (params) => {
      try {
        const id = toObjectId(params.id, 'id');
        const deletedBy = toObjectId(params.deletedBy, 'deletedBy');

        const timetable = await Timetable.findById(id);
        if (!timetable) return error('Timetable entry not found');

        // Create audit log first
        await AuditLog.create({
          userId: deletedBy,
          action: 'DELETE',
          resource_type: 'Timetable',
          resource_id: timetable._id.toString(),
          change_details: timetable.toObject(),
          ip_address: params.ipAddress || 'unknown',
          user_agent: params.userAgent || 'mcp-server',
          status: 'success',
          timestamp: new Date(),
        });

        // Perform hard delete as specified
        await Timetable.deleteOne({ _id: id });

        return success({
          message: `✅ Timetable slot permanently deleted and logged to AuditLog`,
          timetableId: timetable._id,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
