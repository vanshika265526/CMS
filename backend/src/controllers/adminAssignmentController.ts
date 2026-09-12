// FILE: backend/src/controllers/adminAssignmentController.ts
import { Request, Response } from 'express';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Subject from '../models/Subject.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { verifyCollegeOwnership } from '../middleware/collegeOwnership.js';

/**
 * @desc    Assign a teacher to a subject within a batch
 * @route   POST /api/admin/assign-teacher
 * @access  COLLEGE_ADMIN, SUPER_ADMIN
 */
export const assignTeacher = async (req: Request, res: Response) => {
  try {
    const { teacherId, subjectId, batchId } = req.body;
    const adminUser = (req as any).user;
    const isSuperAdmin = String(adminUser?.role || '').toUpperCase() === 'SUPER_ADMIN';

    if (!teacherId || !subjectId || !batchId) {
      return res.status(400).json({ success: false, message: 'teacherId, subjectId, and batchId are required' });
    }

    // Validate referenced documents exist
    const [teacherUser, subject, batch] = await Promise.all([
      User.findById(teacherId),
      Subject.findById(subjectId),
      Batch.findById(batchId)
    ]);

    if (!teacherUser || teacherUser.role !== 'TEACHER') {
      return res.status(404).json({ success: false, message: 'Teacher user not found or invalid role' });
    }
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!isSuperAdmin) {
      if (!verifyCollegeOwnership(teacherUser as any, adminUser?.collegeId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Teacher does not belong to your college' });
      }
      if (!verifyCollegeOwnership(subject as any, adminUser?.collegeId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Subject does not belong to your college' });
      }
      if (!verifyCollegeOwnership(batch as any, adminUser?.collegeId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
      }
    } else {
      if (String(teacherUser.collegeId || '') !== String(batch.collegeId || '') || String(subject.collegeId || '') !== String(batch.collegeId || '')) {
        return res.status(400).json({ success: false, message: 'Teacher, subject, and batch must belong to the same college' });
      }
    }

    // Find or create Faculty profile for this teacher
    let faculty = await Faculty.findOne({ userId: teacherId });
    if (!faculty) {
      const empId = `EMP${Date.now().toString().slice(-6)}`;
      faculty = await Faculty.create({
        userId: teacherId,
        collegeId: adminUser.collegeId || teacherUser.collegeId,
        employeeId: empId,
        personalInfo: { name: teacherUser.name, email: teacherUser.email },
        assignedSubjects: []
      });
    }

    // Check if this assignment already exists
    const alreadyAssigned = faculty.assignedSubjects.some(
      (a: any) => a.subjectId.toString() === subjectId && a.batchId.toString() === batchId
    );

    if (alreadyAssigned) {
      return res.status(200).json({ success: true, message: 'Teacher already assigned to this subject/batch', data: faculty });
    }

    // Push the new assignment
    faculty.assignedSubjects.push({ subjectId: new mongoose.Types.ObjectId(subjectId), batchId: new mongoose.Types.ObjectId(batchId) } as any);
    await faculty.save();

    res.status(200).json({
      success: true,
      message: `${teacherUser.name} assigned to ${subject.name} in ${batch.name}`,
      data: faculty
    });
  } catch (error: any) {
    console.error('[ASSIGN_TEACHER]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Assign a student to a batch
 * @route   POST /api/admin/assign-student-batch
 * @access  COLLEGE_ADMIN, SUPER_ADMIN
 */
export const assignStudentToBatch = async (req: Request, res: Response) => {
  try {
    const { studentId, batchId } = req.body;
    const adminUser = (req as any).user;
    const isSuperAdmin = String(adminUser?.role || '').toUpperCase() === 'SUPER_ADMIN';

    if (!studentId || !batchId) {
      return res.status(400).json({ success: false, message: 'studentId and batchId are required' });
    }

    const [student, batch] = await Promise.all([
      Student.findById(studentId),
      Batch.findById(batchId)
    ]);

    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!isSuperAdmin) {
      if (!verifyCollegeOwnership(student as any, adminUser?.collegeId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Student does not belong to your college' });
      }
      if (!verifyCollegeOwnership(batch as any, adminUser?.collegeId)) {
        return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
      }
    } else if (String(student.collegeId || '') !== String(batch.collegeId || '')) {
      return res.status(400).json({ success: false, message: 'Student and batch must belong to the same college' });
    }

    const studentObjectId = new mongoose.Types.ObjectId(String(studentId));

    // Remove student from any previous batch rosters in the same college scope.
    await Batch.updateMany(
      {
        ...(isSuperAdmin ? { collegeId: batch.collegeId } : { collegeId: adminUser?.collegeId }),
        students: studentObjectId,
        _id: { $ne: batch._id }
      },
      { $pull: { students: studentObjectId } }
    );

    // Update student's top-level batchId.
    await Student.findOneAndUpdate(
      { _id: studentId, ...(isSuperAdmin ? {} : { collegeId: adminUser?.collegeId }) },
      { batchId, collegeId: batch.collegeId }
    );

    // Add to target batch roster only once.
    await Batch.updateOne(
      { _id: batch._id },
      { $addToSet: { students: studentObjectId } }
    );

    res.status(200).json({
      success: true,
      message: `Student assigned to ${batch.name}`,
      data: { studentId, batchId }
    });
  } catch (error: any) {
    console.error('[ASSIGN_STUDENT_BATCH]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Remove a teacher assignment
 * @route   DELETE /api/admin/assign-teacher
 */
export const removeTeacherAssignment = async (req: Request, res: Response) => {
  try {
    const { teacherId, subjectId, batchId } = req.body;
    const adminUser = (req as any).user;
    const isSuperAdmin = String(adminUser?.role || '').toUpperCase() === 'SUPER_ADMIN';

    const faculty = await Faculty.findOne({ userId: teacherId, ...(isSuperAdmin ? {} : { collegeId: adminUser?.collegeId }) });
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty profile not found' });

    if (subjectId || batchId) {
      const hasMatchingAssignment = faculty.assignedSubjects.some(
        (assignment: any) =>
          (!subjectId || String(assignment.subjectId) === String(subjectId)) &&
          (!batchId || String(assignment.batchId) === String(batchId))
      );
      if (!hasMatchingAssignment) {
        return res.status(403).json({ success: false, message: 'Forbidden: Assignment does not belong to your college context' });
      }
    }

    faculty.assignedSubjects = faculty.assignedSubjects.filter(
      (a: any) => !(a.subjectId.toString() === subjectId && a.batchId.toString() === batchId)
    ) as any;
    await faculty.save();

    res.status(200).json({ success: true, message: 'Assignment removed', data: faculty });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all teacher assignments (for admin view)
 * @route   GET /api/admin/assignments
 */
export const getAssignments = async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).user;
    const query: any = {};
    if (adminUser.collegeId) query.collegeId = adminUser.collegeId;

    const faculties = await Faculty.find(query)
      .populate('userId', 'name email')
      .populate('assignedSubjects.subjectId', 'name code')
      .populate('assignedSubjects.batchId', 'name year');

    // Flatten to a readable list
    const assignments: any[] = [];
    faculties.forEach(f => {
      const teacher = f.userId as any;
      f.assignedSubjects.forEach((a: any) => {
        assignments.push({
          facultyId: f._id,
          teacherId: teacher?._id,
          teacherName: teacher?.name,
          teacherEmail: teacher?.email,
          subjectId: a.subjectId?._id,
          subjectName: a.subjectId?.name,
          subjectCode: a.subjectId?.code,
          batchId: a.batchId?._id,
          batchName: a.batchId?.name
        });
      });
    });

    res.status(200).json({ success: true, data: assignments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Bulk assign multiple students to a batch
 * @route   POST /api/admin/bulk-assign-students-batch
 * @access  COLLEGE_ADMIN, SUPER_ADMIN
 */
export const bulkAssignStudentsToBatch = async (req: Request, res: Response) => {
  try {
    const { studentIds, batchId } = req.body;
    const adminUser = (req as any).user;
    const isSuperAdmin = String(adminUser?.role || '').toUpperCase() === 'SUPER_ADMIN';

    if (!Array.isArray(studentIds) || studentIds.length === 0 || !batchId) {
      return res.status(400).json({ success: false, message: 'studentIds array and batchId are required' });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    if (!isSuperAdmin && !verifyCollegeOwnership(batch as any, adminUser?.collegeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Batch does not belong to your college' });
    }

    const students = await Student.find({
      _id: { $in: studentIds },
      ...(isSuperAdmin ? { collegeId: batch.collegeId } : { collegeId: adminUser?.collegeId })
    }).select('_id');
    if (students.length !== studentIds.length) {
      return res.status(403).json({ success: false, message: 'One or more students do not belong to the target college scope' });
    }

    // Explicit check: fail if any student is already in THIS batch.
    const existingStudentIds = new Set(batch.students.map((s: any) => s.toString()));
    const duplicates = studentIds.filter((id: string) => existingStudentIds.has(id.toString()));
    
    if (duplicates.length > 0) {
      return res.status(400).json({ success: false, message: 'One or more selected students are already assigned to this batch.' });
    }

    const studentObjectIds = studentIds.map((id: string) => new mongoose.Types.ObjectId(String(id)));

    // Remove students from any previous batch rosters within same college scope.
    await Batch.updateMany(
      {
        ...(isSuperAdmin ? { collegeId: batch.collegeId } : { collegeId: adminUser?.collegeId }),
        students: { $in: studentObjectIds },
        _id: { $ne: batch._id }
      },
      { $pull: { students: { $in: studentObjectIds } } }
    );

    // Update students' top-level batchId.
    await Student.updateMany(
      { _id: { $in: studentIds }, ...(isSuperAdmin ? { collegeId: batch.collegeId } : { collegeId: adminUser?.collegeId }) },
      { $set: { batchId: batchId, collegeId: batch.collegeId } }
    );

    // Add students to target batch roster uniquely.
    await Batch.updateOne(
      { _id: batch._id },
      { $addToSet: { students: { $each: studentObjectIds } } }
    );

    res.status(200).json({
      success: true,
      message: `Successfully assigned ${studentIds.length} students to ${batch.name}`,
      data: { assignedCount: studentIds.length, batchId }
    });
  } catch (error: any) {
    console.error('[BULK_ASSIGN_STUDENT_BATCH]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
