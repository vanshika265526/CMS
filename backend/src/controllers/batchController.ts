import { Request, Response } from 'express';
import Batch from '../models/Batch.js';
import { verifyCollegeOwnership } from '../middleware/collegeOwnership.js';

// @desc    Create a new batch
// @route   POST /api/batches
// @access  Private/Admin
export const createBatch = async (req: any, res: Response) => {
  try {
    console.log('[CREATE_BATCH] Body:', req.body);
    console.log('[CREATE_BATCH] User:', { id: req.user?._id, collegeId: req.user?.collegeId, role: req.user?.role });

    const { name, courseId, collegeId, startYear, endYear, currentSemester } = req.body;
    const role = String(req.user?.role || '').toUpperCase();
    
    // Ensure collegeId is provided (either from body or user context)
    const effectiveCollegeId = role === 'SUPER_ADMIN'
      ? (collegeId || req.user.collegeId)
      : req.user.collegeId;
    
    if (!effectiveCollegeId) {
      console.warn('[CREATE_BATCH] Missing College ID');
      return res.status(400).json({ message: 'College ID is required' });
    }

    const batch = await Batch.create({
      name,
      courseId,
      collegeId: effectiveCollegeId,
      startYear,
      endYear,
      currentSemester: currentSemester || 1
    });

    console.log('[CREATE_BATCH] Success:', batch._id);
    res.status(201).json(batch);
  } catch (error: any) {
    console.error('[CREATE_BATCH] Error:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all batches for a college or course
// @route   GET /api/batches
// @access  Private
export const getBatches = async (req: any, res: Response) => {
  try {
    const { collegeId, courseId } = req.query;
    const role = String(req.user?.role || '').toUpperCase();
    const effectiveCollegeId = role === 'SUPER_ADMIN'
      ? (collegeId || req.user.collegeId)
      : req.user.collegeId;
    
    const query: any = {};
    if (effectiveCollegeId) query.collegeId = effectiveCollegeId;
    if (courseId) query.courseId = courseId;
    
    const batches = await Batch.find(query).populate('courseId', 'name');
    res.json(batches);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single batch by ID
// @route   GET /api/batches/:id
// @access  Private
export const getBatchById = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const role = String(user?.role || '').toUpperCase();
    const scopedCollegeId = role === 'SUPER_ADMIN' ? ((req.query.collegeId as string) || user?.collegeId) : user?.collegeId;

    const batch = await Batch.findById(req.params.id).populate('courseId');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    if (!verifyCollegeOwnership(batch, scopedCollegeId)) {
      return res.status(403).json({ message: 'Forbidden: Batch does not belong to your college' });
    }
    res.json(batch);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
