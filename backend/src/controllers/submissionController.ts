import { Request, Response } from 'express';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Assignment from '../models/Assignment.js';
import Result from '../models/Result.js';
import Student from '../models/Student.js';
import mongoose from 'mongoose';

/**
 * @desc    Submit an assignment (Handles versioning)
 * @route   POST /api/submissions
 * @access  Private (Student)
 */
export const submitAssignment = async (req: Request, res: Response) => {
  try {
    const { assignmentId, fileUrl, fileName, textSubmission } = req.body;
    const user = (req as any).user;

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const isLate = new Date() > new Date(assignment.dueDate);
    const status = isLate ? 'LATE' : 'SUBMITTED';

    let submission = await AssignmentSubmission.findOne({ 
      assignmentId, 
      studentId: user._id 
    });

    if (submission) {
      // Versioning: Add new version
      submission.versions.push({
        fileUrl,
        fileName,
        textSubmission,
        submittedAt: new Date()
      });
      submission.currentVersionIndex = submission.versions.length - 1;
      submission.status = status; // Re-evaluate late status for the latest submission
    } else {
      // First submission
      submission = new AssignmentSubmission({
        assignmentId,
        studentId: user._id,
        collegeId: user.collegeId,
        versions: [{
          fileUrl,
          fileName,
          textSubmission,
          submittedAt: new Date()
        }],
        currentVersionIndex: 0,
        status
      });
    }

    await submission.save();

    // Notify teacher
    try {
      const { createAndEmitNotification } = await import('../services/notificationService.js');
      await createAndEmitNotification({
        title: `Submission: ${assignment.title}`,
        message: `Student ${user.name} submitted an assignment.`,
        type: 'personal',
        recipientUserId: assignment.teacherId,
        senderUserId: user._id,
        collegeId: user.collegeId,
        metadata: { submissionId: submission._id, type: 'assignment_submission' },
        actionUrl: `/teacher/assignments/${assignment._id}/submissions`
      });
    } catch (notifErr) {
      console.error("[NOTIF] Failed to notify teacher:", notifErr);
    }

    res.status(201).json({ success: true, data: submission });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all submissions for a specific assignment
 * @route   GET /api/assignments/:id/submissions
 * @access  Private (Teacher)
 */
export const getAssignmentSubmissions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    const submissions = await AssignmentSubmission.find({ assignmentId: id })
      .populate('studentId', 'name email profilePicture')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Grade a submission (Idempotent Sync to Result)
 * @route   PATCH /api/submissions/:id/grade
 * @access  Private (Teacher)
 */
export const gradeSubmission = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { marks, feedback } = req.body;
    const user = (req as any).user;

    const submission = await AssignmentSubmission.findById(id).populate('assignmentId');
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const assignment = submission.assignmentId as any;

    if (assignment.teacherId.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to grade this assignment' });
    }

    // Update Submission Status
    submission.marks = marks;
    submission.feedback = feedback;
    submission.status = 'GRADED';
    submission.gradedBy = user._id;
    submission.gradedAt = new Date();
    await submission.save({ session });

    // Idempotent sync to Result Collection
    const student = await Student.findOne({ userId: submission.studentId }).session(session);
    
    if (student && student.batchId) {
      // Get courseId from Batch
      const batch = await mongoose.model('Batch').findById(student.batchId).session(session);
      if (!batch) throw new Error('Student batch not found');

      const percentage = (marks / assignment.maxMarks) * 100;
      let grade = 'F';
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 80) grade = 'A';
      else if (percentage >= 70) grade = 'B';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';

      // Upsert into Result
      await Result.findOneAndUpdate(
        { 
          type: 'ASSIGNMENT', 
          assignmentId: assignment._id, 
          studentId: submission.studentId 
        },
        {
          type: 'ASSIGNMENT',
          assignmentId: assignment._id,
          studentId: submission.studentId,
          courseId: (batch as any).courseId,
          batchId: student.batchId,
          subjects: [{
            subjectId: assignment.subjectId,
            subjectName: 'Assignment: ' + assignment.title,
            marks,
            maxMarks: assignment.maxMarks,
            grade,
            gradePoint: percentage / 10,
            status: percentage >= 50 ? 'PASS' : 'FAIL'
          }],
          totalMarksObtained: marks,
          totalMaxMarks: assignment.maxMarks,
          percentage,
          cgpa: percentage / 10,
          status: percentage >= 50 ? 'PASS' : 'FAIL',
          publishedDate: new Date(),
          publishedBy: user._id
        },
        { 
          upsert: true, 
          new: true, 
          session 
        }
      );
    }

    await session.commitTransaction();

    // Signal real-time via notifications
    try {
      const { createAndEmitNotification } = await import('../services/notificationService.js');
      await createAndEmitNotification({
        title: `Graded: ${assignment.title}`,
        message: `Your assignment has been graded. Marks: ${marks}/${assignment.maxMarks}`,
        type: 'personal',
        recipientUserId: submission.studentId,
        senderUserId: user._id,
        collegeId: user.collegeId,
        metadata: { assignmentId: assignment._id, type: 'assignment_graded' },
        actionUrl: `/student/assignments`
      });
    } catch (notifErr) {
      console.error("[NOTIF] Failed to notify student about grade:", notifErr);
    }

    res.status(200).json({ success: true, data: submission });
  } catch (error: any) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get my submissions
 * @route   GET /api/submissions/my
 * @access  Private (Student)
 */
export const getMySubmissions = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const submissions = await AssignmentSubmission.find({ studentId: user._id })
      .populate('assignmentId', 'title subjectId dueDate maxMarks')
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: submissions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
