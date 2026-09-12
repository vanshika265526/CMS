import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Attendance from '../../models/Attendance.js';
import Student from '../../models/Student.js';
import Batch from '../../models/Batch.js';
import Subject from '../../models/Subject.js';
import User from '../../models/User.js';
import { paginate, toObjectId } from '../helpers.js';
import { success, error } from '../types.js';
import { ATTENDANCE_SHORTAGE_THRESHOLD } from '../config.js';

export function registerAttendanceTools(server: McpServer) {

  // ─── attendance_list ───────────────────────────────────────────
  server.tool(
    'attendance_list',
    'List attendance sessions. Fields: teacherId, classId, subjectId, section, date, lecture.',
    {
      classId: z.string().optional().describe('Filter by class (Batch) ObjectId'),
      subjectId: z.string().optional().describe('Filter by Subject ObjectId'),
      teacherId: z.string().optional().describe('Filter by teacher User ObjectId'),
      date: z.string().optional().describe('Filter by date (ISO string YYYY-MM-DD)'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.classId) filter.classId = toObjectId(params.classId, 'classId');
        if (params.subjectId) filter.subjectId = toObjectId(params.subjectId, 'subjectId');
        if (params.teacherId) filter.teacherId = toObjectId(params.teacherId, 'teacherId');
        if (params.date) {
          const queryDate = new Date(params.date);
          const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
          const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));
          filter.date = { $gte: startOfDay, $lte: endOfDay };
        }

        const query = Attendance.find(filter)
          .populate('classId', 'name')
          .populate('subjectId', 'name code')
          .populate('teacherId', 'name email')
          .sort({ date: -1, lecture: 1 });
        const countQuery = Attendance.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── attendance_get ────────────────────────────────────────────
  server.tool(
    'attendance_get',
    'Get a single attendance session by _id. Returns full student records.',
    {
      id: z.string().describe('Attendance _id (ObjectId)'),
    },
    async (params) => {
      try {
        const attendance = await Attendance.findById(toObjectId(params.id, 'id'))
          .populate('classId', 'name')
          .populate('subjectId', 'name code')
          .populate('teacherId', 'name email')
          .populate('records.studentId', 'uniqueStudentId personalInfo.firstName personalInfo.lastName')
          .lean();

        if (!attendance) return error('Attendance session not found');
        return success(attendance);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── attendance_upsert ──────────────────────────────────────────
  server.tool(
    'attendance_upsert',
    'Mark or update attendance for a class. If a session already exists for the same class, subject, date, lecture, and section, it overwrites/rectifies the attendance and logs history rather than creating a duplicate.',
    {
      teacherId: z.string().describe('Teacher User ObjectId (required)'),
      classId: z.string().describe('Class (Batch) ObjectId'),
      subjectId: z.string().describe('Subject ObjectId'),
      date: z.string().describe('Attendance date (ISO string YYYY-MM-DD)'),
      lecture: z.number().min(1).max(8).describe('Lecture period (1 to 8)'),
      section: z.string().optional().describe('Section name (default "General")'),
      records: z.array(
        z.object({
          studentId: z.string().describe('Student ObjectId'),
          status: z.enum(['Present', 'Absent', 'Leave']),
        })
      ).describe('Array of student attendance statuses'),
    },
    async (params) => {
      try {
        const teacherId = toObjectId(params.teacherId, 'teacherId');
        const classId = toObjectId(params.classId, 'classId');
        const subjectId = toObjectId(params.subjectId, 'subjectId');
        const dateVal = new Date(params.date);
        const section = params.section || 'General';

        // Check if teacher exists
        const teacher = await User.findById(teacherId);
        if (!teacher) return error(`Teacher User ${params.teacherId} not found`);

        // Check if class (batch) exists
        const batchDoc = await Batch.findById(classId);
        if (!batchDoc) return error(`Class (Batch) ${params.classId} not found`);

        // Check if subject exists
        const subjectDoc = await Subject.findById(subjectId);
        if (!subjectDoc) return error(`Subject ${params.subjectId} not found`);

        // Normalize date to mid-day or exact match boundary (start/end of day)
        // Let's query matching exact day to prevent same-day duplicates with slightly different timezones
        const startOfDay = new Date(new Date(dateVal).setHours(0, 0, 0, 0));
        const endOfDay = new Date(new Date(dateVal).setHours(23, 59, 59, 999));

        const existing = await Attendance.findOne({
          classId,
          subjectId,
          lecture: params.lecture,
          section,
          date: { $gte: startOfDay, $lte: endOfDay },
        });

        // Convert record studentIds to ObjectIds and validate
        const formattedRecords = [];
        for (const rec of params.records) {
          const sId = toObjectId(rec.studentId, 'studentId');
          // Check student exists and is active
          const studentDoc = await Student.findOne({ _id: sId, isDeleted: false });
          if (!studentDoc) {
            return error(`Active Student ${rec.studentId} not found`);
          }
          formattedRecords.push({
            studentId: sId,
            status: rec.status,
          });
        }

        if (existing) {
          // Perform Rectification / Overwrite
          const previousRecords = existing.records.map((r: any) => ({
            studentId: r.studentId,
            status: r.status,
          }));

          existing.rectificationLogs.push({
            modifiedBy: teacherId,
            modifiedAt: new Date(),
            previousRecords,
          });
          existing.records = formattedRecords;
          existing.teacherId = teacherId;
          existing.isRectified = true;

          await existing.save();

          return success({
            message: '✅ Attendance session rectified successfully',
            attendanceId: existing._id,
            rectified: true,
          });
        } else {
          // Create new record
          const newAttendance = await Attendance.create({
            teacherId,
            classId,
            subjectId,
            section,
            date: dateVal,
            lecture: params.lecture,
            records: formattedRecords,
          });

          return success({
            message: '✅ Attendance session recorded successfully',
            attendanceId: newAttendance._id,
            rectified: false,
          });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── attendance_summary ─────────────────────────────────────────
  server.tool(
    'attendance_summary',
    'Get student attendance summary. Calculates total lectures, total present/absent/leave, attendance percentage, and flags students below the 75% shortage threshold. Filters out soft-deleted students.',
    {
      classId: z.string().describe('Class (Batch) ObjectId'),
      subjectId: z.string().optional().describe('Optional Subject ObjectId (if omitted, computes overall across all subjects)'),
      studentId: z.string().optional().describe('Optional Student ObjectId (if provided, returns detailed subject-wise breakdown for this student)'),
    },
    async (params) => {
      try {
        const classId = toObjectId(params.classId, 'classId');
        const subjectId = params.subjectId ? toObjectId(params.subjectId, 'subjectId') : null;
        const studentId = params.studentId ? toObjectId(params.studentId, 'studentId') : null;

        // Fetch all active student IDs in this class to exclude soft-deleted/dropped ones
        const activeStudents = await Student.find({
          batchId: classId,
          isDeleted: false,
          'academicInfo.status': 'active',
        }).select('_id uniqueStudentId personalInfo.firstName personalInfo.lastName');

        if (activeStudents.length === 0) {
          return success({ data: [], message: 'No active students found in this class' });
        }

        const activeStudentIds = activeStudents.map(s => s._id);

        if (studentId) {
          // Validate the target student is in this batch
          const targetStudent = activeStudents.find(s => s._id.toString() === studentId.toString());
          if (!targetStudent) {
            return error(`Active student ${studentId} not found in class ${classId}`);
          }

          // Compute subject-wise attendance for a single student
          const matchStage: any = {
            classId,
            'records.studentId': studentId,
          };
          if (subjectId) matchStage.subjectId = subjectId;

          const pipeline = [
            { $match: matchStage },
            { $unwind: '$records' },
            { $match: { 'records.studentId': studentId } },
            {
              $group: {
                _id: '$subjectId',
                totalLectures: { $sum: 1 },
                present: { $sum: { $cond: [{ $eq: ['$records.status', 'Present'] }, 1, 0] } },
                absent: { $sum: { $cond: [{ $eq: ['$records.status', 'Absent'] }, 1, 0] } },
                leave: { $sum: { $cond: [{ $eq: ['$records.status', 'Leave'] }, 1, 0] } },
              },
            },
            {
              $lookup: {
                from: 'subjects',
                localField: '_id',
                foreignField: '_id',
                as: 'subjectInfo',
              },
            },
            { $unwind: '$subjectInfo' },
            {
              $project: {
                subjectId: '$_id',
                subjectName: '$subjectInfo.name',
                subjectCode: '$subjectInfo.code',
                totalLectures: 1,
                present: 1,
                absent: 1,
                leave: 1,
                percentage: {
                  $multiply: [
                    { $divide: ['$present', { $cond: [{ $eq: ['$totalLectures', 0] }, 1, '$totalLectures'] }] },
                    100,
                  ],
                },
              },
            },
          ];

          const results = await Attendance.aggregate(pipeline);

          const processed = results.map(r => ({
            ...r,
            percentage: parseFloat(r.percentage.toFixed(2)),
            isShortage: r.percentage < ATTENDANCE_SHORTAGE_THRESHOLD,
          }));

          return success({
            student: {
              id: targetStudent._id,
              uniqueStudentId: targetStudent.uniqueStudentId,
              name: `${targetStudent.personalInfo.firstName} ${targetStudent.personalInfo.lastName}`,
            },
            summary: processed,
          });
        } else {
          // Batch summary: Calculate attendance for all active students in the batch
          const matchStage: any = {
            classId,
            'records.studentId': { $in: activeStudentIds },
          };
          if (subjectId) matchStage.subjectId = subjectId;

          const pipeline = [
            { $match: matchStage },
            { $unwind: '$records' },
            { $match: { 'records.studentId': { $in: activeStudentIds } } },
            {
              $group: {
                _id: '$records.studentId',
                totalLectures: { $sum: 1 },
                present: { $sum: { $cond: [{ $eq: ['$records.status', 'Present'] }, 1, 0] } },
                absent: { $sum: { $cond: [{ $eq: ['$records.status', 'Absent'] }, 1, 0] } },
                leave: { $sum: { $cond: [{ $eq: ['$records.status', 'Leave'] }, 1, 0] } },
              },
            },
          ];

          const aggregations = await Attendance.aggregate(pipeline);

          // Map back to student info
          const studentMap = new Map(activeStudents.map(s => [s._id.toString(), s]));
          const summary = aggregations.map(agg => {
            const student = studentMap.get(agg._id.toString());
            const pct = agg.totalLectures > 0 ? (agg.present / agg.totalLectures) * 100 : 100;
            return {
              studentId: agg._id,
              uniqueStudentId: student?.uniqueStudentId || 'N/A',
              name: student ? `${student.personalInfo.firstName} ${student.personalInfo.lastName}` : 'Unknown',
              totalLectures: agg.totalLectures,
              present: agg.present,
              absent: agg.absent,
              leave: agg.leave,
              percentage: parseFloat(pct.toFixed(2)),
              isShortage: pct < ATTENDANCE_SHORTAGE_THRESHOLD,
            };
          });

          // Add any active students who have 0 lectures marked yet
          const coveredIds = new Set(aggregations.map(agg => agg._id.toString()));
          for (const student of activeStudents) {
            if (!coveredIds.has(student._id.toString())) {
              summary.push({
                studentId: student._id,
                uniqueStudentId: student.uniqueStudentId,
                name: `${student.personalInfo.firstName} ${student.personalInfo.lastName}`,
                totalLectures: 0,
                present: 0,
                absent: 0,
                leave: 0,
                percentage: 100.0, // defaults to 100 if no classes taken
                isShortage: false,
              });
            }
          }

          return success({
            classId,
            subjectId: subjectId || undefined,
            totalStudents: activeStudents.length,
            summary: summary.sort((a, b) => a.name.localeCompare(b.name)),
          });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── attendance_faculty_summary ──────────────────────────────────
  server.tool(
    'attendance_faculty_summary',
    'Get teacher-wise summary of classes taken. Counts total lectures recorded by the faculty member.',
    {
      teacherId: z.string().describe('Teacher User ObjectId'),
      collegeId: z.string().optional().describe('College ObjectId'),
    },
    async (params) => {
      try {
        const teacherId = toObjectId(params.teacherId, 'teacherId');
        const filter: any = { teacherId };
        if (params.collegeId) {
          // Attendance doesn't have direct collegeId in its schema, but we can verify teacher's collegeId or query if it exists
          const teacher = await User.findById(teacherId);
          if (!teacher) return error('Teacher not found');
          if (params.collegeId && teacher.collegeId?.toString() !== params.collegeId) {
            return error('Teacher does not belong to this college');
          }
        }

        const pipeline = [
          { $match: filter },
          {
            $group: {
              _id: {
                classId: '$classId',
                subjectId: '$subjectId',
              },
              totalClassesTaken: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'batches',
              localField: '_id.classId',
              foreignField: '_id',
              as: 'batchInfo',
            },
          },
          {
            $lookup: {
              from: 'subjects',
              localField: '_id.subjectId',
              foreignField: '_id',
              as: 'subjectInfo',
            },
          },
          { $unwind: '$batchInfo' },
          { $unwind: '$subjectInfo' },
          {
            $project: {
              classId: '$_id.classId',
              className: '$batchInfo.name',
              subjectId: '$_id.subjectId',
              subjectName: '$subjectInfo.name',
              subjectCode: '$subjectInfo.code',
              totalClassesTaken: 1,
            },
          },
        ];

        const results = await Attendance.aggregate(pipeline);
        const overallTotal = results.reduce((acc, r) => acc + r.totalClassesTaken, 0);

        return success({
          teacherId,
          totalLecturesRecorded: overallTotal,
          breakdown: results,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
