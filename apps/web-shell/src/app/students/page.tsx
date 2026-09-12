"use client";

import React, { useEffect, useState } from "react";
import { getStudents, getStudentStats } from "@/lib/api/students";
import StudentCard from "@/components/students/StudentCard";
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  Filter, 
  Grid, 
  List,
  Loader2,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";

export default function StudentDirectory() {
  const [students, setStudents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    fetchData();
  }, [search]);

  const fetchData = async () => {
    try {
      const [studentsRes, statsRes] = await Promise.all([
        getStudents({ search }),
        getStudentStats()
      ]);
      if (studentsRes.success) setStudents(studentsRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error("Failed to fetch student data", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and track student lifecycles across departments</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/students/import"
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition-all font-bold text-xs shadow-sm"
          >
            <Upload size={16} /> Bulk Import
          </Link>
          <Link 
            href="/students/new"
            className="bg-indigo-600 text-white border-2 border-indigo-600 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <UserPlus size={18} className="text-white" /> Enroll Student
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MiniStatCard label="Total Students" value={stats?.totalStudents || 0} icon={<Users size={18} className="text-indigo-600" />} color="bg-indigo-100" />
        <MiniStatCard label="Active" value={stats?.activeStudents || 0} icon={<div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />} color="bg-emerald-100" />
        <MiniStatCard label="New This Month" value={stats?.newThisMonth || 0} icon={<TrendingUp size={18} className="text-amber-600" />} color="bg-amber-100" />
        <MiniStatCard label="Dropout Rate" value={`${stats?.dropoutRate?.toFixed(1) || 0}%`} icon={<AlertCircle size={18} className="text-rose-600" />} color="bg-rose-100" />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 flex-1 max-w-md ml-2 group">
          <Search size={18} className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <input 
            type="text"
            placeholder="Search by name or unique ID..."
            className="bg-transparent border-none text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none w-full py-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 pr-2">
          <button className="p-2.5 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded-xl transition-all border border-slate-100">
            <Filter size={18} />
          </button>
          <div className="w-px h-6 bg-slate-200 mx-2" />
          <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white text-indigo-600 shadow-sm border border-slate-200/50" : "text-slate-400 hover:text-slate-600"}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[400px] flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
           <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" : "space-y-4"}>
          {students.map((student) => (
            <StudentCard key={student._id} student={student} />
          ))}
          {students.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
               <AlertCircle size={48} className="text-slate-200 mx-auto mb-4" />
               <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">No students found matching your criteria</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniStatCard({ label, value, icon, color }: any) {
  return (
    <Card className="p-6 border border-slate-100 bg-white shadow-sm flex items-center justify-between group hover:shadow-md transition-all rounded-3xl">
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
      <div className={`p-4 ${color} rounded-2xl flex items-center justify-center transition-all group-hover:scale-110`}>
        {icon}
      </div>
    </Card>
  );
}
