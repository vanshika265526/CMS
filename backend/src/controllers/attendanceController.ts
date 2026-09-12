// FILE: backend/src/controllers/attendanceController.ts
import { Request, Response } from 'express';
import Attendance from '../models/Attendance.js';
import Faculty from '../models/Faculty.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import Timetable from '../models/Timetable.js';
import mongoose from 'mongoose';
import { emitToBatch } from '../config/socket.js';

/**
 * @desc    Mark attendance for a class (Legacy)
 */
export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { classId, subjectId, date, records } = req.body;
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;

    const existingDate = new Date(date);
    existingDate.setHours(0, 0, 0, 0);

    const attendance = await Attendance.create({
      teacherId,
      collegeId,
      classId,
      subjectId,
      date: existingDate,
      records
    });

    res.status(201).json({ success: true, data: attendance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Mark attendance in bulk (Modern)
 * @route   POST /api/attendance/bulk
 */
export const markBulkAttendance = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { batchId, subjectId, date, lecture, records, section } = req.body;

    if (!lecture) {
      return res.status(400).json({ success: false, message: 'Lecture number is required.' });
    }

    if (!user?._id || user.role !== "TEACHER") {
      return res.status(403).json({ success: false, message: 'Only teachers can mark attendance.' });
    }
    const teacherId = user._id;

    const faculty = await Faculty.findOne({ userId: user._id, collegeId: user.collegeId });
    const normalizedSubjectId = subjectId?.toString().trim();
    const normalizedBatchId = batchId?.toString().trim();

    let isAuthorized = false;

    // Check 1: Faculty assignedSubjects
    if (faculty && faculty.assignedSubjects?.length) {
      isAuthorized = faculty.assignedSubjects.some((a: any) => {
        const sId = (a.subjectId?._id || a.subjectId)?.toString().trim();
        const bId = (a.batchId?._id || a.batchId)?.toString().trim();
        return sId === normalizedSubjectId && bId === normalizedBatchId;
      });
    }

    // Check 2: Timetable fallback (Dynamic assignment - fixes 403 errors when Faculty Profile is out of sync)
    if (!isAuthorized) {
      try {
        // Build a flexible query — match on teacher + subject + batch, section optional
        // Using new mongoose.Types.ObjectId for safe comparison with DB stored IDs
        const timetableQuery: any = {
          teacherId: new mongoose.Types.ObjectId(user._id.toString()),
          isActive: true
        };

        if (user.collegeId) {
          timetableQuery.collegeId = new mongoose.Types.ObjectId(user.collegeId.toString());
        }

        if (normalizedBatchId && mongoose.Types.ObjectId.isValid(normalizedBatchId)) {
          timetableQuery.batchId = new mongoose.Types.ObjectId(normalizedBatchId);
        }
        if (normalizedSubjectId && mongoose.Types.ObjectId.isValid(normalizedSubjectId)) {
          timetableQuery.subjectId = new mongoose.Types.ObjectId(normalizedSubjectId);
        }
        
        // If a specific section is provided, match it exactly.
        if (section && section !== 'General') {
          timetableQuery.section = section;
        }

        console.log(`[ATTENDANCE][AUTH] Timetable query:`, JSON.stringify(timetableQuery));

        const timetableEntry = await Timetable.findOne(timetableQuery);

        if (timetableEntry) {
          console.log(`[ATTENDANCE][AUTH] Authorized via Timetable for Teacher: ${user._id}`);
          isAuthorized = true;
        } else {
          // Debug: show what timetable entries exist for this teacher
          const allEntries = await Timetable.find({ 
            teacherId: new mongoose.Types.ObjectId(user._id.toString()), 
            isActive: true 
          })
          .select('batchId subjectId section collegeId dayOfWeek period')
          .lean();
          console.warn(`[ATTENDANCE][DEBUG] Teacher's timetable entries:`, JSON.stringify(allEntries));
        }
      } catch (err: any) {
        console.error(`[ATTENDANCE][ERROR] Timetable auth check failed:`, err.message);
      }
    }

    if (!isAuthorized) {
      console.warn("[ATTENDANCE][DENY] Authorization failed for Teacher:", user._id, "Provided:", { s: normalizedSubjectId, b: normalizedBatchId, sec: section || 'None' });
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to this subject/batch/section in your Faculty Profile or Timetable.'
      });
    }

    const sessionDate = new Date(date);
    if (isNaN(sessionDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid date provided.' });
    }
    sessionDate.setHours(0, 0, 0, 0);

    const serverToday = new Date();
    serverToday.setHours(0, 0, 0, 0);
    if (sessionDate.getTime() !== serverToday.getTime()) {
      return res.status(400).json({
        success: false,
        message: "Attendance can only be marked for today's classes"
      });
    }

    const existingAttendance = await Attendance.findOne({ 
       classId: batchId, subjectId, date: sessionDate, lecture, section: section || 'General'
    });

    let updateQuery: any = { teacherId, records, section: section || 'General' };

    // Stamp the college so college-scoped reports (admin overview/ledger) include this record.
    if (user.collegeId) {
      updateQuery.collegeId = user.collegeId;
    }

    if (existingAttendance) {
       const twentyFourHours = 24 * 60 * 60 * 1000;
       if (Date.now() - new Date(existingAttendance.createdAt).getTime() > twentyFourHours) {
          return res.status(403).json({ success: false, message: 'Editing is disabled. The 24-hour modification window for this lecture has expired.' });
       }

       const oldRecordsStr = JSON.stringify(existingAttendance.records.map((r: any) => ({ studentId: r.studentId.toString(), status: r.status })));
       const newRecordsStr = JSON.stringify(records.map((r: any) => ({ studentId: r.studentId.toString(), status: r.status })));

       if (oldRecordsStr !== newRecordsStr) {
         updateQuery.isRectified = true;
         updateQuery.$push = {
           rectificationLogs: {
             modifiedBy: teacherId,
             modifiedAt: new Date(),
             previousRecords: existingAttendance.records
           }
         };
       }
    }

    const attendance = await Attendance.findOneAndUpdate(
      { classId: batchId, subjectId, date: sessionDate, lecture, section: section || 'General' },
      updateQuery,
      { upsert: true, new: true }
    );

    emitToBatch(batchId, "attendanceUpdated", { 
      batchId, 
      subjectId, 
      date: sessionDate,
      count: records.length 
    });

    res.status(200).json({ success: true, data: attendance });
  } catch (error: any) {
    if (error.code === 11000) {
      const sessionDate = new Date(req.body.date);
      sessionDate.setHours(0, 0, 0, 0);
      const existing = await Attendance.findOne({ 
        classId: req.body.batchId, 
        subjectId: req.body.subjectId, 
        date: sessionDate,
        lecture: req.body.lecture,
        section: req.body.section || 'General'
      });
      return res.status(200).json({ success: true, data: existing, message: "Handled duplicate entry" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get attendance records
 */
export const getAttendance = async (req: Request, res: Response) => {
  try {
    const { batchId, subjectId, date, lecture, section } = req.query;
    const collegeId = (req as any).user?.collegeId;
    
    if (!collegeId) return res.status(401).json({ success: false, message: 'Unauthorized: collegeId required' });
    
    const query: any = { collegeId };
    if (batchId) query.classId = batchId;
    if (subjectId) query.subjectId = subjectId;
    if (lecture) query.lecture = Number(lecture);
    
    // Crucial: Map 'section' correctly to Attendance records
    if (section && section !== 'General') {
       query.section = section;
    } else {
       // If no section or 'General', we match either 'General' or non-existent section field
       query.$or = [{ section: 'General' }, { section: { $exists: false } }];
    }
    if (date) {
      const d = new Date(date as string);
      d.setHours(0, 0, 0, 0);
      query.date = d;
    }

    const attendance = await Attendance.find(query)
      .populate('records.studentId', 'personalInfo academicInfo')
      .sort({ date: -1 });

    res.status(200).json({ success: true, data: attendance });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClassAttendance = async (req: Request, res: Response) => {
  return getAttendance(req, res);
};

/**
 * @desc    Get attendance stats for a batch
 */
export const getAttendanceStats = async (req: Request, res: Response) => {
  try {
    const { batchId } = req.params;
    const collegeId = (req as any).user?.collegeId;
    
    if (!collegeId) return res.status(401).json({ success: false, message: 'Unauthorized: collegeId required' });
    
    const stats = await Attendance.aggregate([
      { $match: { classId: new mongoose.Types.ObjectId(batchId as string), collegeId: new mongoose.Types.ObjectId(collegeId) } },
      { $unwind: "$records" },
      {
        $group: {
          _id: "$records.studentId",
          present: { $sum: { $cond: [{ $eq: ["$records.status", "Present"] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);
    res.status(200).json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get dashboard stats
 */
export const getHubStats = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    
    if (!collegeId) return res.status(401).json({ success: false, message: 'Unauthorized: collegeId required' });
    
    const totalRecords = await Attendance.countDocuments({ collegeId });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayRecords = await Attendance.countDocuments({ date: today, collegeId });

    res.status(200).json({ 
      success: true, 
      data: { totalRecords, todayRecords } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get today's schedule (Placeholders)
 */
export const getTodaySchedule = async (req: Request, res: Response) => {
  res.status(200).json({ success: true, data: [], message: "Schedule feature coming soon" });
};

export const getMonthlyReport = async (req: Request, res: Response) => {
  // Simple implementation to satisfy routes
  res.status(200).json({ success: true, data: [] });
};

export const getShortageAlerts = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;
    if (!teacherId) return res.status(401).json({ success: false, message: "Unauthorized" });
    if (!collegeId) return res.status(401).json({ success: false, message: 'Unauthorized: collegeId required' });

    // Aggregate attendance marked by this teacher or for this teacher's classes.
    // For simplicity and since teachers usually care about their own classes:
    const stats = await Attendance.aggregate([
      { $match: { teacherId: new mongoose.Types.ObjectId(teacherId as string), collegeId: new mongoose.Types.ObjectId(collegeId) } },
      { $unwind: "$records" },
      {
        $group: {
          _id: "$records.studentId",
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: { $cond: [{ $eq: ["$records.status", "Present"] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          percentage: { $multiply: [{ $divide: ["$presentClasses", "$totalClasses"] }, 100] }
        }
      },
      { $match: { percentage: { $lt: 75 } } },
      { $sort: { percentage: 1 } }
    ]);

    const populatedStats = await Student.populate(stats, { 
      path: "_id", 
      select: "studentId uniqueStudentId personalInfo.name" 
    });

    const result = populatedStats.map((s: any) => {
      const studentDoc: any = s._id;
      return {
        studentId: studentDoc?.studentId || studentDoc?.uniqueStudentId || "Unknown",
        name: studentDoc?.personalInfo?.name || "Unknown",
        percentage: s.percentage
      };
    });

    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTeacherSessionHistory = async (req: Request, res: Response) => {
  try {
    const teacherId = (req as any).user?._id;
    const collegeId = (req as any).user?.collegeId;
    if (!teacherId || !collegeId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const sessions = await Attendance.find({ teacherId, collegeId })
      .populate('subjectId', 'name code')
      .populate('classId', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(200);

    const data = sessions.map((session: any) => {
      const records = Array.isArray(session.records) ? session.records : [];
      const present = records.filter((r: any) => String(r.status).toLowerCase() === 'present').length;
      const absent = records.filter((r: any) => String(r.status).toLowerCase() === 'absent').length;

      return {
        _id: session._id,
        date: session.date,
        lecture: session.lecture,
        section: session.section || 'General',
        subject: session.subjectId,
        batch: session.classId,
        totalPresent: present,
        totalAbsent: absent,
        records: session.records,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Submit a leave request
 */
export const submitLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { fromDate, toDate, reason, studentId } = req.body;
    const leave = await mongoose.model('LeaveRequest').create({
      studentId, fromDate, toDate, reason, status: 'pending'
    });
    res.status(201).json({ success: true, data: leave });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get leave requests
 */
export const getLeaveRequests = async (req: Request, res: Response) => {
  try {
    const leaves = await mongoose.model('LeaveRequest').find()
      .populate('studentId', 'personalInfo academicInfo')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leaves });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Review a leave request
 */
export const reviewLeaveRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const leave = await mongoose.model('LeaveRequest').findByIdAndUpdate(
      id, { status, remarks, reviewedAt: new Date() }, { new: true }
    );
    res.status(200).json({ success: true, data: leave });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get attendance for the logged in student
 */
export const getMyAttendance = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ success: false, message: "Not authorized" });

    // 1. Find the student record(s) to fetch attendance for
    let studentId = null;

    if (user.role === 'PARENT') {
      const parent = await Parent.findOne({ userId: user._id });
      if (!parent || !parent.students.length) {
        return res.status(404).json({ success: false, message: "No linked students found for this parent" });
      }
      studentId = parent.students[0]; // Fetch for the first child by default in the list view
    } else {
      const student = await Student.findOne({ userId: user._id });
      if (!student) return res.status(404).json({ success: false, message: "Student profile not found" });
      studentId = student._id;
    }

    // 2. Fetch all attendance records where this student is present/absent
    const attendance = await Attendance.find({ 
      "records.studentId": studentId 
    })
    .populate('subjectId', 'name')
    .sort({ date: -1 });

    // 3. Filter the records array to only include this student's status for each day
    const myRecords = attendance.map(day => {
      const myRecord = day.records.find(r => r.studentId.toString() === studentId.toString());
      return {
        date: day.date,
        subject: day.subjectId,
        status: myRecord?.status || 'Absent'
      };
    }).filter(r => r.status !== undefined); // Only return records that actually exist

    // 4. Calculate Aggregates
    const total = myRecords.length;
    const present = myRecords.filter(r => r.status === 'Present').length;
    const leave = myRecords.filter(r => r.status === 'Leave').length; 
    const percentage = total > 0 ? Math.round(((present + leave) / total) * 100) : 0;

    // 5. Subject-Wise Breakdown (with lastMarkedAt for UI clarity)
    const subjectWiseMap: any = {};
    myRecords.forEach(r => {
      const subId = r.subject?._id?.toString() || 'unknown';
      const subName = (r.subject as any)?.name || 'Unknown Subject';
      
      if (!subjectWiseMap[subId]) {
        subjectWiseMap[subId] = { name: subName, total: 0, present: 0, leave: 0, lastMarkedAt: null };
      }
      subjectWiseMap[subId].total++;
      if (r.status === 'Present') subjectWiseMap[subId].present++;
      if (r.status === 'Leave') subjectWiseMap[subId].leave++;
      // Track the most recent date this subject had attendance
      const rDate = new Date(r.date).getTime();
      if (!subjectWiseMap[subId].lastMarkedAt || rDate > new Date(subjectWiseMap[subId].lastMarkedAt).getTime()) {
        subjectWiseMap[subId].lastMarkedAt = r.date;
      }
    });

    const subjectWise = Object.values(subjectWiseMap).map((sub: any) => ({
      ...sub,
      percentage: sub.total > 0 ? Math.round(((sub.present + sub.leave) / sub.total) * 100) : 0
    }));

    res.status(200).json({ 
      success: true, 
      data: {
        registrationId: user.registrationId,
        percentage,
        totalClasses: total,
        presentClasses: present,
        absentClasses: total - present - leave,
        records: myRecords,
        subjectWise
      } 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
