"use client";

import React from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Shortage {
  studentId: string;
  percentage: number;
}

interface ShortageAlertProps {
  shortages: Shortage[];
  className?: string;
}

export default function ShortageAlert({ shortages = [], className }: ShortageAlertProps) {
  if (!shortages || shortages.length === 0) return null;

  return (
    <div className={cn("bg-red-50 border border-red-100 rounded-2xl p-6 space-y-4 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-900">Attendance Shortage Detected</h3>
            <p className="text-[11px] text-red-600 font-medium">{shortages.length} students are below the 75% persistence threshold.</p>
          </div>
        </div>
        
        <Link 
          href="/teacher/attendance/report" 
          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 bg-white px-3 py-1.5 rounded-lg border border-red-100 shadow-sm"
        >
          View Details
          <ChevronRight size={14} />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {shortages.slice(0, 8).map((s, idx) => (
          <div key={s.studentId || idx} className="px-2 py-1 bg-white border border-red-100 rounded-lg flex items-center gap-2">
             <span className="text-[10px] font-bold text-slate-600">ID: {(s.studentId || '').slice(-6).toUpperCase()}</span>
             <span className="w-1 h-1 bg-red-400 rounded-full"></span>
             <span className="text-[10px] font-black text-red-600">{(s.percentage ?? 0).toFixed(1)}%</span>
          </div>
        ))}
        {shortages.length > 8 && (
          <div className="px-2 py-1 bg-red-100 rounded-lg text-[10px] font-bold text-red-600">
            +{shortages.length - 8} more
          </div>
        )}
      </div>
    </div>
  );
}
