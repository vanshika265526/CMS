import { Request, Response } from "express";
import mongoose from "mongoose";
import Student from "../models/Student.js";
import Attendance from "../models/Attendance.js";
import Result from "../models/Result.js";
import Fee from "../models/Fee.js";
import Faculty from "../models/Faculty.js";
import Department from "../models/Department.js";

/**
 * Risk weights for the drop-out early-warning score. These are deliberately a
 * transparent rule-based model rather than a trained classifier: every point of
 * a student's score can be explained back to a specific signal, which is what
 * the academic office needs in order to act on it.
 */
const RISK_WEIGHTS = {
  attendanceBelow75: 30,
  attendanceBelow60: 25, // stacks with the above, so <60% scores 55
  failedSubject: 12, // per failed subject, capped
  failedSubjectCap: 30,
  percentageBelow40: 25,
  overdueFees: 15,
};

const collegeFilter = (req: Request) => {
  const role = String((req as any).user?.role || "").toUpperCase();
  const collegeId = (req as any).user?.collegeId;
  return role !== "SUPER_ADMIN" && collegeId
    ? { collegeId: new mongoose.Types.ObjectId(String(collegeId)) }
    : {};
};

const studentName = (s: any) =>
  s?.personalInfo?.name ||
  `${s?.personalInfo?.firstName || ""} ${s?.personalInfo?.lastName || ""}`.trim() ||
  "Unknown";

/** Per-student attendance percentage across all recorded lectures. */
const attendanceByStudent = async (studentIds: mongoose.Types.ObjectId[]) => {
  const rows = await Attendance.aggregate([
    { $unwind: "$records" },
    { $match: { "records.studentId": { $in: studentIds } } },
    {
      $group: {
        _id: "$records.studentId",
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $in: ["$records.status", ["Present", "Leave"]] }, 1, 0] },
        },
      },
    },
  ]);

  return new Map(
    rows.map((r) => [
      String(r._id),
      { total: r.total, present: r.present, rate: r.total ? (r.present / r.total) * 100 : 0 },
    ])
  );
};

export const getOverview = async (req: Request, res: Response) => {
  try {
    const scope = collegeFilter(req);

    const students = await Student.find({ ...scope, "academicInfo.status": "active" })
      .select("_id")
      .lean();
    const studentIds = students.map((s) => s._id as mongoose.Types.ObjectId);

    const [attendanceMap, resultAgg, feeAgg, facultyCount, departmentCount] = await Promise.all([
      attendanceByStudent(studentIds),
      Result.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        {
          $group: {
            _id: null,
            avgPercentage: { $avg: "$percentage" },
            avgCgpa: { $avg: "$cgpa" },
            passed: { $sum: { $cond: [{ $eq: ["$status", "PASS"] }, 1, 0] } },
            total: { $sum: 1 },
          },
        },
      ]),
      Fee.aggregate([
        { $match: { ...scope } },
        {
          $group: {
            _id: "$status",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),
      Faculty.countDocuments(scope),
      Department.countDocuments(scope),
    ]);

    const attendanceValues = Array.from(attendanceMap.values());
    const overallAttendance = attendanceValues.length
      ? attendanceValues.reduce((sum, a) => sum + a.rate, 0) / attendanceValues.length
      : 0;

    const results = resultAgg[0] || { avgPercentage: 0, avgCgpa: 0, passed: 0, total: 0 };
    const feeMap = feeAgg.reduce<Record<string, { amount: number; count: number }>>(
      (acc, f: any) => ({
        ...acc,
        [f._id]: { amount: f.amount, count: f.count },
      }),
      {}
    );

    const collected = feeMap.paid?.amount || 0;
    const outstanding = (feeMap.pending?.amount || 0) + (feeMap.overdue?.amount || 0);

    res.status(200).json({
      success: true,
      data: {
        students: studentIds.length,
        faculty: facultyCount,
        departments: departmentCount,
        attendanceRate: Math.round(overallAttendance * 10) / 10,
        studentsBelowAttendanceThreshold: attendanceValues.filter((a) => a.rate < 75).length,
        avgPercentage: Math.round((results.avgPercentage || 0) * 10) / 10,
        avgCgpa: Math.round((results.avgCgpa || 0) * 100) / 100,
        passRate: results.total ? Math.round((results.passed / results.total) * 1000) / 10 : 0,
        resultsPublished: results.total,
        feesCollected: collected,
        feesOutstanding: outstanding,
        collectionRate:
          collected + outstanding > 0
            ? Math.round((collected / (collected + outstanding)) * 1000) / 10
            : 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Month-by-month enrollment counts for the trailing N months. */
export const getEnrollmentTrend = async (req: Request, res: Response) => {
  try {
    const months = Math.min(Math.max(Number(req.query.months) || 12, 1), 36);
    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const rows = await Student.aggregate([
      { $match: { ...collegeFilter(req), createdAt: { $gte: since } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const counts = new Map(rows.map((r) => [`${r._id.year}-${r._id.month}`, r.count]));

    // Emit a dense series so the chart has no gaps for quiet months.
    const series = [];
    const cursor = new Date(since);
    for (let i = 0; i < months; i++) {
      const year = cursor.getFullYear();
      const month = cursor.getMonth() + 1;
      series.push({
        period: `${year}-${String(month).padStart(2, "0")}`,
        label: cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        count: counts.get(`${year}-${month}`) || 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    res.status(200).json({ success: true, data: series });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Daily attendance rate for the trailing N days. */
export const getAttendanceTrend = async (req: Request, res: Response) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 180);
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await Attendance.aggregate([
      { $match: { date: { $gte: since } } },
      { $unwind: "$records" },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          total: { $sum: 1 },
          present: {
            $sum: { $cond: [{ $eq: ["$records.status", "Present"] }, 1, 0] },
          },
          absent: { $sum: { $cond: [{ $eq: ["$records.status", "Absent"] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const data = rows.map((r) => ({
      date: r._id,
      total: r.total,
      present: r.present,
      absent: r.absent,
      rate: r.total ? Math.round((r.present / r.total) * 1000) / 10 : 0,
    }));

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Average performance grouped by department. */
export const getDepartmentPerformance = async (req: Request, res: Response) => {
  try {
    const scope = collegeFilter(req);

    const rows = await Student.aggregate([
      { $match: { ...scope, "academicInfo.status": "active" } },
      {
        $lookup: {
          from: "results",
          localField: "_id",
          foreignField: "studentId",
          as: "results",
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "academicInfo.department",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$academicInfo.department",
          name: { $first: { $ifNull: ["$department.name", "Unassigned"] } },
          students: { $sum: 1 },
          avgPercentage: { $avg: { $avg: "$results.percentage" } },
          avgCgpa: { $avg: { $avg: "$results.cgpa" } },
        },
      },
      { $sort: { students: -1 } },
    ]);

    const data = rows.map((r) => ({
      departmentId: r._id,
      name: r.name,
      students: r.students,
      avgPercentage: Math.round((r.avgPercentage || 0) * 10) / 10,
      avgCgpa: Math.round((r.avgCgpa || 0) * 100) / 100,
    }));

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Early-warning list. Scores every active student on attendance, academic
 * results and fee status, and returns those above the risk threshold with the
 * specific reasons that produced the score.
 */
export const getAtRiskStudents = async (req: Request, res: Response) => {
  try {
    const threshold = Math.min(Math.max(Number(req.query.threshold) || 30, 0), 100);
    const scope = collegeFilter(req);

    const students = await Student.find({ ...scope, "academicInfo.status": "active" })
      .select("_id personalInfo uniqueStudentId academicInfo")
      .populate("academicInfo.department", "name")
      .lean();

    const studentIds = students.map((s) => s._id as mongoose.Types.ObjectId);
    if (!studentIds.length) {
      return res.status(200).json({ success: true, data: [] });
    }

    const [attendanceMap, resultRows, overdueRows] = await Promise.all([
      attendanceByStudent(studentIds),
      Result.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        { $sort: { publishedDate: -1 } },
        {
          $group: {
            _id: "$studentId",
            latestPercentage: { $first: "$percentage" },
            latestCgpa: { $first: "$cgpa" },
            failedSubjects: {
              $first: {
                $size: {
                  $filter: {
                    input: "$subjects",
                    as: "s",
                    cond: { $eq: ["$$s.status", "FAIL"] },
                  },
                },
              },
            },
          },
        },
      ]),
      Fee.aggregate([
        {
          $match: {
            studentId: { $in: studentIds },
            status: { $in: ["overdue", "pending"] },
            dueDate: { $lt: new Date() },
          },
        },
        { $group: { _id: "$studentId", amount: { $sum: "$amount" } } },
      ]),
    ]);

    const resultMap = new Map(resultRows.map((r) => [String(r._id), r]));
    const overdueMap = new Map(overdueRows.map((r) => [String(r._id), r.amount]));

    const scored = students.map((student) => {
      const key = String(student._id);
      const attendance = attendanceMap.get(key);
      const result = resultMap.get(key);
      const overdueAmount = overdueMap.get(key) || 0;

      let score = 0;
      const reasons: string[] = [];

      if (attendance && attendance.total > 0) {
        if (attendance.rate < 75) {
          score += RISK_WEIGHTS.attendanceBelow75;
          reasons.push(`Attendance at ${attendance.rate.toFixed(1)}% (below the 75% requirement)`);
        }
        if (attendance.rate < 60) {
          score += RISK_WEIGHTS.attendanceBelow60;
          reasons.push("Attendance critically low (below 60%)");
        }
      }

      if (result) {
        if (result.failedSubjects > 0) {
          score += Math.min(
            result.failedSubjects * RISK_WEIGHTS.failedSubject,
            RISK_WEIGHTS.failedSubjectCap
          );
          reasons.push(
            `${result.failedSubjects} failed subject${result.failedSubjects > 1 ? "s" : ""} in the latest exam`
          );
        }
        if (result.latestPercentage < 40) {
          score += RISK_WEIGHTS.percentageBelow40;
          reasons.push(`Latest result at ${result.latestPercentage.toFixed(1)}%`);
        }
      }

      if (overdueAmount > 0) {
        score += RISK_WEIGHTS.overdueFees;
        reasons.push(`Overdue fees of ${Math.round(overdueAmount).toLocaleString("en-IN")}`);
      }

      score = Math.min(score, 100);

      return {
        studentId: student._id,
        name: studentName(student),
        rollNumber: student.uniqueStudentId || (student as any).academicInfo?.rollNumber,
        semester: (student as any).academicInfo?.semester,
        department: (student as any).academicInfo?.department?.name || "Unassigned",
        attendanceRate: attendance ? Math.round(attendance.rate * 10) / 10 : null,
        latestPercentage: result?.latestPercentage ?? null,
        failedSubjects: result?.failedSubjects ?? 0,
        overdueAmount,
        riskScore: score,
        riskLevel: score >= 70 ? "CRITICAL" : score >= 45 ? "HIGH" : score >= 25 ? "MODERATE" : "LOW",
        reasons,
      };
    });

    const data = scored
      .filter((s) => s.riskScore >= threshold)
      .sort((a, b) => b.riskScore - a.riskScore);

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** Distribution of latest-result grades, for the performance histogram. */
export const getGradeDistribution = async (req: Request, res: Response) => {
  try {
    const scope = collegeFilter(req);
    const students = await Student.find(scope).select("_id").lean();
    const studentIds = students.map((s) => s._id as mongoose.Types.ObjectId);

    const rows = await Result.aggregate([
      { $match: { studentId: { $in: studentIds } } },
      { $unwind: "$subjects" },
      { $group: { _id: "$subjects.grade", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: rows.map((r) => ({ grade: r._id || "N/A", count: r.count })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
