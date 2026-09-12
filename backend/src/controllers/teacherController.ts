// FILE: backend/src/controllers/teacherController.ts
import { Request, Response } from 'express';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import Attendance from '../models/Attendance.js';

/**
 * @desc    Get only the subjects this teacher is assigned to
 * @route   GET /api/teacher/subjects
 */
export const getAssignedSubjects = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { batchId } = req.query;

    const faculty = await Faculty.findOne({ userId: user._id, collegeId: user.collegeId })
      .populate('assignedSubjects.subjectId', 'name code creditHours courseId');

    if (!faculty) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Filter by batchId if provided
    let assignments = faculty.assignedSubjects;
    if (batchId) {
       const batchIdStr = batchId.toString();
       assignments = assignments.filter((a: any) => a.batchId?.toString() === batchIdStr);
    }

    // Deduplicate subjects
    const subjectMap = new Map<string, any>();
    assignments.forEach((a: any) => {
      const s = a.subjectId;
      if (s && !subjectMap.has(s._id.toString())) {
        subjectMap.set(s._id.toString(), s);
      }
    });

    res.status(200).json({ success: true, data: Array.from(subjectMap.values()) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get batches for a specific subject assigned to this teacher
 * @route   GET /api/teacher/batches?subjectId=X
 */
export const getAssignedBatches = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { subjectId } = req.query;

    const faculty = await Faculty.findOne({ userId: user._id, collegeId: user.collegeId })
      .populate('assignedSubjects.batchId', 'name year sections');

    if (!faculty) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Filter by subjectId if provided
    let batches = [];
    if (subjectId) {
      const subjectIdStr = subjectId.toString();
      batches = faculty.assignedSubjects
        .filter((a: any) => a.subjectId.toString() === subjectIdStr)
        .map((a: any) => a.batchId)
        .filter(Boolean);
    } else {
      // Get all unique batches
      batches = faculty.assignedSubjects.map((a: any) => a.batchId).filter(Boolean);
    }

    // Deduplicate batches

    // Deduplicate batches
    const batchMap = new Map<string, any>();
    batches.forEach((b: any) => {
      if (!batchMap.has(b._id.toString())) {
        batchMap.set(b._id.toString(), b);
      }
    });

    res.status(200).json({ success: true, data: Array.from(batchMap.values()) });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get aggregated dashboard stats for authenticated teacher
 * @route   GET /api/teacher/dashboard
 */
export const getTeacherDashboard = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const faculty = await Faculty.findOne({ userId: user._id, collegeId: user.collegeId })
      .populate('assignedSubjects.batchId', 'name students')
      .populate('assignedSubjects.subjectId', 'name');

    if (!faculty) {
      return res.status(200).json({ success: true, data: { totalStudents: 0, assignedBatches: 0, assignedSubjects: 0 } });
    }

    // Calculate Unique Students across all batches (Avoiding double counting)
    const uniqueStudentIds = new Set<string>();
    const batchSet = new Set<string>();
    
    faculty.assignedSubjects.forEach((a: any) => {
      if (a.batchId) {
        batchSet.add(a.batchId._id.toString());
        if (Array.isArray(a.batchId.students)) {
          a.batchId.students.forEach((sid: any) => uniqueStudentIds.add(sid.toString()));
        }
      }
    });

    // Today's attendance sessions marked
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCount = await Attendance.countDocuments({
      teacherId: user._id,
      date: { $gte: today }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUniqueStudents: uniqueStudentIds.size,
        assignedBatches: batchSet.size,
        assignedSubjects: faculty.assignedSubjects.length,
        todaySessionsMarked: todayCount,
        assignments: faculty.assignedSubjects.map((a: any) => ({
          subject: { 
            id: a.subjectId?._id || a.subjectId, 
            name: a.subjectId?.name || 'Unknown Subject' 
          },
          batch: { 
            id: a.batchId?._id || a.batchId, 
            name: a.batchId?.name || 'Unknown Batch' 
          }
        }))
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Debug assignments for current teacher
 * @route   GET /api/teacher/debug-assignments
 */
export const getDebugAssignments = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const faculty = await Faculty.findOne({ userId: user._id, collegeId: user.collegeId });
    
    if (!faculty) {
      return res.status(200).json({ 
        teacherId: user._id,
        role: user.role,
        facultyProfile: null,
        message: 'No faculty profile found for this user.'
      });
    }

    res.status(200).json({
      teacherId: user._id,
      collegeId: faculty.collegeId,
      assignedSubjectsCount: faculty.assignedSubjects?.length || 0,
      assignedSubjects: faculty.assignedSubjects.map((a: any) => ({
        subjectId: a.subjectId,
        batchId: a.batchId,
        subjectId_type: typeof a.subjectId,
        batchId_type: typeof a.batchId
      })),
      rawFaculty: faculty
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Legacy methods kept for compatibility if needed, but updated to use new scoping
export const getMyBatches = getAssignedBatches;
export const getMySubjects = getAssignedSubjects;
