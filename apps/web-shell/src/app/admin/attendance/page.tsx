"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  fetchShortageList, 
  fetchAttendanceOverview, 
  fetchStudentWiseAttendance,
  fetchBatches,
  fetchSubjects
} from "@/lib/api/admin";
import { generateAttendancePDF, generateAttendanceExcel } from "@/lib/exportUtils";
import { 
  Calendar, Filter, FileText, Download, Activity, Users, CheckCircle, XCircle, Clock, Search
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function AdminAttendanceDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [studentsData, setStudentsData] = useState<any[]>([]);
  const [shortagesData, setShortagesData] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'StudentWise' | 'Shortages' | 'AuditLogs'>('StudentWise');
  
  // Filters
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [filters, setFilters] = useState({ batchId: '', subjectId: '', search: '' });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'StudentWise') loadStudentWiseData();
    if (activeTab === 'Shortages') loadShortages();
  }, [filters.batchId, filters.subjectId, activeTab]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [overRes, batchRes, subRes] = await Promise.all([
        fetchAttendanceOverview(),
        fetchBatches(),
        fetchSubjects()
      ]);
      
      if (overRes.success) setOverview(overRes.data);
      if (batchRes.success) setBatches(batchRes.data);
      if (subRes.success) setSubjects(subRes.data);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentWiseData = async () => {
    try {
      setLoading(true);
      const res = await fetchStudentWiseAttendance({ 
        batchId: filters.batchId || undefined, 
        subjectId: filters.subjectId || undefined 
      });
      if (res.success) setStudentsData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadShortages = async () => {
    try {
      setLoading(true);
      const res = await fetchShortageList();
      if (res.success) setShortagesData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter logic for search bar
  const filteredStudents = studentsData.filter(student => 
    !filters.search || 
    student.personalInfo?.name?.toLowerCase().includes(filters.search.toLowerCase()) ||
    student.studentId?.toLowerCase().includes(filters.search.toLowerCase()) || 
    student.uniqueStudentId?.toLowerCase().includes(filters.search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Attendance Oversight</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Campus Monitoring & Compliance Registry</p>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={() => generateAttendancePDF(filteredStudents, filters)} 
             className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
           >
              <FileText size={14} className="text-red-500" /> Print PDF
           </button>
           <button 
             onClick={() => generateAttendanceExcel(studentsData, overview)} 
             className="px-5 py-3 bg-slate-900 border border-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95 shadow-xl shadow-slate-900/10"
           >
              <Download size={14} className="text-emerald-400" /> Audit Excel
           </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard 
          title="Total Processed" 
          value={overview?.totalRecords || 0} 
          sub="Stored matrix records" 
          color="blue" 
        />
        <KPICard 
          title="Overall Present" 
          value={overview?.stats?.presentPercentage ? `${overview.stats.presentPercentage}%` : "0%"} 
          sub="Institutional Average" 
          color="emerald" 
        />
        <KPICard 
          title="Overall Absent" 
          value={overview?.stats?.absentPercentage ? `${overview.stats.absentPercentage}%` : "0%"} 
          sub="Below threshold triggers" 
          color="rose" 
        />
        <KPICard 
          title="Approved Leaves" 
          value={overview?.stats?.leavePercentage ? `${overview.stats.leavePercentage}%` : "0%"} 
          sub="Medical & Exceptions" 
          color="amber" 
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        {/* Filters & Tabs Header */}
        <div className="p-6 border-b border-slate-100 space-y-6 bg-slate-50/50">
          
          <div className="flex flex-col lg:flex-row gap-4 justify-between lg:items-center">
             <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
               <TabButton active={activeTab === 'StudentWise'} onClick={() => setActiveTab('StudentWise')} label="Student Ledger" />
               <TabButton active={activeTab === 'Shortages'} onClick={() => setActiveTab('Shortages')} label="Shortage Alerts" />
               <TabButton active={activeTab === 'AuditLogs'} onClick={() => setActiveTab('AuditLogs')} label="Audit Logs" />
             </div>

             <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full lg:w-64">
                   <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                     <Search size={14} />
                   </div>
                   <input 
                     type="text" 
                     placeholder="Search ID or Name..."
                     className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm"
                     value={filters.search}
                     onChange={(e) => setFilters({...filters, search: e.target.value})}
                   />
                </div>
                
                <select 
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm w-full lg:w-auto"
                  value={filters.batchId}
                  onChange={(e) => setFilters({...filters, batchId: e.target.value})}
                >
                  <option value="">All Batches</option>
                  {batches.map(b => (
                    <option key={b._id} value={b._id}>{b.name} ({b.year})</option>
                  ))}
                </select>

                <select 
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-sm w-full lg:w-auto"
                  value={filters.subjectId}
                  onChange={(e) => setFilters({...filters, subjectId: e.target.value})}
                >
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                  ))}
                </select>
             </div>
          </div>
        </div>

        {/* Dynamic Content Body */}
        <div className="min-h-[400px]">
          {loading ? (
            <div className="h-full w-full py-32 flex flex-col items-center justify-center">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Synthesizing Records...</p>
            </div>
          ) : activeTab === 'StudentWise' ? (
            <StudentWiseTable students={filteredStudents} />
          ) : activeTab === 'Shortages' ? (
            <StudentWiseTable students={shortagesData} isShortageOnly />
          ) : (
             <div className="py-32 flex flex-col items-center justify-center text-slate-400">
               <Calendar size={32} className="mb-4 opacity-50" />
               <p className="text-[10px] font-black uppercase tracking-widest">Audit Logs Under Construction (Phase 5 Extension)</p>
             </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------ //
// Sub-Components
// ------------------------------------------------------------------------------------------------ //

function KPICard({ title, value, sub, color }: any) {
  const colors: Record<string, string> = {
    blue: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };
  
  return (
    <div className={cn("p-6 rounded-[2rem] border relative overflow-hidden", colors[color])}>
      <span className="block text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">{title}</span>
      <span className="block text-3xl font-black leading-none">{value}</span>
      <span className="block text-[10px] font-bold uppercase tracking-widest mt-2 opacity-60">{sub}</span>
    </div>
  );
}

function TabButton({ active, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
        active 
          ? "bg-white text-slate-900 shadow-sm" 
          : "text-slate-500 hover:text-slate-700"
      )}
    >
      {label}
    </button>
  );
}

function StudentWiseTable({ students, isShortageOnly = false }: { students: any[], isShortageOnly?: boolean }) {
  const router = useRouter();
  
  const handleDrillDown = (studentId: string) => {
    router.push(`/admin/attendance/${studentId}`);
  };

  if (students.length === 0) {
    return (
      <div className="py-24 text-center">
        <Users size={32} className="mx-auto text-slate-300 mb-4" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">No matching student records found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Student Details</th>
            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Total Scheduled</th>
            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Present</th>
            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Absent/Leave</th>
            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Pill Indicator</th>
            <th className="p-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {students.map((student, idx) => {
            const perc = student.percentage ?? 0;
            const isCritical = perc < 75;

            return (
              <tr key={student._id || idx} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs",
                      isCritical ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
                    )}>
                      {student.personalInfo?.name?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{student.personalInfo?.name || "Unknown Name"}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        ID: {student.studentId || student.uniqueStudentId || 'N/A'} • ROLL: {student.academicInfo?.rollNumber || 'N/A'}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="p-5 text-center text-sm font-black text-slate-700">{student.totalClasses || 0}</td>
                <td className="p-5 text-center text-sm font-black text-emerald-600">{student.present || 0}</td>
                <td className="p-5 text-center text-sm font-black text-rose-500">{(student.absent || 0) + (student.leave || 0)}</td>
                <td className="p-5 text-center">
                   <div className={cn(
                     "inline-flex items-center justify-center px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest w-24",
                     isCritical ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"
                   )}>
                     {perc.toFixed(1)}%
                   </div>
                </td>
                <td className="p-5 text-right">
                   <button 
                     onClick={() => handleDrillDown(student._id)}
                     className="text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
                   >
                     Drill Down
                   </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
