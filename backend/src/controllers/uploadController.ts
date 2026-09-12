import { Request, Response } from 'express';
import Material from '../models/Material.js';
import Student from '../models/Student.js';
import Batch from '../models/Batch.js';
import Section from '../models/Section.js';

/**
 * @desc    Upload material (Handled by Multer middleware before reaching here)
 * @route   POST /api/teacher/upload
 * @access  Private (Teacher)
 */
export const uploadMaterial = async (req: Request, res: Response) => {
  try {
    const { title, description, type, classId, sectionId, subjectId, dueDate } = req.body;
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;
    const fileUrl = req.file?.path; // Provided by Cloudinary storage

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'File upload failed' });
    }

    if (sectionId) {
      const section = await Section.findOne({ _id: sectionId, batchId: classId, collegeId }).select('_id');
      if (!section) {
        return res.status(400).json({ success: false, message: 'Selected section does not belong to the chosen batch' });
      }
    }

    const material = await Material.create({
      teacherId,
      classId,
      sectionId: sectionId || undefined,
      subjectId,
      title,
      description,
      type,
      fileUrl,
      dueDate
    });

    // Trigger Notifications for students in the batch
    try {
      const { createAndEmitBulkNotifications } = await import ("../services/notificationService.js");
      const students = await Student.find({ batchId: classId, collegeId }).select("userId sectionId academicInfo.section");
      const sectionMatch = sectionId ? await Section.findOne({ _id: sectionId, batchId: classId, collegeId }).select('name _id') : null;
      const filteredStudents = sectionMatch?.name
        ? students.filter((student: any) => (
            String(student?.sectionId || '') === String(sectionMatch._id) ||
            String(student?.academicInfo?.section || '') === sectionMatch.name
          ))
        : students;
      const recipientUserIds = filteredStudents.map(s => s.userId.toString());

      if (recipientUserIds.length > 0) {
        await createAndEmitBulkNotifications(
          recipientUserIds.map(userId => ({ userId, role: "STUDENT" })),
          {
            title: `New Material: ${title}`,
            message: `Subject: ${subjectId ? 'Related Subject' : 'General'}. Check your materials section.`,
            type: "library",
            senderUserId: teacherId,
            collegeId,
            metadata: { materialId: material._id, type: "material" }
          },
          (prefix) => `${prefix}/academics/materials`
        );
      }
    } catch (notifErr) {
      console.log("[NOTIF] Failed to send material notifications:", notifErr);
    }

    res.status(201).json({ success: true, data: material });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    List teacher's uploaded materials
 * @route   GET /api/teacher/materials
 * @access  Private (Teacher)
 */
export const getMaterials = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user?._id;
    const { batchId, sectionId, subjectId } = req.query;
    const query: any = { teacherId };
    if (batchId) query.classId = batchId;
    if (sectionId) query.sectionId = sectionId;
    if (subjectId) query.subjectId = subjectId;

    const materials = await Material.find(query)
      .populate('subjectId', 'name')
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: materials });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete own material
 * @route   DELETE /api/teacher/materials/:id
 * @access  Private (Teacher)
 */
export const deleteMaterial = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teacherId = (req as any).user?._id;

    const material = await Material.findById(id);

    if (!material) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    if (material.teacherId.toString() !== teacherId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this material' });
    }

    // Note: Ideally also delete from Cloudinary here
    await material.deleteOne();

    res.status(200).json({ success: true, message: 'Material deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get materials for the current student
 * @route   GET /api/students/materials
 */
export const getStudentMaterials = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;

    const student = await Student.findOne({ userId, collegeId });
    if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });

    let batchId = student.batchId;

    // FALLBACK: Lookup by name
    if (!batchId && student.academicInfo?.batch) {
       const resolvedBatch = await Batch.findOne({ name: student.academicInfo.batch, collegeId });
       if (resolvedBatch) batchId = resolvedBatch._id;
    }

    if (!batchId) {
      return res.status(400).json({ success: false, message: "Student is not assigned to a valid batch" });
    }

    const sectionName = String(student.academicInfo?.section || '').trim();
    const sectionDoc = sectionName
      ? await Section.findOne({ collegeId, batchId, name: sectionName }).select('_id name')
      : null;

    const materialsQuery: any = { classId: batchId };
    if (sectionDoc?._id) {
      materialsQuery.$or = [
        { sectionId: sectionDoc._id },
        { sectionId: { $exists: false } },
        { sectionId: null }
      ];
    }

    const materials = await Material.find(materialsQuery)
      .populate('subjectId', 'name')
      .populate('teacherId', 'name')
      .populate('sectionId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: materials });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

