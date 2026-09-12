import { Request, Response } from "express";
import Parent from "../models/Parent.js";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Result from "../models/Result.js";
import Timetable from "../models/Timetable.js";
import FeeStructure from "../models/FeeStructure.js";
import Payment from "../models/Payment.js";
import Batch from "../models/Batch.js";
import { calculateStudentFee } from "../services/feeService.js";

/**
 * Get the parent profile and linked student(s)
 * GET /api/parent/me/student
 */
export const getMyStudentProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parent = await Parent.findOne({ userId: user._id }).populate({
      path: "students",
      populate: { path: "academicInfo.department" }
    });
    
    if (!parent || !parent.students.length) {
      return res.status(404).json({ success: false, message: "No linked students found" });
    }
    
    // For now, return the first child as the primary profile
    res.status(200).json({ success: true, data: parent.students[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get academic overview of all linked children
 */
export const getChildrenOverview = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parent = await Parent.findOne({ userId: user._id });
    
    if (!parent || !parent.students.length) {
      return res.status(404).json({ success: false, message: "No linked students found" });
    }

    const studentsData = await Promise.all(parent.students.map(async (studentId) => {
      const student = await Student.findById(studentId).populate("academicInfo.department");
      
      // Fetch latest 5 attendance records
      const attendance = await Attendance.find({ "records.studentId": studentId })
        .sort({ date: -1 })
        .limit(5)
        .populate("subjectId", "name");

      // Fetch latest results
      const results = await Result.find({ studentId })
        .sort({ publishedDate: -1 })
        .limit(3)
        .populate("examId", "name");

      return {
        student,
        attendance,
        results
      };
    }));

    res.status(200).json({ success: true, data: studentsData });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/parent/me/attendance
 */
export const getMyStudentAttendance = async (req: Request, res: Response) => {
  // Re-use logic or call attendanceController directly from a service
  // For now, we'll implement it here to ensure parent context is clean
  try {
     const user = (req as any).user;
     const parent = await Parent.findOne({ userId: user._id });
     if (!parent || !parent.students.length) throw new Error("No linked students");
     
     const studentId = parent.students[0];
     
     const attendance = await Attendance.find({ "records.studentId": studentId })
       .populate('subjectId', 'name')
       .sort({ date: -1 });

     const myRecords = attendance.map(day => {
       const myRecord = day.records.find(r => r.studentId.toString() === studentId.toString());
       return {
         date: day.date,
         subject: day.subjectId,
         status: myRecord?.status || 'Absent'
       };
     });

     const total = myRecords.length;
     const present = myRecords.filter(r => r.status === 'Present').length;
     const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

     res.status(200).json({ 
       success: true, 
       data: { percentage, totalClasses: total, presentClasses: present, records: myRecords } 
     });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/parent/me/results
 */
export const getMyStudentResults = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parent = await Parent.findOne({ userId: user._id });
    if (!parent || !parent.students.length) throw new Error("No linked students");

    const studentId = parent.students[0];
    const results = await Result.find({ studentId })
      .populate("examId", "name code totalMarks")
      .populate("assignmentId", "title maxMarks") // NEW
      .sort({ createdAt: -1 });

    const totalExams = results.length;
    const overallCgpa = totalExams > 0 
      ? parseFloat((results.reduce((acc, r) => acc + r.cgpa, 0) / totalExams).toFixed(2))
      : 0;

    res.status(200).json({ 
      success: true, 
      data: { overallCgpa, totalExams, results } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/parent/me/timetable
 */
export const getMyStudentTimetable = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parent = await Parent.findOne({ userId: user._id });
    if (!parent || !parent.students.length) throw new Error("No linked students");

    const studentId = parent.students[0];
    const student = await Student.findById(studentId);
    if (!student) throw new Error("Student profile not found");

    let batchId = student.batchId;
    const collegeId = student.collegeId;

    // FALLBACK: Lookup by name
    if (!batchId && student.academicInfo?.batch) {
       console.log(`[PARENT TIMETABLE FALLBACK] Resolving batch for student ${studentId} via name: ${student.academicInfo.batch}`);
       const resolvedBatch = await Batch.findOne({ name: student.academicInfo.batch, collegeId });
       if (resolvedBatch) batchId = resolvedBatch._id;
    }

    if (!batchId) {
      return res.status(400).json({ success: false, message: "Student is not assigned to a valid batch" });
    }

    console.log(`[DEBUG] Parent Timetable Fetch: studentId=${studentId}, batchId=${batchId}`);

    const query: any = { collegeId, batchId, isActive: true };
    if (student.academicInfo?.section) {
      query.section = student.academicInfo.section;
    }

    const timetable = await Timetable.find(query)
      .populate("subjectId", "name code")
      .populate("teacherId", "name email")
      .sort({ period: 1 });

    const grouped = timetable.reduce((acc: any, entry: any) => {
      const day = entry.dayOfWeek;
      if (!acc[day]) acc[day] = [];
      acc[day].push(entry);
      return acc;
    }, {});

    res.status(200).json({ success: true, data: grouped });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/parent/me/fees
 */
export const getMyStudentFees = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const parent = await Parent.findOne({ userId: user._id });
    if (!parent || !parent.students.length) throw new Error("No linked students");

    const studentId = String(parent.students[0]);
    const data = await calculateStudentFee(studentId, String(user.collegeId || ""));
    res.status(200).json({ success: true, data });

  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

