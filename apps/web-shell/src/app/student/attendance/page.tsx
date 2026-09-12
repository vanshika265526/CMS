"use client";

import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ChevronRight,
  Calendar
} from 'lucide-react';
import { fetchMyAttendance } from '@/lib/api/student';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import AttendanceSummary from '@/components/dashboard/attendance/AttendanceSummary';
import AttendanceLogTable from '@/components/dashboard/attendance/AttendanceLogTable';

export default function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState<string>("All Subjects");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetchMyAttendance();
        if (res.success) {
          const records = res.data.records || (Array.isArray(res.data) ? res.data : []);
          setAttendance(records);
        }
      } catch (err) {
        console.error("Failed to load attendance history", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const subjects = Array.from(new Set(attendance.map(r => r.subject?.name).filter(Boolean)));

  const filteredAttendance = filterSubject === "All Subjects" 
    ? attendance 
    : attendance.filter(r => r.subject?.name === filterSubject);

  const calculateStats = () => {
    if (attendance.length === 0) return { pct: 0, present: 0, absent: 0, total: 0 };
    const present = attendance.filter(r => r.status === 'Present').length;
    const leave = attendance.filter(r => r.status === 'Leave').length;
    const total = attendance.length;
    return {
      pct: Math.round(((present + leave) / total) * 100),
      present,
      absent: total - present - leave,
      total
    };
  };

  const stats = calculateStats();

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Clock className="animate-spin text-indigo-400" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
            <ChevronRight size={10} />
            <span className="text-slate-900">Attendance History</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display uppercase tracking-tight">Academic Presence</h1>
          <p className="text-sm text-slate-500 mt-1">Detailed breakdown of subject-wise attendance and records.</p>
        </div>

        <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-200 gap-4 px-6 items-center">
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Pct</p>
            <p className={`text-xl font-black ${stats.pct >= 75 ? 'text-emerald-600' : 'text-rose-600'}`}>{stats.pct}%</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      <AttendanceSummary stats={stats} />

      {/* Subject Wise breakdown */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900 mb-6 font-display">Subject Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(attendance.reduce((acc: any, r: any) => {
            const sub = r.subject?.name || "Other";
            if (!acc[sub]) acc[sub] = { p: 0, t: 0 };
            acc[sub].t++;
            if (r.status === 'Present' || r.status === 'Leave') acc[sub].p++;
            return acc;
          }, {})).map(([sub, data]: [string, any]) => (
            <div key={sub} className={cn(
              "p-4 rounded-2xl border transition-all cursor-pointer",
              filterSubject === sub ? "bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20" : "bg-slate-50 border-slate-100"
            )}
            onClick={() => setFilterSubject(filterSubject === sub ? "All Subjects" : sub)}
            >
               <div className="flex justify-between items-center mb-2">
                 <p className={cn("text-sm font-bold", filterSubject === sub ? "text-white" : "text-slate-900 font-utility")}>{sub}</p>
                 <span className={cn(
                   "text-xs font-black px-2 py-1 rounded-lg border",
                   filterSubject === sub ? "bg-white/20 border-white/20 text-white" : "text-indigo-600 bg-white border-slate-200"
                 )}>
                   {Math.round((data.p / data.t) * 100)}%
                 </span>
               </div>
               <div className={cn("h-2 rounded-full overflow-hidden", filterSubject === sub ? "bg-white/20" : "bg-slate-200")}>
                 <div className={cn("h-full rounded-full transition-all duration-1000", filterSubject === sub ? "bg-white" : "bg-indigo-500")} style={{ width: `${(data.p / data.t) * 100}%` }} />
               </div>
               <p className={cn("text-[10px] font-bold uppercase mt-2", filterSubject === sub ? "text-indigo-100" : "text-slate-400")}>{data.p} of {data.t} Sessions</p>
            </div>
          ))}
        </div>
      </div>

      <AttendanceLogTable 
        filteredAttendance={filteredAttendance}
        filterSubject={filterSubject}
        setFilterSubject={setFilterSubject}
        subjects={subjects}
      />
    </div>
  );
}
