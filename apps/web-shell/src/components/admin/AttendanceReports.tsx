"use client";

import React from "react";
import { AlertTriangle, User, Calendar, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceReportsProps {
  shortages: any[];
}

export default function AttendanceReports({ shortages }: AttendanceReportsProps) {
  return (
    <div className="space-y-8">
      {/* Shortage Alerts */}
      <div className="bg-rose-50 border border-rose-100 rounded-[2.5rem] p-8">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-200">
                  <AlertTriangle size={20} />
               </div>
               <div>
                  <h3 className="text-sm font-black text-rose-900 uppercase tracking-widest">Attendance Shortage Alerts</h3>
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Students below 75% threshold in current Term</p>
               </div>
            </div>
            <button className="px-4 py-2 bg-rose-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-800 transition-all">
               Generate Notices
            </button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shortages.map((item) => (
              <div key={item._id._id} className="bg-white border border-rose-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                 <div className="flex items-center justify-between mb-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black uppercase text-slate-400">
                       {item._id.personalInfo.name[0]}
                    </div>
                    <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded tracking-tighter">
                       {item.percentage.toFixed(1)}% Present
                    </span>
                 </div>
                 
                 <div className="space-y-1">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item._id.personalInfo.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">{item._id.studentId}</p>
                 </div>

                 <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                       <BookOpen size={10} /> {item._id.academic?.courseId?.name || "B.Tech CS"}
                    </div>
                    <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                       Contact Parent
                    </button>
                 </div>
              </div>
            ))}

            {shortages.length === 0 && (
              <div className="lg:col-span-3 py-12 flex flex-col items-center justify-center border border-dashed border-rose-200 rounded-3xl bg-white/50">
                 <p className="text-[10px] font-black text-rose-300 uppercase tracking-widest font-mono">No Critical Shortages Detected</p>
              </div>
            )}
         </div>
      </div>

      {/* Overview Stats (Placeholder) */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
         <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-8">Institutional Presence Logs</h3>
         <div className="h-64 flex items-center justify-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Presence Chart Visualizer Coming Soon</p>
         </div>
      </div>
    </div>
  );
}
