"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Calendar, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchStudentAttendanceDetail } from "@/lib/api/admin";

export default function StudentAttendanceDetail() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.studentId as string;
  
  const [student, setStudent] = useState<any>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStudentAttendanceDetails();
  }, [studentId]);

  const loadStudentAttendanceDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchStudentAttendanceDetail(studentId);
      if (response.success) {
        setStudent(response.data.student || response.data);
        setAttendanceRecords(response.data.records || response.data.attendanceRecords || []);
      } else {
        setError(response.message || "Failed to load student details");
      }
    } catch (err: any) {
      console.error("Failed to load student attendance details:", err);
      setError(err.message || "An error occurred while loading student details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen pb-12">
        <div className="flex gap-4 items-center">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Loading...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen pb-12">
        <div className="flex gap-4 items-center mb-8">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
              {error ? "Error Loading Data" : "Student Not Found"}
            </h1>
          </div>
        </div>
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4">
          <p className="text-rose-700">{error || "The requested student record could not be found."}</p>
        </div>
      </div>
    );
  }

  const percentage = student.percentage ?? 0;
  const isCritical = percentage < 75;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen pb-12">
      {/* Header */}
      <div className="flex gap-4 items-center">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
            {student.personalInfo?.name || "Student"}
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
            Attendance Details & Session Records
          </p>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Student ID</p>
            <p className="text-sm font-black text-slate-900">
              {student.studentId || student.uniqueStudentId || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Roll Number</p>
            <p className="text-sm font-black text-slate-900">
              {student.rollNumber || student.academicInfo?.rollNumber || student.studentId || student.uniqueStudentId || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Batch</p>
            <p className="text-sm font-black text-slate-900">
              {student.batchName || student.academicInfo?.batch || student.batchId?.name || "N/A"}
            </p>
          </div>
          <div>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Email</p>
            <p className="text-sm font-black text-slate-900">
              {student.personalInfo?.email || "N/A"}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Total Classes</p>
            <p className="text-2xl font-black text-slate-900">{student.totalClasses || 0}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-[0.2em] mb-2">Present</p>
            <p className="text-2xl font-black text-emerald-600">{student.present || 0}</p>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-200">
            <p className="text-[9px] font-bold text-rose-600 uppercase tracking-[0.2em] mb-2">Absent</p>
            <p className="text-2xl font-black text-rose-600">{student.absent || 0}</p>
          </div>
          <div className={cn(
            "rounded-xl p-4 border",
            isCritical 
              ? "bg-rose-50 border-rose-200" 
              : "bg-emerald-50 border-emerald-200"
          )}>
            <p className={cn(
              "text-[9px] font-bold uppercase tracking-[0.2em] mb-2",
              isCritical ? "text-rose-600" : "text-emerald-600"
            )}>
              Attendance %
            </p>
            <p className={cn(
              "text-2xl font-black",
              isCritical ? "text-rose-600" : "text-emerald-600"
            )}>
              {percentage.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Attendance Status Indicator */}
      {isCritical && (
        <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4 flex gap-3">
          <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-rose-900">Attendance Below Threshold</p>
            <p className="text-[13px] text-rose-700 mt-1">
              Student attendance is below 75%. Immediate action may be required.
            </p>
          </div>
        </div>
      )}

      {/* Attendance Records */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xl font-black text-slate-900 mb-4 uppercase flex items-center gap-2">
          <Calendar size={20} />
          Session Records
        </h2>
        
        {attendanceRecords.length === 0 ? (
          <div className="py-12 text-center">
            <TrendingUp size={32} className="mx-auto text-slate-300 mb-4" />
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
              No attendance records found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 font-bold text-slate-600 text-[9px] uppercase tracking-widest">Date</th>
                  <th className="px-4 py-3 font-bold text-slate-600 text-[9px] uppercase tracking-widest">Subject</th>
                  <th className="px-4 py-3 font-bold text-slate-600 text-[9px] uppercase tracking-widest">Status</th>
                  <th className="px-4 py-3 font-bold text-slate-600 text-[9px] uppercase tracking-widest">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((record, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-slate-900 font-semibold">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{record.subject || "N/A"}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-1 rounded-full text-[9px] font-bold uppercase",
                        record.status === "PRESENT"
                          ? "bg-emerald-100 text-emerald-700"
                          : record.status === "ABSENT"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-slate-100 text-slate-700"
                      )}>
                        {record.status || "UNKNOWN"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[13px]">{record.remarks || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
