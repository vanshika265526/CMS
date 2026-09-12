// FILE: apps/web-shell/src/components/attendance/AttendanceSummaryCard.tsx
"use client";

import React from "react";
import Card from "@/components/ui/Card";
import { BookOpen } from "lucide-react";

interface Props {
  subject: string;
  batch: string;
  percentage: number;
}

export default function AttendanceSummaryCard({ subject, batch, percentage }: Props) {
  const isHealthy = percentage >= 75;
  const color = isHealthy ? "text-emerald-500" : "text-red-500";
  const strokeColor = isHealthy ? "#10b981" : "#ef4444";

  return (
    <Card className="p-5 bg-surface-container-lowest border-none shadow-ambient flex items-center justify-between group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface/20 group-hover:bg-primary-indigo/10 group-hover:text-primary-indigo transition-all">
          <BookOpen size={24} />
        </div>
        <div>
          <h4 className="font-display font-bold text-sm text-on-surface">{subject}</h4>
          <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest">{batch}</p>
        </div>
      </div>

      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90">
          <circle 
            cx="28" cy="28" r="24" 
            fill="transparent" 
            stroke="currentColor" 
            strokeWidth="4" 
            className="text-surface-container-low" 
          />
          <circle 
            cx="28" cy="28" r="24" 
            fill="transparent" 
            stroke={strokeColor} 
            strokeWidth="4" 
            strokeDasharray={2 * Math.PI * 24}
            strokeDashoffset={2 * Math.PI * 24 * (1 - percentage / 100)}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className={`absolute text-[10px] font-bold ${color}`}>{percentage}%</span>
      </div>
    </Card>
  );
}
