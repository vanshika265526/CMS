// FILE: apps/web-shell/src/components/attendance/ShortageAlert.tsx
"use client";

import React from "react";
import Card from "@/components/ui/Card";
import { AlertCircle, MessageSquare } from "lucide-react";

interface Props {
  students: any[];
}

export default function ShortageAlert({ students }: Props) {
  if (students.length === 0) return null;

  return (
    <Card className="p-6 bg-red-50/50 border border-red-200/50 shadow-none overflow-hidden relative group">
      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-600">
           <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="font-display font-bold text-red-900">Attendance Shortage Alert</h4>
          <p className="text-red-700/60 text-xs">The following students are currently below the 75% attendance threshold.</p>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        {students.map((student) => (
          <div key={student.studentId} className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-red-100 group-hover:bg-white transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[10px] font-bold text-red-600 border border-red-100">
                {student.percentage}%
              </div>
              <div>
                <p className="text-sm font-bold text-red-900">{student.name}</p>
                <p className="text-[10px] uppercase font-bold text-red-700/40 tracking-wider">{student.uniqueId}</p>
              </div>
            </div>
            
            <button className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 transition-all active:scale-95">
               <MessageSquare size={12} /> Notify Parent
            </button>
          </div>
        ))}
      </div>

      <AlertCircle className="absolute -bottom-8 -right-8 w-48 h-48 text-red-600/5 rotate-12" />
    </Card>
  );
}
