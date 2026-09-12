// FILE: apps/web-shell/src/components/attendance/AttendanceMarkingGrid.tsx
"use client";

import React from "react";
import Card from "@/components/ui/Card";
import { User, Check, X, Clock, AlertCircle } from "lucide-react";

interface Props {
  students: any[];
  records: Record<string, string>;
  onUpdate: (id: string, status: string) => void;
}

export default function AttendanceMarkingGrid({ students, records, onUpdate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {students.map((student) => {
        const status = records[student._id] || "present";
        
        return (
          <Card key={student._id} className="p-4 bg-surface-container-lowest border-none shadow-ambient flex items-center justify-between group transition-all hover:bg-surface-container-low/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center overflow-hidden border border-outline-variant/20">
                {student.personalInfo.photo ? (
                  <img src={student.personalInfo.photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={20} className="text-on-surface/20" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface group-hover:text-primary-indigo transition-colors">
                  {student.personalInfo.firstName} {student.personalInfo.lastName}
                </p>
                <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-wider">{student.uniqueStudentId}</p>
              </div>
            </div>

            <div className="flex bg-surface-container-low p-1 rounded-xl gap-1">
               <StatusBtn 
                  active={status === "present"} 
                  color="emerald" 
                  icon={<Check size={14} />} 
                  onClick={() => onUpdate(student._id, "present")} 
               />
               <StatusBtn 
                  active={status === "absent"} 
                  color="red" 
                  icon={<X size={14} />} 
                  onClick={() => onUpdate(student._id, "absent")} 
               />
               <StatusBtn 
                  active={status === "late"} 
                  color="amber" 
                  icon={<Clock size={14} />} 
                  onClick={() => onUpdate(student._id, "late")} 
               />
               <StatusBtn 
                  active={status === "excused"} 
                  color="indigo" 
                  icon={<AlertCircle size={14} />} 
                  onClick={() => onUpdate(student._id, "excused")} 
               />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function StatusBtn({ active, color, icon, onClick }: any) {
  const colors: any = {
    emerald: active ? "bg-emerald-500 text-white shadow-emerald-lg" : "text-emerald-500/40 hover:text-emerald-500",
    red: active ? "bg-red-500 text-white shadow-red-lg" : "text-red-500/40 hover:text-red-500",
    amber: active ? "bg-amber-500 text-white shadow-amber-lg" : "text-amber-500/40 hover:text-amber-500",
    indigo: active ? "bg-indigo-500 text-white shadow-indigo-lg" : "text-indigo-500/40 hover:text-indigo-500",
  };

  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-lg transition-all active:scale-90 ${colors[color]} ${!active && "hover:bg-white"}`}
    >
      {icon}
    </button>
  );
}
