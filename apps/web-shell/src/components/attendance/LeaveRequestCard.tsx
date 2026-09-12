// FILE: apps/web-shell/src/components/attendance/LeaveRequestCard.tsx
"use client";

import React from "react";
import Card from "@/components/ui/Card";
import { User, Calendar, FileText, Check, X, Eye } from "lucide-react";
import { format } from "date-fns";

interface Props {
  leave: any;
  onReview: (id: string, status: "approved" | "rejected") => void;
  isAdmin?: boolean;
}

export default function LeaveRequestCard({ leave, onReview, isAdmin = false }: Props) {
  const statusColors: any = {
    pending: "bg-amber-100 text-amber-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700"
  };

  return (
    <Card className="p-6 bg-surface-container-lowest border-none shadow-ambient group transition-all hover:bg-secondary-container/5">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-on-surface/20">
            <User size={24} />
          </div>
          <div>
            <h4 className="font-display font-bold text-on-surface">
              {leave.studentId.personalInfo.firstName} {leave.studentId.personalInfo.lastName}
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColors[leave.status]}`}>
              {leave.status}
            </span>
          </div>
        </div>
        
        {leave.supportingDoc && (
          <a 
            href={leave.supportingDoc} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-3 bg-surface-container-low rounded-xl text-primary-indigo hover:bg-primary-indigo hover:text-white transition-all shadow-sm"
          >
            <Eye size={18} />
          </a>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
         <div className="p-3 bg-surface-container-low/50 rounded-xl">
            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest mb-1 flex items-center gap-1">
               <Calendar size={10} /> Date Range
            </p>
            <p className="text-xs font-bold text-on-surface">
              {format(new Date(leave.fromDate), "MMM d")} - {format(new Date(leave.toDate), "MMM d")}
            </p>
         </div>
         <div className="p-3 bg-surface-container-low/50 rounded-xl">
            <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest mb-1 flex items-center gap-1">
               <FileText size={10} /> Reason
            </p>
            <p className="text-xs font-bold text-on-surface truncate">{leave.reason}</p>
         </div>
      </div>

      {isAdmin && leave.status === "pending" && (
        <div className="flex gap-2">
           <button 
             onClick={() => onReview(leave._id, "approved")}
             className="flex-1 py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all active:scale-95"
           >
             <Check size={16} /> Approve
           </button>
           <button 
             onClick={() => onReview(leave._id, "rejected")}
             className="flex-1 py-2.5 border-2 border-red-500/20 text-red-500 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition-all active:scale-95"
           >
             <X size={16} /> Reject
           </button>
        </div>
      )}
    </Card>
  );
}
