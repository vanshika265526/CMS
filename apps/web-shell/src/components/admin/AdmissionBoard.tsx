"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Filter, MoreHorizontal, User, FileCheck, CheckCircle2, XCircle } from "lucide-react";
import { fetchApplications, updateApplicationStatus } from "@/lib/api/admin";
import { cn } from "@/lib/utils";

const STAGES = [
  { id: "Applied", label: "New Applications", icon: User, color: "text-blue-500", bg: "bg-blue-50" },
  { id: "DocsVerified", label: "Docs Verified", icon: FileCheck, color: "text-amber-500", bg: "bg-amber-50" },
  { id: "Approved", label: "Approved", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
  { id: "Rejected", label: "Rejected", icon: XCircle, color: "text-rose-500", bg: "bg-rose-50" },
];

export default function AdmissionBoard() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const res = await fetchApplications();
      if (res.success) setApplications(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await updateApplicationStatus(id, newStatus);
      loadApplications();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="h-64 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-400">Loading Funnel...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 h-full items-start">
      {STAGES.map((stage) => {
        const stageApps = applications.filter(app => app.status === stage.id);
        return (
          <div key={stage.id} className="flex flex-col gap-4 min-w-[280px]">
             {/* Stage Header */}
             <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                   <div className={cn("w-2 h-2 rounded-full", stage.color.replace("text-", "bg-"))} />
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900">{stage.label}</h3>
                   <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{stageApps.length}</span>
                </div>
                <button className="text-slate-400 hover:text-slate-900 transition-colors">
                   <MoreHorizontal size={14} />
                </button>
             </div>

             {/* Application Cards */}
             <div className="space-y-4">
                {stageApps.length === 0 ? (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center bg-slate-50/50">
                     <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">No candidates</p>
                  </div>
                ) : (
                  stageApps.map((app) => (
                    <div key={app._id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-b-4" style={{ borderColor: stage.color.split(" ")[0].replace("text-", "#") }}>
                       <div className="flex justify-between items-start mb-3">
                          <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{app.personalDetails.name}</h4>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">#{app._id.slice(-4)}</span>
                       </div>
                       
                       <div className="space-y-2">
                          <div className="flex items-center gap-2 text-[9px] font-medium text-slate-500">
                             <GraduationCap size={10} /> {app.courseId?.name || "B.Tech CS"}
                          </div>
                          <p className="text-[9px] font-medium text-slate-400 line-clamp-1">{app.personalDetails.address}</p>
                       </div>

                       <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex -space-x-1">
                             {app.documents?.map((doc: any, i: number) => (
                               <div key={i} className="w-5 h-5 rounded-full bg-slate-100 border border-white flex items-center justify-center text-[7px] font-bold text-slate-400 uppercase" title={doc.type}>
                                  {doc.type[0]}
                               </div>
                             ))}
                          </div>
                          
                          <select 
                            value={app.status} 
                            onChange={(e) => handleStatusChange(app._id, e.target.value)}
                            className="text-[9px] font-black text-slate-900 uppercase tracking-widest bg-slate-50 border-none rounded px-2 py-1 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                             {STAGES.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                          </select>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        );
      })}
    </div>
  );
}

// Just to avoid missing icon error
import { GraduationCap } from "lucide-react";
