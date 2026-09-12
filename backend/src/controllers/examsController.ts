import { Request, Response } from "express";
import Exam from "../models/Exam.js";
import Marks from "../models/Marks.js";
import Result from "../models/Result.js";
import HallTicket from "../models/HallTicket.js";
import Student from "../models/Student.js";
import Parent from "../models/Parent.js";
import mongoose from "mongoose";
import { emitToStudent, emitToBatch } from "../config/socket.js";
import { calculateTotalMarks, calculateGrade, calculateCGPA } from "../services/gradeCalculator.js";
import { syncSingleResult, syncBulkResults } from "../services/resultService.js";

const deriveExamStatus = (exam: any, now: Date) => {
  const scheduleDate = exam?.scheduleDate ? new Date(exam.scheduleDate) : null;
  if (scheduleDate && scheduleDate <= now && exam?.status !== 'PUBLISHED') {
    return 'EXPIRED';
  }
  return exam?.status;
};

/**
 * Create a new exam
 * POST /api/exams
 */
export const createExam = async (req: Request, res: Response) => {
  try {
    console.log("[CREATE_EXAM] Request body:", JSON.stringify(req.body, null, 2));
    
    const userRole = (req as any).user?.role;
    const userCollegeId = (req as any).user?.collegeId;
    const bodyCollegeId = req.body.collegeId;
    const normalizedCode = String(req.body.code || "").trim().toUpperCase();

    // For college admins, enforce their collegeId
    const finalCollegeId = userRole === 'COLLEGE_ADMIN' ? userCollegeId : bodyCollegeId;

    if (!finalCollegeId) {
      console.error("[CREATE_EXAM] collegeId is required. userRole:", userRole, "userCollegeId:", userCollegeId, "bodyCollegeId:", bodyCollegeId);
      return res.status(400).json({ success: false, message: 'collegeId is required' });
    }

    // Validate required fields
    if (!normalizedCode) return res.status(400).json({ success: false, message: 'Exam code is required' });
    if (!req.body.name) return res.status(400).json({ success: false, message: 'Exam name is required' });
    if (!req.body.examType) return res.status(400).json({ success: false, message: 'Exam type is required' });
    if (!req.body.scheduleDate) return res.status(400).json({ success: false, message: 'Schedule date is required' });
    if (!Array.isArray(req.body.subjects) || req.body.subjects.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one subject must be selected' });
    }
    if (!req.body.totalMarks) return res.status(400).json({ success: false, message: 'Total marks are required' });
    if (req.body.passingMarks === undefined) return res.status(400).json({ success: false, message: 'Passing marks are required' });

    // Check for duplicate exam code within the college
    const existingExam = await Exam.findOne({ code: normalizedCode, collegeId: finalCollegeId });
    if (existingExam) {
      return res.status(409).json({ success: false, message: `An exam with code '${normalizedCode}' already exists in this college` });
    }

    const exam = new Exam({
      ...req.body,
      code: normalizedCode,
      collegeId: finalCollegeId,
      status: 'DRAFT',
      createdBy: (req as any).user?._id
    });
    await exam.save();
    res.status(201).json({ success: true, data: exam, message: "Exam created as DRAFT" });
  } catch (error: any) {
    console.error('[CREATE_EXAM]', error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ success: false, message: `An exam with this ${field} already exists` });
    }
    res.status(400).json({ success: false, message: error.message || 'Failed to create exam' });
  }
};

/**
 * Get all exams with filters
 * GET /api/exams
 */
export const getExams = async (req: Request, res: Response) => {
  try {
    const { status, courseId } = req.query;
    const userRole = (req as any).user?.role;
    const userCollegeId = (req as any).user?.collegeId;
    const query: any = {};
    
    const isValidObjectId = (id: any) => mongoose.Types.ObjectId.isValid(id);

    // Enforce college scope for all non-super-admin roles
    if (userRole !== 'SUPER_ADMIN' && userCollegeId) {
      query.collegeId = userCollegeId;
    }

    if (status && status !== 'undefined') query.status = status;
    if (courseId && isValidObjectId(courseId)) query.courses = courseId;

    const exams = await Exam.find(query).sort({ scheduleDate: -1 });
    const now = new Date();
    const normalizedStatus = status ? String(status).toUpperCase() : undefined;

    const transformed = exams
      .map((exam: any) => {
        const examObj = exam.toObject ? exam.toObject() : exam;
        const derivedStatus = deriveExamStatus(examObj, now);
        return {
          ...examObj,
          derivedStatus,
          status: derivedStatus,
        };
      })
      .filter((exam: any) => {
        if (!normalizedStatus || normalizedStatus === 'UNDEFINED') return true;
        return String(exam.status || '').toUpperCase() === normalizedStatus;
      });

    res.status(200).json({ success: true, data: transformed });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get exam summary stats
 * GET /api/exams/stats
 */
export const getExamStats = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const userCollegeId = (req as any).user?.collegeId;
    const now = new Date();
    const query: any = {};

    if (userRole !== 'SUPER_ADMIN' && userCollegeId) {
      query.collegeId = userCollegeId;
    }

    const [totalExams, publishedExams, upcomingExams, expiredExams] = await Promise.all([
      Exam.countDocuments(query),
      Exam.countDocuments({ ...query, status: 'PUBLISHED' }),
      Exam.countDocuments({ ...query, scheduleDate: { $gt: now } }),
      Exam.countDocuments({ ...query, scheduleDate: { $lte: now }, status: { $ne: 'PUBLISHED' } }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        total: totalExams,
        upcoming: upcomingExams,
        published: publishedExams,
        expired: expiredExams,
        serverNow: now,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to fetch exam stats' });
  }
};

/**
 * Get exam by ID
 * GET /api/exams/:examId
 */
export const getExamById = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const userCollegeId = (req as any).user?.collegeId;
    
    const exam = await Exam.findById(req.params.examId)
      .populate("courses", "name code")
      .populate("subjects", "name code");
    
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    
    // For college admins, verify they own this exam's college
    if (userRole === 'COLLEGE_ADMIN' && String(exam.collegeId) !== String(userCollegeId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    res.status(200).json({ success: true, data: exam });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update exam details
 * PUT /api/exams/:examId
 */
export const updateExam = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const userCollegeId = (req as any).user?.collegeId;
    
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    
    // For college admins, verify they own this exam's college
    if (userRole === 'COLLEGE_ADMIN' && String(exam.collegeId) !== String(userCollegeId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    const updatedExam = await Exam.findByIdAndUpdate(req.params.examId, req.body, { new: true });
    res.status(200).json({ success: true, data: updatedExam, message: "Exam updated successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Schedule an exam (DRAFT -> SCHEDULED)
 * PATCH /api/exams/:examId/schedule
 */
export const scheduleExam = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user?.role;
    const userCollegeId = (req as any).user?.collegeId;
    
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    
    // For college admins, verify they own this exam's college
    if (userRole === 'COLLEGE_ADMIN' && String(exam.collegeId) !== String(userCollegeId)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }
    
    const scheduledExam = await Exam.findByIdAndUpdate(
      req.params.examId,
      { status: 'SCHEDULED' },
      { new: true }
    );
    if (!scheduledExam) return res.status(404).json({ success: false, message: "Exam not found" });
    res.status(200).json({ success: true, data: scheduledExam, message: "Exam scheduled successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Enter marks for a student
 * POST /api/exams/:examId/marks
 */
export const enterMarks = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { studentId, subjectId, components, courseId, batchId } = req.body;

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    const totalMarks = calculateTotalMarks(components);
    const { grade, gradePoint } = calculateGrade(totalMarks, exam.totalMarks, exam.gradingScheme);

    const marks = await Marks.findOneAndUpdate(
      { examId, studentId, subjectId },
      {
        examId,
        studentId,
        subjectId,
        courseId,
        batchId,
        components,
        totalMarks,
        marksObtained: totalMarks, // Syncing marksObtained to totalMarks
        grade,
        gradePoint,
        status: 'COMPLETED',
        enteredBy: (req as any).user?._id,
        enteredAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Sync to Result Collection (Centralized)
    await syncSingleResult({
      type: 'EXAM',
      examId,
      studentId,
      subjectId,
      marksObtained: totalMarks,
      maxMarks: exam.totalMarks,
      grade,
      gradePoint,
      status: totalMarks >= exam.passingMarks ? 'PASS' : 'FAIL',
      collegeId: exam.collegeId,
      courseId,
      batchId,
      publishedBy: (req as any).user?._id
    });

    res.status(200).json({ success: true, data: marks, message: "Marks entered and synchronized successfully" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Bulk import marks via CSV/Excel logic
 * POST /api/exams/:examId/marks/bulk-import
 */
export const bulkImportMarks = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { records } = req.body; // Array of { studentId, subjectId, courseId, batchId, components }

    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    const operations = records.map((record: any) => {
      const totalMarks = calculateTotalMarks(record.components);
      const { grade, gradePoint } = calculateGrade(totalMarks, exam.totalMarks, exam.gradingScheme);

      return {
        updateOne: {
          filter: { examId, studentId: record.studentId, subjectId: record.subjectId },
          update: {
            ...record,
            examId,
            totalMarks,
            grade,
            gradePoint,
            status: 'COMPLETED',
            enteredBy: (req as any).user?._id,
            enteredAt: new Date()
          },
          upsert: true
        }
      };
    });

    await Marks.bulkWrite(operations);

    // Sync Bulk Results to Result Collection (Centralized)
    const syncRecords = records.map((record: any) => {
      const totalMarks = calculateTotalMarks(record.components);
      const { grade, gradePoint } = calculateGrade(totalMarks, exam.totalMarks, exam.gradingScheme);
      return {
        type: 'EXAM',
        examId,
        studentId: record.studentId,
        subjectId: record.subjectId,
        marksObtained: totalMarks,
        maxMarks: exam.totalMarks,
        grade,
        gradePoint,
        status: totalMarks >= exam.passingMarks ? 'PASS' : 'FAIL',
        collegeId: exam.collegeId,
        courseId: record.courseId,
        batchId: record.batchId,
        publishedBy: (req as any).user?._id
      };
    });

    await syncBulkResults(syncRecords);

    res.status(200).json({ success: true, message: `Marks imported and synchronized for ${records.length} records` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get marks for an exam
 * GET /api/exams/:examId/marks
 */
export const getMarks = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const { studentId, subjectId, batchId } = req.query;
    const query: any = { examId };
    if (studentId) query.studentId = studentId;
    if (subjectId) query.subjectId = subjectId;
    if (batchId) query.batchId = batchId;

    const marks = await Marks.find(query)
      .populate("studentId", "personalInfo.firstName personalInfo.lastName uniqueStudentId")
      .populate("subjectId", "name code");
    
    res.status(200).json({ success: true, data: marks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Publish results for an exam
 * POST /api/exams/:examId/publish
 */
export const publishResults = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { examId } = req.params;
    const user = (req as any).user;
    const exam = await Exam.findById(examId).session(session);
    if (!exam) throw new Error("Exam not found");

    if (String(user?.role || '').toUpperCase() === 'TEACHER' && String(exam.createdBy || '') !== String(user?._id || '')) {
      throw new Error('You can only publish results for exams created by you');
    }

    // 1. Get all marks for this exam and populate subjects
    const allMarks = await Marks.find({ examId })
      .populate("subjectId", "name code")
      .populate("batchId", "name")
      .populate("courseId", "name")
      .session(session);

    // 2. Aggregate marks by student
    const studentMarksMap = new Map();
    allMarks.forEach((mark: any) => {
      if (!studentMarksMap.has(mark.studentId.toString())) {
        studentMarksMap.set(mark.studentId.toString(), []);
      }
      studentMarksMap.get(mark.studentId.toString()).push(mark);
    });

    // 3. Create results and hall tickets for each student
    const resultOps = [];
    const hallTicketOps = [];

    for (const [studentId, marks] of studentMarksMap.entries()) {
      const student = await Student.findById(studentId)
        .populate("academicInfo.department", "name")
        .session(session);
      if (!student) continue;

      const totalObtained = marks.reduce((sum: number, m: any) => sum + m.totalMarks, 0);
      const totalPossible = marks.length * exam.totalMarks;
      const percentage = (totalObtained / totalPossible) * 100;
      const cgpa = calculateCGPA(marks.map((m: any) => ({ gradePoint: m.gradePoint })));

      const subjects = marks.map((m: any) => ({
        subjectId: m.subjectId._id,
        subjectName: m.subjectId.name,
        marks: m.totalMarks,
        maxMarks: exam.totalMarks,
        grade: m.grade,
        gradePoint: m.gradePoint,
        status: m.totalMarks >= exam.passingMarks ? 'PASS' : 'FAIL'
      }));

      const isPass = subjects.every((s: any) => s.status === 'PASS');

      resultOps.push({
        updateOne: {
          filter: { examId, studentId },
          update: {
            examId,
            studentId,
            courseId: marks[0].courseId?._id || marks[0].courseId,
            batchId: marks[0].batchId?._id || marks[0].batchId,
            subjects,
            totalMarksObtained: totalObtained,
            totalMaxMarks: totalPossible,
            percentage,
            cgpa,
            status: isPass ? 'PASS' : 'FAIL',
            publishedDate: new Date(),
            publishedBy: (req as any).user?._id
          },
          upsert: true
        }
      });

      // Simple unique ticket number generation
      const ticketNumber = `HT-${exam.code}-${student.uniqueStudentId}`;

      hallTicketOps.push({
        updateOne: {
          filter: { examId, studentId },
          update: {
            examId,
            studentId,
            ticketNumber,
            studentInfo: {
              name: student.personalInfo.name || `${student.personalInfo.firstName} ${student.personalInfo.lastName}`,
              rollNumber: student.academicInfo.rollNumber || student.uniqueStudentId,
              enrollmentNumber: student.uniqueStudentId,
              photo: student.personalInfo.photo || "",
              course: marks[0].courseId?.name || "B.Tech",
              batch: marks[0].batchId?.name || student.academicInfo.batch || "Year 1",
              department: (student.academicInfo.department as any)?.name || "Engineering"
            },
            examInfo: {
              examCode: exam.code,
              examName: exam.name,
              scheduleDate: exam.scheduleDate,
              duration: exam.duration,
              venue: exam.venue || "Examination Wing",
              seatNumber: "Assigned per hall",
              invigilator: "Departmental Staff"
            },
            status: 'PUBLISHED',
            generatedAt: new Date()
          },
          upsert: true
        }
      });
    }

    if (resultOps.length > 0) await Result.bulkWrite(resultOps, { session });
    if (hallTicketOps.length > 0) await HallTicket.bulkWrite(hallTicketOps, { session });

    // Emit real-time notifications to each student and parent
    studentMarksMap.forEach((marks, studentId) => {
      emitToStudent(studentId, "resultsPublished", { examId });
    });
    const batchId = (allMarks[0] as any)?.batchId;
    if (batchId) {
      emitToBatch(batchId.toString(), "resultsPublished", { examId });
    }

    // 4. Update exam status
    exam.status = 'PUBLISHED';
    exam.publishedDate = new Date();
    exam.publishedBy = (req as any).user?._id;
    await exam.save({ session });

    await session.commitTransaction();
    res.status(200).json({ success: true, message: "Results published and Hall Tickets generated" });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * Get results for a student or exam
 * GET /api/results
 */
export const getResults = async (req: Request, res: Response) => {
  try {
    const { studentId, examId } = req.query;
    console.log(`[RESULTS API] studentId: "${studentId}", examId: "${examId}"`);
    const query: any = {};
    const user = (req as any).user;
    const isValidObjectId = (id: any) => {
      if (!id || id === 'undefined' || id === 'null' || id === '') return false;
      return mongoose.Types.ObjectId.isValid(id);
    };

    if (user.role === 'STUDENT') {
      const student = await Student.findOne({ userId: user._id });
      if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });
      query.studentId = student._id;
    } else if (user.role === 'PARENT') {
      const parent = await Parent.findOne({ userId: user._id });
      if (!parent || !parent.students.length) {
        return res.status(404).json({ success: false, message: "No linked students found for this parent" });
      }
      query.studentId = parent.students[0]; // Default to first child for detailed view
    } else if (studentId && isValidObjectId(studentId)) {
      query.studentId = studentId;
    }
    
    if (examId && isValidObjectId(examId)) {
      query.examId = examId;
    }

    console.log(`[RESULTS API] Generated query:`, JSON.stringify(query));
    const results = await Result.find(query)
      .populate("studentId", "personalInfo.firstName personalInfo.lastName uniqueStudentId")
      .populate("examId", "name code totalMarks")
      .populate("assignmentId")
      .sort({ createdAt: -1 });
    
    // 4. Calculate Aggregates
    const totalExams = results.length;
    const overallCgpa = totalExams > 0 
      ? parseFloat((results.reduce((acc, r) => acc + r.cgpa, 0) / totalExams).toFixed(2))
      : 0;
    const latestPercentage = totalExams > 0 ? results[0].percentage : 0;

    res.status(200).json({ 
      success: true, 
      data: {
        overallCgpa,
        latestPercentage,
        totalExams,
        results
      } 
    });
  } catch (error: any) {
    console.error(`[RESULTS API] Error:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get hall ticket for a student
 * GET /api/hall-tickets/:studentId/:examId
 */
export const getHallTicket = async (req: Request, res: Response) => {
  try {
    const { studentId, examId } = req.params;
    const ticket = await HallTicket.findOne({ studentId, examId });
    if (!ticket) return res.status(404).json({ success: false, message: "Hall ticket not found" });
    
    res.status(200).json({ success: true, data: ticket });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Generate exam performance analysis
 * GET /api/reports/exam-analysis
 */
export const generateExamAnalysis = async (req: Request, res: Response) => {
  try {
    const { examId } = req.query;
    if (!examId) return res.status(400).json({ success: false, message: "examId is required" });

    const stats = await Result.aggregate([
      { $match: { examId: new mongoose.Types.ObjectId(examId as string) } },
      {
        $group: {
          _id: "$examId",
          avgPercentage: { $avg: "$percentage" },
          maxPercentage: { $max: "$percentage" },
          minPercentage: { $min: "$percentage" },
          passCount: { $sum: { $cond: [{ $eq: ["$status", "PASS"] }, 1, 0] } },
          failCount: { $sum: { $cond: [{ $eq: ["$status", "FAIL"] }, 1, 0] } },
          totalCount: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({ success: true, data: stats[0] || {} });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
