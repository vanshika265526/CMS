"use client";

import React from "react";
import { Clock, MapPin, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimetableEntry {
  _id: string;
  dayOfWeek: string;
  period: number;
  startTime: string;
  endTime: string;
  subjectId: {
    name: string;
    code: string;
  };
  batch: string;
  section: string;
  room: string;
}

interface TimetableGridProps {
  data: TimetableEntry[];
}

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const periods = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TimetableGrid({ data }: TimetableGridProps) {
  // Organize data by day and period
  const grid: Record<string, Record<number, TimetableEntry>> = {};
  days.forEach(day => {
    grid[day] = {};
  });

  data.forEach(entry => {
    if (grid[entry.dayOfWeek]) {
      grid[entry.dayOfWeek][entry.period] = entry;
    }
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200 w-32">
                Day / Period
              </th>
              {periods.map(p => (
                <th key={p} className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200 min-w-[160px]">
                  Period {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => (
              <tr key={day} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 font-bold text-slate-700 bg-slate-50/30 border-r border-slate-200">
                  {day}
                </td>
                {periods.map(p => {
                  const entry = grid[day][p];
                  return (
                    <td key={p} className="p-2 border-r border-slate-100 last:border-r-0 h-32 align-top">
                      {entry ? (
                        <div className="h-full bg-slate-900 text-white rounded-xl p-3 space-y-2 shadow-sm relative overflow-hidden group">
                           {/* Glow Effect */}
                           <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:bg-white/10 transition-all duration-300"></div>
                           
                           <div className="flex flex-col h-full justify-between">
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter block truncate">
                                  {entry.subjectId.code}
                                </span>
                                <h4 className="text-xs font-bold truncate mt-0.5 leading-tight">
                                  {entry.subjectId.name}
                                </h4>
                              </div>
                              
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <Users size={10} />
                                  <span>{entry.batch} ({entry.section})</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                                  <MapPin size={10} />
                                  <span>Room {entry.room}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] text-indigo-400 font-medium">
                                  <Clock size={10} />
                                  <span>{entry.startTime} - {entry.endTime}</span>
                                </div>
                              </div>
                           </div>
                        </div>
                      ) : (
                        <div className="h-full border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300">
                           <span className="text-[10px] uppercase font-medium tracking-widest italic">Free</span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Users({ size, className }: { size?: number, className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size || 24} 
            height={size || 24} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
    )
}
