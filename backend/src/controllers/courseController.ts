import { Request, Response } from 'express';
import Course from '../models/Course.js';

// @desc    Create a new course
// @route   POST /api/courses
// @access  Private/Admin
export const createCourse = async (req: any, res: Response) => {
  try {
    const { name, code, description, duration, collegeId } = req.body;
    
    // Ensure collegeId is provided (either from body or user context)
    const effectiveCollegeId = collegeId || req.user.collegeId;
    
    if (!effectiveCollegeId) {
      return res.status(400).json({ message: 'College ID is required' });
    }

    const course = await Course.create({
      name,
      code,
      description,
      duration,
      collegeId: effectiveCollegeId
    });

    res.status(201).json(course);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all courses for a college
// @route   GET /api/courses
// @access  Private
export const getCourses = async (req: any, res: Response) => {
  try {
    const collegeId = req.query.collegeId || req.user.collegeId;
    const query = collegeId ? { collegeId } : {};
    
    const courses = await Course.find(query);
    res.json(courses);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single course by ID
// @route   GET /api/courses/:id
// @access  Private
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    res.json(course);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
