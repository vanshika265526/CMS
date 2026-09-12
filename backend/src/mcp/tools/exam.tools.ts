import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Exam from '../../models/Exam.js';
import Marks from '../../models/Marks.js';
import Result from '../../models/Result.js';
import Student from '../../models/Student.js';
import Subject from '../../models/Subject.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import { paginate, toObjectId } from '../helpers.js';
import { success, error } from '../types.js';

export function registerExamTools(server: McpServer) {

  // ─── exam_list ─────────────────────────────────────────────────
  server.tool(
    'exam_list',
    'List/filter exam schedules. Fields: code, name, examType, scheduleDate, totalMarks, passingMarks, status.',
    {
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      status: z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']).optional().describe('Filter by status'),
      examType: z.enum(['INTERNAL', 'EXTERNAL', 'PRACTICAL']).optional().describe('Filter by exam type'),
      search: z.string().optional().describe('Search by exam name or code'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');
        if (params.status) filter.status = params.status;
        if (params.examType) filter.examType = params.examType;
        if (params.search) {
          const regex = new RegExp(params.search, 'i');
          filter.$or = [{ name: regex }, { code: regex }];
        }

        const query = Exam.find(filter)
          .populate('courses', 'name code')
          .populate('subjects', 'name code')
          .sort({ scheduleDate: -1 });
        const countQuery = Exam.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── exam_get ──────────────────────────────────────────────────
  server.tool(
    'exam_get',
    'Get a single exam by _id or code. Returns full schedule and grading scheme.',
    {
      id: z.string().optional().describe('Exam _id (ObjectId)'),
      code: z.string().optional().describe('Exam code string'),
    },
    async (params) => {
      try {
        if (!params.id && !params.code) {
          return error('Provide either id or code');
        }
        const filter = params.id
          ? { _id: toObjectId(params.id, 'id') }
          : { code: params.code };

        const exam = await Exam.findOne(filter)
          .populate('courses', 'name code')
          .populate('subjects', 'name code')
          .lean();

        if (!exam) return error('Exam not found');
        return success(exam);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── exam_create ───────────────────────────────────────────────
  server.tool(
    'exam_create',
    'Create a new exam schedule. Requires collegeId, code, name, examType, scheduleDate, duration (minutes), courses, subjects, totalMarks, passingMarks, gradingScheme, and createdBy.',
    {
      collegeId: z.string().describe('College ObjectId'),
      code: z.string().describe('Unique exam code'),
      name: z.string().describe('Exam name'),
      examType: z.enum(['INTERNAL', 'EXTERNAL', 'PRACTICAL']).describe('Exam type'),
      scheduleDate: z.string().describe('Schedule date (ISO string YYYY-MM-DD)'),
      duration: z.number().describe('Duration in minutes'),
      courses: z.array(z.string()).describe('Array of Course ObjectIds'),
      subjects: z.array(z.string()).describe('Array of Subject ObjectIds'),
      totalMarks: z.number().describe('Total marks'),
      passingMarks: z.number().describe('Passing marks'),
      gradingScheme: z.array(
        z.object({
          grade: z.enum(['A+', 'A', 'B+', 'B', 'C', 'D', 'F']),
          minMarks: z.number().describe('Minimum marks for this grade'),
          maxMarks: z.number().describe('Maximum marks for this grade'),
          gradePoint: z.number().describe('Grade point value (e.g. 10 for A+, 9 for A)'),
        })
      ).describe('Array of grading rules'),
      venue: z.string().optional().describe('Exam venue (default Examination Wing)'),
      createdBy: z.string().describe('User ObjectId creating the exam'),
    },
    async (params) => {
      try {
        const existing = await Exam.findOne({ code: params.code, isDeleted: false });
        if (existing) return error(`Exam with code "${params.code}" already exists`);

        const exam = await Exam.create({
          ...params,
          collegeId: toObjectId(params.collegeId, 'collegeId'),
          courses: params.courses.map(c => toObjectId(c, 'course')),
          subjects: params.subjects.map(s => toObjectId(s, 'subject')),
          createdBy: toObjectId(params.createdBy, 'createdBy'),
          scheduleDate: new Date(params.scheduleDate),
        });

        return success({ message: '✅ Exam scheduled successfully', examId: exam._id, code: exam.code });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── exam_update ───────────────────────────────────────────────
  server.tool(
    'exam_update',
    'Update an exam schedule. Pass only fields to change.',
    {
      id: z.string().describe('Exam _id (ObjectId)'),
      updates: z.record(z.any()).describe('Key-value updates (e.g., "status": "PUBLISHED", "venue": "Hall B")'),
    },
    async (params) => {
      try {
        const updates = { ...params.updates };
        if (updates.courses) updates.courses = updates.courses.map((c: string) => toObjectId(c, 'course'));
        if (updates.subjects) updates.subjects = updates.subjects.map((s: string) => toObjectId(s, 'subject'));
        if (updates.publishedBy) updates.publishedBy = toObjectId(updates.publishedBy, 'publishedBy');
        if (updates.scheduleDate) updates.scheduleDate = new Date(updates.scheduleDate);

        const exam = await Exam.findByIdAndUpdate(
          toObjectId(params.id, 'id'),
          { $set: updates },
          { new: true, runValidators: true }
        ).lean();

        if (!exam) return error('Exam not found');
        return success({ message: '✅ Exam updated', exam });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── exam_delete ───────────────────────────────────────────────
  server.tool(
    'exam_delete',
    'Delete an exam schedule. Default: soft-delete (sets isDeleted=true). Pass hard=true for permanent deletion.',
    {
      id: z.string().describe('Exam _id (ObjectId)'),
      hard: z.boolean().optional().describe('If true, permanently delete. Default: soft-delete'),
    },
    async (params) => {
      try {
        const examId = toObjectId(params.id, 'id');
        const exam = await Exam.findById(examId);
        if (!exam) return error('Exam not found');

        if (params.hard) {
          await Exam.deleteOne({ _id: examId });
          return success({ message: `⚠️ Exam ${exam.code} permanently deleted` });
        } else {
          await Exam.updateOne({ _id: examId }, { $set: { isDeleted: true } });
          return success({ message: `✅ Exam ${exam.code} soft-deleted` });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── marks_list ────────────────────────────────────────────────
  server.tool(
    'marks_list',
    'List student marks. Can filter by student, exam, or subject.',
    {
      examId: z.string().optional().describe('Filter by Exam ObjectId'),
      studentId: z.string().optional().describe('Filter by Student ObjectId'),
      subjectId: z.string().optional().describe('Filter by Subject ObjectId'),
      collegeId: z.string().optional().describe('Filter by college ObjectId'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.examId) filter.examId = toObjectId(params.examId, 'examId');
        if (params.studentId) filter.studentId = toObjectId(params.studentId, 'studentId');
        if (params.subjectId) filter.subjectId = toObjectId(params.subjectId, 'subjectId');
        if (params.collegeId) filter.collegeId = toObjectId(params.collegeId, 'collegeId');

        const query = Marks.find(filter)
          .populate('studentId', 'uniqueStudentId personalInfo.firstName personalInfo.lastName')
          .populate('subjectId', 'name code')
          .populate('examId', 'name code')
          .sort({ createdAt: -1 });
        const countQuery = Marks.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── marks_upsert ──────────────────────────────────────────────
  server.tool(
    'marks_upsert',
    'Record or update marks for a student. Uses the required save({ timestamps: false }) pattern to fire pre-save auto-grading hooks without double-triggering timestamps.',
    {
      collegeId: z.string().describe('College ObjectId'),
      examId: z.string().describe('Exam ObjectId'),
      studentId: z.string().describe('Student ObjectId'),
      subjectId: z.string().describe('Subject ObjectId'),
      teacherId: z.string().describe('Teacher User ObjectId entering marks'),
      marksObtained: z.number().describe('Marks obtained by student'),
      maxMarks: z.number().describe('Maximum possible marks'),
      isPublished: z.boolean().optional().describe('Publish marks immediately (default false)'),
      remarks: z.string().optional().describe('Optional comments'),
    },
    async (params) => {
      try {
        const collegeId = toObjectId(params.collegeId, 'collegeId');
        const examId = toObjectId(params.examId, 'examId');
        const studentId = toObjectId(params.studentId, 'studentId');
        const subjectId = toObjectId(params.subjectId, 'subjectId');
        const teacherId = toObjectId(params.teacherId, 'teacherId');

        // Validation
        const student = await Student.findOne({ _id: studentId, isDeleted: false });
        if (!student) return error(`Active Student ${params.studentId} not found`);

        const exam = await Exam.findById(examId);
        if (!exam) return error(`Exam ${params.examId} not found`);

        const subject = await Subject.findById(subjectId);
        if (!subject) return error(`Subject ${params.subjectId} not found`);

        const teacher = await User.findById(teacherId);
        if (!teacher) return error(`Teacher User ${params.teacherId} not found`);

        if (params.marksObtained > params.maxMarks) {
          return error(`marksObtained (${params.marksObtained}) cannot exceed maxMarks (${params.maxMarks})`);
        }

        // Find or init Marks document
        let markDoc = await Marks.findOne({ examId, studentId, subjectId });
        if (!markDoc) {
          markDoc = new Marks({
            collegeId,
            examId,
            studentId,
            subjectId,
            teacherId,
            marksObtained: params.marksObtained,
            maxMarks: params.maxMarks,
            isPublished: params.isPublished || false,
            remarks: params.remarks,
          });
        } else {
          // Update fields
          markDoc.marksObtained = params.marksObtained;
          markDoc.maxMarks = params.maxMarks;
          markDoc.teacherId = teacherId;
          if (params.isPublished !== undefined) markDoc.isPublished = params.isPublished;
          if (params.remarks !== undefined) markDoc.remarks = params.remarks;
        }

        // Save using the required pattern to fire pre-save hook and calculate grade automatically
        // timestamps: false avoids double-updating updatedAt
        await markDoc.save({ timestamps: false });

        return success({
          message: '✅ Marks recorded successfully',
          marksId: markDoc._id,
          grade: markDoc.grade,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── result_generate ────────────────────────────────────────────
  server.tool(
    'result_generate',
    'Calculate and publish the overall result for a student in a specific exam. Computes subjects summary, total marks, percentage, CGPA, and status using the exam\'s own grading scheme.',
    {
      examId: z.string().describe('Exam ObjectId'),
      studentId: z.string().describe('Student ObjectId'),
      publishedBy: z.string().describe('User ObjectId publishing the result'),
    },
    async (params) => {
      try {
        const examId = toObjectId(params.examId, 'examId');
        const studentId = toObjectId(params.studentId, 'studentId');
        const publishedBy = toObjectId(params.publishedBy, 'publishedBy');

        // 1. Verify student and exam
        const student = await Student.findOne({ _id: studentId, isDeleted: false })
          .populate('academicInfo.department');
        if (!student) return error(`Active Student ${params.studentId} not found`);

        const exam = await Exam.findById(examId);
        if (!exam) return error(`Exam ${params.examId} not found`);

        // 2. Fetch all marks recorded for this student in this exam
        const marksList = await Marks.find({ examId, studentId }).populate('subjectId');
        if (marksList.length === 0) {
          return error('No marks recorded for this student in the specified exam');
        }

        // 3. Resolve course and batch from student
        // Let's search for a Course match in student's academicInfo
        // If course name is string, we'll try to find Course by name or code
        const course = await Course.findOne({
          $or: [{ name: student.academicInfo.course }, { code: student.academicInfo.course }],
          collegeId: exam.collegeId,
        });
        if (!course) {
          return error(`Course "${student.academicInfo.course}" not found in database for student`);
        }

        const batchId = student.batchId;
        if (!batchId) {
          return error('Student does not have an assigned batchId');
        }

        // 4. Map Marks to SubjectResults using Exam's gradingScheme
        const subjects: any[] = [];
        let totalMarksObtained = 0;
        let totalMaxMarks = 0;
        let totalGradePoints = 0;
        let hasFailed = false;
        const reAppearSubjects: any[] = [];

        for (const mark of marksList) {
          const subject = mark.subjectId as any;
          const pct = (mark.marksObtained / mark.maxMarks) * 100;

          // Find grade matching the percentage from the Exam's grading scheme
          let resolvedGrade = 'F';
          let resolvedGradePoint = 0;

          for (const rule of exam.gradingScheme) {
            if (pct >= rule.minMarks && pct <= rule.maxMarks) {
              resolvedGrade = rule.grade;
              resolvedGradePoint = rule.gradePoint;
              break;
            }
          }

          // If the mark pre-save hook calculated a grade but we want to stick to the exam's scheme
          const finalGrade = resolvedGrade;
          const finalGradePoint = resolvedGradePoint;

          // Determine status
          // Fail if grade is 'F' or marks are below passingMarks ratio
          const subjectRatio = mark.marksObtained / mark.maxMarks;
          const passRatio = exam.passingMarks / exam.totalMarks;
          const status = (finalGrade === 'F' || subjectRatio < passRatio) ? 'FAIL' : 'PASS';

          if (status === 'FAIL') {
            hasFailed = true;
            reAppearSubjects.push(subject._id);
          }

          subjects.push({
            subjectId: subject._id,
            subjectName: subject.name,
            marks: mark.marksObtained,
            maxMarks: mark.maxMarks,
            grade: finalGrade,
            gradePoint: finalGradePoint,
            status,
          });

          totalMarksObtained += mark.marksObtained;
          totalMaxMarks += mark.maxMarks;
          totalGradePoints += finalGradePoint;
        }

        // 5. Calculate overall metrics
        const percentage = totalMaxMarks > 0 ? (totalMarksObtained / totalMaxMarks) * 100 : 0;
        const cgpa = subjects.length > 0 ? totalGradePoints / subjects.length : 0;
        const overallStatus = hasFailed ? 'FAIL' : 'PASS';

        // 6. Generate and save the Result record (or update if already exists)
        const resultDoc = await Result.findOneAndUpdate(
          { type: 'EXAM', examId, studentId },
          {
            $set: {
              type: 'EXAM',
              examId,
              studentId,
              courseId: course._id,
              batchId,
              subjects,
              totalMarksObtained,
              totalMaxMarks,
              percentage: parseFloat(percentage.toFixed(2)),
              cgpa: parseFloat(cgpa.toFixed(2)),
              status: overallStatus,
              reAppearSubjects,
              publishedDate: new Date(),
              publishedBy,
            },
          },
          { upsert: true, new: true }
        );

        return success({
          message: `✅ Result generated and published successfully (${overallStatus})`,
          resultId: resultDoc._id,
          percentage: resultDoc.percentage,
          cgpa: resultDoc.cgpa,
          status: resultDoc.status,
          reAppearCount: reAppearSubjects.length,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
