// FILE: apps/web-shell/src/app/admissions/applications/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { getApplications } from "@/lib/api/admissions";
import Card from "@/components/ui/Card";
import AdmissionStatusBadge from "@/components/admissions/AdmissionStatusBadge";
import ApplicationDrawer from "@/components/admissions/ApplicationDrawer";
import { 
  Search, 
  ChevronRight, 
  FileText, 
  User, 
  Layers, 
  Calendar,
  ExternalLink,
  Loader2
} from "lucide-react";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("pending");

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    try {
      const res = await getApplications({ status: statusFilter });
      if (res.success) setApplications(res.data);
    } catch (err) {
      console.error("Failed to fetch applications", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-utility font-bold text-on-surface/30 uppercase tracking-[0.1em] mb-1">
            Admissions <ChevronRight size={12} className="text-on-surface/20" /> Applications
          </div>
          <h1 className="text-2xl font-display font-bold text-on-surface">Application Processing</h1>
        </div>

        <div className="flex bg-surface-container-low p-1 rounded-xl shadow-sm border border-outline-variant">
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                statusFilter === status 
                ? "bg-white text-primary-indigo shadow-sm" 
                : "text-on-surface/40 hover:text-on-surface"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant">
          <Loader2 className="animate-spin text-primary-indigo" size={32} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pr-2 custom-scrollbar pb-8">
          {applications.map((app) => (
            <Card key={app._id} className="p-0 border-none bg-surface-container-lowest hover:shadow-ambient transition-all group flex flex-col h-full">
              {/* Card Header */}
              <div className="p-6 pb-4 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-gradient text-white rounded-xl flex items-center justify-center font-bold text-sm">
                    {app.studentDetails.firstName[0]}{app.studentDetails.lastName[0]}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">{app.studentDetails.firstName} {app.studentDetails.lastName}</h3>
                    <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-tighter">Applied {new Date(app.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <AdmissionStatusBadge status={app.status} />
              </div>

              {/* Card Body */}
              <div className="px-6 flex-1 space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-on-surface/60 bg-surface-container-low px-3 py-1.5 rounded-lg border border-outline-variant/30">
                  <Layers size={14} className="text-on-surface/20" />
                  {app.assignedCourse} — {app.assignedBatch}
                </div>
                
                <div className="grid grid-cols-2 gap-3 pb-6 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface/40 uppercase">
                    <FileText size={12} className="text-on-surface/20" />
                    {app.documents.length} Documents
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface/40 uppercase">
                    <User size={12} className="text-on-surface/20" />
                    {app.enquiryRef?.source || "online"}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-4">
                <button 
                  onClick={() => setSelectedApp(app)}
                  className="w-full py-2.5 bg-surface-container-low text-[10px] font-bold text-on-surface/60 uppercase tracking-widest rounded-xl hover:bg-primary-indigo hover:text-white transition-all flex items-center justify-center gap-2 group/btn"
                >
                  Process Application <ExternalLink size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </Card>
          ))}
          {applications.length === 0 && (
            <div className="col-span-full py-20 text-center bg-surface-container-low/30 rounded-3xl border-2 border-dashed border-outline-variant">
              <p className="text-sm font-bold text-on-surface/20 uppercase tracking-widest">No {statusFilter} applications found.</p>
            </div>
          )}
        </div>
      )}

      {selectedApp && (
        <ApplicationDrawer 
          application={selectedApp} 
          onClose={() => setSelectedApp(null)} 
          onUpdate={fetchApplications} 
        />
      )}
    </div>
  );
}
