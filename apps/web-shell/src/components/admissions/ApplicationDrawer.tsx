// FILE: apps/web-shell/src/components/admissions/ApplicationDrawer.tsx
"use client";

import React, { useState } from "react";
import { updateApplicationStatus } from "@/lib/api/admissions";
import AdmissionStatusBadge from "./AdmissionStatusBadge";
import { X, FileText, CheckCircle, XCircle, Loader2, Calendar, Phone, Mail, MapPin } from "lucide-react";
import Card from "@/components/ui/Card";

interface ApplicationDrawerProps {
  application: any;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ApplicationDrawer({ application, onClose, onUpdate }: ApplicationDrawerProps) {
  const [loading, setLoading] = useState(false);

  const handleStatusUpdate = async (status: string) => {
    setLoading(true);
    try {
      const res = await updateApplicationStatus(application._id, status);
      if (res.success) {
        onUpdate();
        onClose();
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  if (!application) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-surface h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-6 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white font-display font-bold text-lg">
              {application.studentDetails.firstName[0]}{application.studentDetails.lastName[0]}
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-on-surface">
                {application.studentDetails.firstName} {application.studentDetails.lastName}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <AdmissionStatusBadge status={application.status} />
                <span className="text-[10px] font-bold text-on-surface/30 uppercase tracking-widest leading-none mt-0.5">
                  ID: {application._id.slice(-8).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-lg text-on-surface/40 hover:text-on-surface transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Section: Academic Info */}
          <section>
            <h4 className="text-xs font-bold text-on-surface/40 uppercase tracking-widest mb-4">Academic Interest</h4>
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 bg-surface-container-low border-none">
                <p className="text-[10px] font-bold text-on-surface/30 uppercase mb-1">Course</p>
                <p className="text-sm font-bold text-on-surface">{application.assignedCourse}</p>
              </Card>
              <Card className="p-4 bg-surface-container-low border-none">
                <p className="text-[10px] font-bold text-on-surface/30 uppercase mb-1">Batch</p>
                <p className="text-sm font-bold text-on-surface">{application.assignedBatch}</p>
              </Card>
            </div>
          </section>

          {/* Section: Personal Details */}
          <section>
            <h4 className="text-xs font-bold text-on-surface/40 uppercase tracking-widest mb-4">Personal Details</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <Calendar size={18} className="text-on-surface/20" />
                <span className="text-on-surface/60 w-24">Date of Birth:</span>
                <span className="font-bold text-on-surface">{new Date(application.studentDetails.dob).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Mail size={18} className="text-on-surface/20" />
                <span className="text-on-surface/60 w-24">Email:</span>
                <span className="font-bold text-on-surface">{application.studentDetails.email}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <Phone size={18} className="text-on-surface/20" />
                <span className="text-on-surface/60 w-24">Phone:</span>
                <span className="font-bold text-on-surface">{application.studentDetails.phone}</span>
              </div>
              <div className="flex items-start gap-4 text-sm">
                <MapPin size={18} className="text-on-surface/20 mt-0.5" />
                <span className="text-on-surface/60 w-24">Address:</span>
                <span className="font-bold text-on-surface flex-1">{application.studentDetails.address}</span>
              </div>
            </div>
          </section>

          {/* Section: Documents */}
          <section>
            <h4 className="text-xs font-bold text-on-surface/40 uppercase tracking-widest mb-4">Submitted Documents</h4>
            <div className="grid grid-cols-1 gap-3">
              {application.documents.map((doc: any, i: number) => (
                <a
                  key={i}
                  href={doc.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-white rounded-2xl border border-outline-variant hover:border-black/30 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-black/10 text-black rounded-lg">
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{doc.name}</p>
                      <p className="text-[10px] text-on-surface/40 uppercase font-bold">Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-black opacity-0 group-hover:opacity-100 transition-opacity">
                    VIEW DOCUMENT
                  </div>
                </a>
              ))}
              {application.documents.length === 0 && (
                <p className="text-sm text-on-surface/30 italic py-4 text-center">No documents uploaded.</p>
              )}
            </div>
          </section>
        </div>

        {/* Actions Footer */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant flex gap-4">
          <button
            disabled={loading || application.status === "rejected"}
            onClick={() => handleStatusUpdate("rejected")}
            className="flex-1 py-4 bg-white text-red-500 rounded-2xl font-bold text-sm border border-red-500/20 hover:bg-red-500/5 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><XCircle size={18} /> Reject Application</>}
          </button>
          <button
            disabled={loading || application.status === "approved"}
            onClick={() => handleStatusUpdate("approved")}
            className="flex-[1.5] py-4 bg-white text-emerald-600 border-2 border-emerald-500/50 rounded-2xl font-bold text-sm shadow-xl hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin text-emerald-600" /> : <><CheckCircle size={18} className="text-emerald-600" /> Approve & Allot Seat</>}
          </button>
        </div>
      </div>
    </div>
  );
}
