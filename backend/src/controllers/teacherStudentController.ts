import { Request, Response } from 'express';
import Student from '../models/Student.js';
import User from '../models/User.js';
import Message from '../models/Message.js';
import mongoose from 'mongoose';

/**
 * @desc    List students in teacher's classes
 * @route   GET /api/teacher/students
 * @access  Private (Teacher)
 */
export const getMyStudents = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const userId = user?._id;
    const collegeId = user?.collegeId;
    
    const query: any = { collegeId };
    
    if (req.query.batchId) {
      const batchId = req.query.batchId as string;
      // Robust lookup: check both batchId (ObjectId) and academicInfo.batch (string)
      if (mongoose.Types.ObjectId.isValid(batchId)) {
        query.$or = [
          { batchId: batchId },
          { "academicInfo.batch": { $regex: new RegExp(batchId, 'i') } }
        ];
      } else {
        query["academicInfo.batch"] = batchId;
      }
    }
    
    if (req.query.section) {
      query['academicInfo.section'] = req.query.section;
    }
    
    // Fetch students
    const students = await Student.find(query)
      .select('personalInfo academicInfo parentInfo uniqueStudentId batchId')
      .populate('userId', 'email isActive');

    // Get unread counts for each student sender to this teacher
    const unreadCounts = await Message.aggregate([
      { 
        $match: { 
          receiverId: new mongoose.Types.ObjectId(userId), 
          isRead: false 
        } 
      },
      { 
        $group: { 
          _id: "$senderId", 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const unreadMap: Record<string, number> = {};
    unreadCounts.forEach(item => {
      unreadMap[item._id.toString()] = item.count;
    });

    const enrichedStudents = students.map(student => {
      const studentUserId = (student.userId as any)?._id;
      return {
        ...student.toObject(),
        unreadCount: studentUserId ? (unreadMap[studentUserId.toString()] || 0) : 0
      };
    });

    res.status(200).json({ success: true, data: enrichedStudents });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get limited student profile
 * @route   GET /api/teacher/students/:studentId
 * @access  Private (Teacher)
 */
export const getStudentProfile = async (req: Request, res: Response) => {
  try {
    const rawStudentId = req.params.studentId;
    const studentId = Array.isArray(rawStudentId) ? rawStudentId[0] : rawStudentId;
    const user = (req as any).user;

    // Strict field selection to strip sensitive info
    const query: any = { collegeId: user?.collegeId };
    if (mongoose.Types.ObjectId.isValid(studentId)) {
      query.$or = [{ _id: studentId }, { uniqueStudentId: studentId }];
    } else {
      query.uniqueStudentId = studentId;
    }

    const student = await Student.findOne(query)
      .select('personalInfo academicInfo academicHistory parentInfo documents uniqueStudentId enrollmentId studentId batchId')
      .populate('userId', 'email name')
      .populate('batchId', 'name startYear endYear status')
      .populate('academicInfo.department', 'name');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
