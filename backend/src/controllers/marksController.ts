import { Request, Response } from 'express';
import Marks from '../models/Marks.js';
import Exam from '../models/Exam.js';
import Faculty from '../models/Faculty.js';
import Subject from '../models/Subject.js';
import { syncSingleResult } from '../services/resultService.js';

const resolveCourseIdFromSubject = async (subjectId: string) => {
  if (!subjectId) return null;
  const subject = await Subject.findById(subjectId).select('courseId');
  return subject?.courseId || null;
};

/**
 * @desc    List assigned exams for teacher
 * @route   GET /api/teacher/marks/exams
 * @access  Private (Teacher)
 */
export const getAssignedExams = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;

    // Fetch teacher's assigned subjects
    const faculty = await Faculty.findOne({ userId: teacherId, collegeId });
    const assignedSubjectIds = faculty?.assignedSubjects?.map((a: any) => a.subjectId).filter(Boolean) || [];

    // Get exams that either:
    // 1. Have subjects matching teacher's assigned subjects, OR
    // 2. Were created by the teacher
    const exams = await Exam.find({
      collegeId,
      $or: [
        { subjects: { $in: assignedSubjectIds } },
        { createdBy: teacherId }
      ],
      status: { $in: ['SCHEDULED', 'PUBLISHED', 'DRAFT'] }
    })
      .populate('subjects', 'name code')
      .sort({ scheduleDate: -1 });

    res.status(200).json({ success: true, data: exams });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Enter marks for a class/subject
 * @route   POST /api/teacher/marks/enter
 * @access  Private (Teacher)
 */
export const enterMarks = async (req: Request, res: Response) => {
  try {
    const { examId, studentId, subjectId, batchId, marksObtained, maxMarks, remarks } = req.body;
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;

    // 1. Normalize IDs to strings for comparison
    const teacherIdStr = teacherId.toString();
    const subjectIdStr = subjectId.toString();
    const batchIdStr = batchId.toString();

    // 2. Verify exam exists and teacher created it or is assigned
    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const isExamCreator = exam.createdBy?.toString() === teacherIdStr;
    
    let isAuthorized = isExamCreator;
    
    if (!isAuthorized) {
      const faculty = await Faculty.findOne({ userId: teacherId, collegeId });
      if (faculty) {
        isAuthorized = faculty.assignedSubjects.some((a: any) =>
          a.subjectId.toString() === subjectIdStr && a.batchId.toString() === batchIdStr
        );
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'You are not authorized to save marks for this class' });
    }

    if (marksObtained > maxMarks) {
      return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed max marks' });
    }

    // Check if marks already exist
    const existing = await Marks.findOne({ examId, studentId, subjectId, collegeId });
    if (existing) {
       return res.status(400).json({ success: false, message: 'Marks already entered for this student' });
    }

    const marks = await Marks.create({
      collegeId,
      examId,
      studentId,
      subjectId,
      teacherId,
      marksObtained,
      maxMarks,
      remarks
    });

    // Centralized Sync to Result Collection
    const percentage = (marksObtained / maxMarks) * 100;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';

    await syncSingleResult({
      type: 'EXAM',
      examId,
      studentId,
      subjectId,
      marksObtained,
      maxMarks,
      grade,
      gradePoint: percentage / 10,
      status: percentage >= 40 ? 'PASS' : 'FAIL', // Standard passing threshold
      collegeId,
      courseId: await resolveCourseIdFromSubject(String(subjectId)),
      batchId,
      publishedBy: teacherId
    });

    res.status(201).json({ success: true, data: marks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get entered marks for an exam (Scoped)
 * @route   GET /api/teacher/marks/:examId
 * @access  Private (Teacher)
 */
export const getMarksByExam = async (req: Request, res: Response) => {
  try {
    const { examId } = req.params;
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;

    // Verify ownership or assignment if needed, but here we filter by teacherId
    const marks = await Marks.find({ collegeId, examId, teacherId })
      .populate('studentId', 'personalInfo academicInfo')
      .populate('subjectId', 'name');

    res.status(200).json({ success: true, data: marks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Edit marks before publication
 * @route   PUT /api/teacher/marks/:markId
 * @access  Private (Teacher)
 */
export const editMarks = async (req: Request, res: Response) => {
  try {
    const { markId } = req.params;
    const { marksObtained, remarks } = req.body;
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;

    const marks = await Marks.findOne({ _id: markId, collegeId });

    if (!marks) {
      return res.status(404).json({ success: false, message: 'Marks record not found' });
    }

    if (marks.teacherId.toString() !== teacherId.toString()) {
       return res.status(403).json({ success: false, message: 'Not authorized to edit these marks' });
    }

    if (marks.isPublished) {
      return res.status(403).json({ success: false, message: 'Cannot edit marks after result publication' });
    }

    if (marksObtained > marks.maxMarks) {
      return res.status(400).json({ success: false, message: 'Marks obtained cannot exceed max marks' });
    }

    marks.marksObtained = marksObtained;
    marks.remarks = remarks;
    await marks.save();

    // Centralized Sync to Result Collection
    const percentage = (marksObtained / marks.maxMarks) * 100;
    let grade = 'F';
    if (percentage >= 90) grade = 'A+';
    else if (percentage >= 80) grade = 'A';
    else if (percentage >= 70) grade = 'B';
    else if (percentage >= 60) grade = 'C';
    else if (percentage >= 50) grade = 'D';

    await syncSingleResult({
      type: 'EXAM',
      examId: marks.examId,
      studentId: marks.studentId,
      subjectId: marks.subjectId,
      marksObtained,
      maxMarks: marks.maxMarks,
      grade,
      gradePoint: percentage / 10,
      status: percentage >= 40 ? 'PASS' : 'FAIL',
      collegeId,
      courseId: await resolveCourseIdFromSubject(String(marks.subjectId)),
      batchId: (req.body?.batchId || null),
      publishedBy: teacherId
    });

    res.status(200).json({ success: true, data: marks });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Bulk save marks for a teacher's assigned class
 * @route   POST /api/teacher/marks/bulk
 * @access  Private (Teacher)
 */
export const bulkEnterMarks = async (req: Request, res: Response) => {
  try {
    const { examId, subjectId, batchId, maxMarks, entries } = req.body || {};
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;

    if (!examId || !subjectId || !batchId) {
      return res.status(400).json({ success: false, message: 'Please select a subject before saving marks' });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'No marks were provided to save' });
    }

    // Verify teacher created the exam or is assigned the subject
    const exam = await Exam.findById(examId).lean();
    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const isExamCreator = exam.createdBy?.toString() === teacherId.toString();
    
    let isAuthorized = isExamCreator;
    
    if (!isAuthorized) {
      const faculty = await Faculty.findOne({ userId: teacherId, collegeId });
      if (faculty) {
        isAuthorized = faculty.assignedSubjects.some((a: any) =>
          a.subjectId.toString() === String(subjectId) && a.batchId.toString() === String(batchId)
        );
      }
    }
    
    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'You are not authorized to save marks for this class' });
    }

    const numericMax = Number(maxMarks) || 100;
    const courseId = await resolveCourseIdFromSubject(String(subjectId));

    const saved: any[] = [];
    for (const entry of entries) {
      const studentId = String(entry?.studentId || '').trim();
      const marksObtained = Number(entry?.marks);
      const remarks = String(entry?.remarks || '');

      if (!studentId || Number.isNaN(marksObtained)) {
        continue;
      }
      if (marksObtained > numericMax) {
        return res.status(400).json({ success: false, message: 'Marks cannot be greater than maximum score' });
      }

      const existing = await Marks.findOne({ examId, studentId, subjectId, collegeId });
      let record: any;
      if (existing) {
        existing.marksObtained = marksObtained;
        existing.remarks = remarks;
        await existing.save();
        record = existing;
      } else {
        record = await Marks.create({
          collegeId,
          examId,
          studentId,
          subjectId,
          teacherId,
          marksObtained,
          maxMarks: numericMax,
          remarks,
        });
      }

      const percentage = (marksObtained / numericMax) * 100;
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';

      await syncSingleResult({
        type: 'EXAM',
        examId,
        studentId,
        subjectId,
        marksObtained,
        maxMarks: numericMax,
        grade,
        gradePoint: percentage / 10,
        status: percentage >= 40 ? 'PASS' : 'FAIL',
        collegeId,
        courseId,
        batchId,
        publishedBy: teacherId,
      });

      saved.push(record);
    }

    return res.status(200).json({ success: true, data: saved, message: 'All marks saved successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
