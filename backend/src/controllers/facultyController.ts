import { Request, Response } from "express";
import Faculty from "../models/Faculty.js";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";

export const getFaculties = async (req: Request, res: Response) => {
  try {
    const { department, status, search } = req.query;
    const collegeId = (req as any).user.collegeId;
    let query: any = { collegeId };

    if (department) query["department"] = department;
    if (status) query["status"] = status;
    if (search) {
      query["$or"] = [
        { "personalInfo.name": { $regex: search, $options: "i" } },
        { "employeeId": { $regex: search, $options: "i" } },
        { "personalInfo.email": { $regex: search, $options: "i" } }
      ];
    }

    const faculties = await Faculty.find(query)
      .populate("userId", "name email role")
      .populate("assignedSubjects.subjectId", "name code creditHours")
      .populate("assignedSubjects.batchId", "name")
      .sort({ employeeId: 1 });

    res.status(200).json({ success: true, data: faculties });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFacultyById = async (req: Request, res: Response) => {
  try {
    const faculty = await Faculty.findById(req.params.id)
      .populate("userId")
      .populate("assignedSubjects.subjectId", "name code creditHours")
      .populate("assignedSubjects.batchId", "name");
    
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });
    res.status(200).json({ success: true, data: faculty });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFaculty = async (req: Request, res: Response) => {
  try {
    const { personalInfo, qualification, experience, department, designation, joiningDate, collegeId } = req.body;
    const adminUser = (req as any).user;

    // Use provided collegeId or fallback to admin's collegeId
    const finalCollegeId = collegeId || adminUser?.collegeId;

    if (!finalCollegeId) {
      return res.status(400).json({ success: false, message: 'collegeId is required.' });
    }

    // 1. Create User
    const existingUser = await User.findOne({ email: personalInfo.email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    const employeeId = "EMP-" + Date.now().toString().slice(-6); 
    const user = new User({
      name: personalInfo.name,
      email: personalInfo.email,
      password: "Welcome@Faculty", // Should be changed on first login
      role: "TEACHER",
      collegeId: finalCollegeId,
      mustChangePassword: true,
    });
    await user.save();

    // 2. Create Faculty Profile
    const faculty = new Faculty({
      userId: user._id,
      collegeId: finalCollegeId,
      employeeId,
      personalInfo,
      qualification,
      experience,
      department,
      designation,
      joiningDate: joiningDate || new Date(),
      status: "Active"
    });
    await faculty.save();

    res.status(201).json({ success: true, data: faculty });
  } catch (error: any) {
    console.error('[CREATE_FACULTY]', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFaculty = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user.collegeId;
    const faculty = await Faculty.findOneAndUpdate({ _id: req.params.id, collegeId }, req.body, { new: true });
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });
    res.status(200).json({ success: true, data: faculty });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const softDeleteFaculty = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user.collegeId;
    const faculty = await Faculty.findOneAndUpdate({ _id: req.params.id, collegeId }, { status: "Resigned" }, { new: true });
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });
    res.status(200).json({ success: true, data: faculty, message: "Faculty marked as Resigned" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const assignSubjects = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { subjectIds } = req.body;
    const collegeId = (req as any).user.collegeId;
    const faculty = await Faculty.findOneAndUpdate({ _id: id, collegeId }, { assignedSubjects: subjectIds }, { new: true });
    if (!faculty) return res.status(404).json({ success: false, message: "Faculty not found" });
    res.status(200).json({ success: true, data: faculty });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};
export const getFacultyAttendanceStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const collegeId = (req as any).user.collegeId;

    const faculty = await Faculty.findOne({ _id: id, collegeId });
    if (!faculty) {
      return res.status(404).json({ success: false, message: "Faculty profile not found" });
    }

    const stats = await Attendance.aggregate([
      { $match: { teacherId: faculty.userId, isRectified: true } },
      {
        $project: {
          date: 1,
          lecture: 1,
          classId: 1,
          subjectId: 1,
          rectificationCount: { $size: "$rectificationLogs" },
          lastRectifiedAt: { $arrayElemAt: ["$rectificationLogs.modifiedAt", -1] }
        }
      },
      { $sort: { date: -1 } }
    ]);

    const populatedStats = await Attendance.populate(stats, [
      { path: 'classId', select: 'name' },
      { path: 'subjectId', select: 'name code' }
    ]);

    res.status(200).json({ 
      success: true, 
      data: {
        totalRectifications: populatedStats.length,
        history: populatedStats
      } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
