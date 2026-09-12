"use client";

import React, { useState } from "react";
import { Users, Calendar, Plus, Save, X, GraduationCap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Batch {
  _id: string;
  name: string;
  courseId: { _id: string; name: string };
  startYear: number;
  endYear: number;
  currentSemester: number;
}

interface BatchManagerProps {
  batches: Batch[];
  courses: any[];
  onCreateBatch: (batchData: any) => Promise<void>;
}

export default function BatchManager({ batches, courses, onCreateBatch }: BatchManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    courseId: "",
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 4,
    currentSemester: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreateBatch(formData);
      setShowForm(false);
      setFormData({
        name: "",
        courseId: "",
        startYear: new Date().getFullYear(),
        endYear: new Date().getFullYear() + 4,
        currentSemester: 1
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Active Batches</h2>
           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Cohort Management across Departments</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all"
          >
            <Plus size={14} /> New Batch
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {showForm && (
          <div className="bg-white border-2 border-slate-900 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Create New Batch</h3>
               <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <X size={18} />
               </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Batch Name</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. B.Tech CSE 2024-28"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
               </div>

               <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Program</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                    value={formData.courseId}
                    onChange={e => setFormData({ ...formData, courseId: e.target.value })}
                  >
                    <option value="">Select Course</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Start Year</label>
                     <input 
                       required
                       type="number" 
                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none"
                       value={formData.startYear}
                       onChange={e => {
                         const val = parseInt(e.target.value);
                         setFormData({ ...formData, startYear: isNaN(val) ? "" : val } as any);
                       }}
                     />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">End Year</label>
                     <input 
                       required
                       type="number" 
                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 outline-none"
                       value={formData.endYear}
                       onChange={e => {
                         const val = parseInt(e.target.value);
                         setFormData({ ...formData, endYear: isNaN(val) ? "" : val } as any);
                       }}
                     />
                  </div>
               </div>

               <button 
                 disabled={loading}
                 className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 mt-2 flex items-center justify-center gap-2"
               >
                 {loading ? "Establishing..." : <><Save size={14} /> Finish Creation</>}
               </button>
            </form>
          </div>
        )}

        {batches.map((batch) => (
          <div key={batch._id} className="group bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900">
                   <Clock size={14} />
                </button>
             </div>

             <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900">
                    <GraduationCap size={20} />
                </div>
                <div className="space-y-0.5">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">{batch.name}</h3>
                    <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">{batch.courseId?.name || "Program N/A"}</p>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Timeline</p>
                   <p className="text-[10px] font-black text-slate-900 mt-1">{batch.startYear} — {batch.endYear}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Semester</p>
                   <p className="text-[10px] font-black text-slate-900 mt-1">{batch.currentSemester} / 8</p>
                </div>
             </div>

             <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                   {[1, 2, 3].map(i => (
                     <div key={i} className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-black text-slate-300 uppercase">
                        S
                     </div>
                   ))}
                   <div className="w-6 h-6 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[8px] font-black text-white uppercase">
                      +
                   </div>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-900 transition-colors">Cohort Details</span>
             </div>
          </div>
        ))}

        {!showForm && batches.length === 0 && (
          <div className="col-span-full h-48 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
             <Users className="text-slate-200 mb-2" size={32} />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Active Batches Found</p>
          </div>
        )}
      </div>
    </div>
  );
}
