import React from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  description: string;
  className?: string;
}

export default function StatsCard({ icon, label, value, trend, description, className }: StatsCardProps) {
  return (
    <div className={cn("bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded">{trend}</span>
      </div>
      
      <div className="space-y-1">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <h4 className="text-2xl font-black text-slate-900 tracking-tighter">{value}</h4>
        <p className="text-[10px] font-medium text-slate-400 leading-none pt-1">{description}</p>
      </div>
    </div>
  );
}
