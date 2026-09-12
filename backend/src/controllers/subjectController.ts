import { Request, Response } from 'express';
import Subject from '../models/Subject.js';

export const getSubjects = async (req: any, res: Response) => {
  try {
    const collegeId = req.query.collegeId || req.user.collegeId;
    const { courseId } = req.query;
    
    let query: any = {};
    if (collegeId) query.collegeId = collegeId;
    if (courseId) query.courseId = courseId;
    
    const subjects = await Subject.find(query);
    res.json({ success: true, data: subjects });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createSubject = async (req: any, res: Response) => {
  try {
    const { name, code, courseId, credits, collegeId } = req.body;
    const effectiveCollegeId = collegeId || req.user.collegeId;
    
    if (!effectiveCollegeId) {
      return res.status(400).json({ success: false, message: 'College ID is required' });
    }

    const subject = await Subject.create({
      name,
      code: code || `SUB-${Math.floor(Math.random() * 1000)}`,
      courseId,
      credits: credits || 3,
      collegeId: effectiveCollegeId
    });

    res.status(201).json({ success: true, data: subject });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
