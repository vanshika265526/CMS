import Result from '../models/Result.js';
import Subject from '../models/Subject.js';
import Exam from '../models/Exam.js';
import mongoose from 'mongoose';
import { calculateCGPA } from './gradeCalculator.js';

/**
 * Sync a single subject mark to the student's Result record
 * Supports individual entry and edits
 */
export const syncSingleResult = async ({
  type = 'EXAM',
  examId,
  assignmentId,
  studentId,
  subjectId,
  marksObtained,
  maxMarks,
  grade,
  gradePoint,
  status,
  collegeId,
  courseId,
  batchId,
  publishedBy
}: any) => {
  const subject = await Subject.findById(subjectId);
  const subjectResult = {
    subjectId,
    subjectName: subject?.name || 'Academic Coursework',
    creditHours: subject?.creditHours ?? 1,
    marks: marksObtained,
    maxMarks,
    grade,
    gradePoint,
    status: status || (marksObtained / maxMarks >= 0.4 ? 'PASS' : 'FAIL')
  };

  const query: any = { type, studentId };
  if (examId) query.examId = examId;
  if (assignmentId) query.assignmentId = assignmentId;

  const existingResult = await Result.findOne(query);
  if (existingResult) {
    const subIdx = (existingResult as any).subjects.findIndex((s: any) => s.subjectId.toString() === subjectId.toString());
    if (subIdx > -1) {
      (existingResult as any).subjects[subIdx] = subjectResult;
    } else {
      (existingResult as any).subjects.push(subjectResult);
    }
    
    // Re-calculate totals
    existingResult.totalMarksObtained = (existingResult as any).subjects.reduce((sum: number, s: any) => sum + s.marks, 0);
    existingResult.totalMaxMarks = (existingResult as any).subjects.reduce((sum: number, s: any) => sum + s.maxMarks, 0);
    existingResult.percentage = (existingResult.totalMarksObtained / existingResult.totalMaxMarks) * 100;
    existingResult.cgpa = calculateCGPA(
      (existingResult as any).subjects.map((s: any) => ({
        gradePoint: s.gradePoint,
        creditWeight: s.creditHours ?? 1,
      }))
    );
    existingResult.status = existingResult.subjects.every((s: any) => s.status === 'PASS') ? 'PASS' : 'FAIL';
    
    return await existingResult.save();
  } else {
    return await Result.create({
      type,
      examId,
      assignmentId,
      studentId,
      collegeId,
      courseId,
      batchId,
      subjects: [subjectResult],
      totalMarksObtained: marksObtained,
      totalMaxMarks: maxMarks,
      percentage: (marksObtained / maxMarks) * 100,
      cgpa: calculateCGPA([
        { gradePoint: subjectResult.gradePoint, creditWeight: subjectResult.creditHours },
      ]),
      status: subjectResult.status as any,
      publishedDate: new Date(),
      publishedBy
    });
  }
};

/**
 * Bulk sync for imported marks
 * Optimization: Performs individual updates for now to ensure complex subject-array logic is respected,
 * but wraps them in a way that respects the caller's context.
 * Future: Could be refactored to use aggregation-based bulk updates.
 */
export const syncBulkResults = async (records: any[]) => {
  const promises = records.map(record => syncSingleResult(record));
  return await Promise.all(promises);
};
