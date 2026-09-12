"use client";

import React from "react";
import { ClipboardList, Calendar, CheckCircle, Clock, MoreVertical, Send, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamManagerProps {
  exams: any[];
  onPublish: (id: string) => void;
  onView: (id: string) => void;
   onCreate?: () => void;
}

const STATUS_COLORS = {
  DRAFT: "bg-slate-100 text-slate-600 border-slate-200",
  SCHEDULED: "bg-blue-50 text-blue-600 border-blue-100",
  COMPLETED: "bg-amber-50 text-amber-600 border-amber-100",
  PUBLISHED: "bg-emerald-50 text-emerald-600 border-emerald-100"
};

export default function ExamManager({ exams, onPublish, onView, onCreate }: ExamManagerProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {exams.map((exam) => (
        <div key={exam._id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
           <div className="flex items-center justify-between mb-6">
              <div className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border", STATUS_COLORS[exam.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.DRAFT)}>
                 {exam.status}
              </div>
              <button className="text-slate-300 hover:text-slate-900 transition-colors">
                 <MoreVertical size={16} />
              </button>
           </div>

           <div className="space-y-1 mb-6">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight">{exam.name}</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exam.code} • {exam.type}</p>
           </div>

           <div className="space-y-3 mb-8">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                 <Calendar size={14} className="text-slate-400" />
                 {new Date(exam.scheduleDate).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                 <Clock size={14} className="text-slate-400" />
                 {exam.startTime} - {exam.endTime}
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                 <CheckCircle size={14} className="text-slate-400" />
                 Passing: {exam.passingMarks}/{exam.totalMarks}
              </div>
           </div>

           <div className="flex items-center gap-2">
              <button 
                onClick={() => onView(exam._id)}
                className="flex-1 py-3 bg-slate-50 text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all"
              >
                 <Eye size={14} /> Details
              </button>
              {exam.status !== 'PUBLISHED' && (
                <button 
                  onClick={() => onPublish(exam._id)}
                  className="px-4 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
                   <Send size={14} /> Publish
                </button>
              )}
           </div>
        </div>
      ))}

      {/* New Exam Placeholder */}
         <button
            type="button"
            onClick={onCreate}
            className="border-4 border-dashed border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-200 hover:bg-slate-50/50 transition-all min-h-[300px] w-full"
         >
         <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-200 mb-4">
            <ClipboardList size={24} />
         </div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule New Exam</p>
         </button>
    </div>
  );
}
