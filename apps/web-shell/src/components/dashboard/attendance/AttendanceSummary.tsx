"use client";

import React from 'react';
import Card from '@/components/ui/Card';
import { Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Stats {
  pct: number;
  present: number;
  absent: number;
  total: number;
}

export default function AttendanceSummary({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <SummaryCard 
        label="Overall Pct" 
        value={`${stats.pct}%`} 
        icon={<Calendar size={20} />} 
        color="bg-indigo-50 text-indigo-600" 
      />
      <SummaryCard 
        label="Total Classes" 
        value={stats.total} 
        icon={<Clock size={20} />} 
        color="bg-slate-50 text-slate-600" 
      />
      <SummaryCard 
        label="Present" 
        value={stats.present} 
        icon={<CheckCircle size={20} />} 
        color="bg-emerald-50 text-emerald-600" 
      />
      <SummaryCard 
        label="Absent" 
        value={stats.absent} 
        icon={<XCircle size={20} />} 
        color="bg-rose-50 text-rose-600" 
      />
    </div>
  );
}

function SummaryCard({ label, value, icon, color }: any) {
  return (
    <Card className="p-6 border-none bg-white shadow-ambient flex items-center justify-between rounded-3xl group hover:scale-[1.02] transition-all">
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</h3>
        <span className="text-2xl font-display font-black text-slate-900 tracking-tight">{value}</span>
      </div>
      <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:rotate-12`}>
        {icon}
      </div>
    </Card>
  );
}
