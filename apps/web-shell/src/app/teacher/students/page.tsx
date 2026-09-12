"use client";

import React, { useState, useEffect } from "react";
import StudentCard from "@/components/teacher/StudentCard";
import api from "@/lib/api";
import { Search, Filter, RotateCcw, Users, LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teacher/students');
      setStudents(res.data.data);
    } catch (err: any) {
      console.error("Failed to load students", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredStudents = students.filter((s: any) => {
    const fullName = `${s.personalInfo?.firstName || ''} ${s.personalInfo?.lastName || ''}`.trim();
    const rollNumber = s.academicInfo?.rollNumber || "";
    
    return fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           rollNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return <div className="animate-pulse space-y-8">
     <div className="h-10 w-64 bg-slate-200 rounded-lg"></div>
     <div className="h-16 w-full bg-slate-50 rounded-2xl"></div>
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-72 bg-slate-100 rounded-2xl"></div>)}
     </div>
  </div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student Directory</h1>
          <p className="text-slate-500 mt-1">Search and view academic profiles of students across your assigned batches.</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-400 hover:text-slate-600")}
              >
                 <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-400 hover:text-slate-600")}
              >
                 <List size={18} />
              </button>
           </div>
           <button 
             onClick={fetchData}
             className="p-2.5 text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
           >
             <RotateCcw size={20} />
           </button>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
         <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-900 transition-colors" size={20} />
            <input 
              type="text"
              placeholder="Search by name or roll number..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-slate-100 transition-all"
            />
         </div>
         <div className="h-10 w-px bg-slate-100 hidden md:block"></div>
         <div className="px-6 flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl">
               <Users size={18} />
            </div>
            <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Matches</p>
               <p className="text-xl font-black text-slate-900">{filteredStudents.length}</p>
            </div>
         </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredStudents.length > 0 ? filteredStudents.map((student: any) => (
            <StudentCard key={student._id} student={student} />
          )) : (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
               <p className="text-slate-400 italic">No students found matching your search.</p>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
           <table className="w-full border-collapse">
              <thead>
                 <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</th>
                    <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Roll Number</th>
                    <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch</th>
                    <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Section</th>
                    <th className="p-4 text-right pr-8 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                 </tr>
              </thead>
              <tbody>
                  {filteredStudents.map((s: any) => {
                     const fullName = `${s.personalInfo?.firstName || ''} ${s.personalInfo?.lastName || ''}`.trim();
                     return (
                        <tr key={s._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                           <td className="p-4">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs uppercase">
                                    {fullName[0] || '?'}
                                 </div>
                                 <span className="text-sm font-bold text-slate-900">{fullName}</span>
                              </div>
                           </td>
                           <td className="p-4 text-xs font-medium text-slate-600 uppercase tracking-tighter">{s.academicInfo?.rollNumber || "N/A"}</td>
                           <td className="p-4 text-xs font-bold text-slate-700">{s.batchId?.name || "N/A"}</td>
                           <td className="p-4 text-xs font-bold text-slate-700">{s.section || "A"}</td>
                           <td className="p-4 text-right pr-8">
                              <Link 
                                href={`/teacher/students/${s._id}`}
                                className="text-xs font-black text-slate-900 uppercase tracking-widest hover:underline"
                              >
                                 Profile
                              </Link>
                           </td>
                        </tr>
                     );
                  })}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
}
