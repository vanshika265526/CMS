"use client";

import React, { useState } from "react";
import { updateEnquiryStatus } from "@/lib/api/admissions";
import Card from "@/components/ui/Card";
import { X, Loader2, Clock3, Mail, Phone, BookOpen, MessageSquare, CheckCircle2, FilterX } from "lucide-react";

interface EnquiryDrawerProps {
  enquiry: any;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUS_OPTIONS = ["New", "Contacted", "Interested", "applied", "admitted", "NotInterested"];

export default function EnquiryDrawer({ enquiry, onClose, onUpdate }: EnquiryDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(String(enquiry?.status || "New"));
  const [note, setNote] = useState("");

  if (!enquiry) return null;

  const courseName = typeof enquiry.courseInterest === "string" ? enquiry.courseInterest : enquiry.courseInterest?.name || "-";

  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await updateEnquiryStatus(enquiry._id, status, note.trim() || undefined);
      if (res.success) {
        onUpdate();
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enquiry Details</p>
            <h3 className="text-2xl font-black text-slate-900">{enquiry.name}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <Card className="p-5 border border-slate-200 bg-slate-50 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
              <Clock3 size={14} /> Created {new Date(enquiry.createdAt).toLocaleString()}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                <Mail size={16} className="text-slate-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                  <p className="font-semibold text-slate-900">{enquiry.email}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3">
                <Phone size={16} className="text-slate-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Phone</p>
                  <p className="font-semibold text-slate-900">{enquiry.phone}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center gap-3 md:col-span-2">
                <BookOpen size={16} className="text-slate-400" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Interest</p>
                  <p className="font-semibold text-slate-900">{courseName}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
            <h4 className="text-lg font-black text-slate-900">Update Status</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {STATUS_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-black uppercase tracking-widest transition-all ${
                    status === option
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:bg-white focus:border-indigo-300"
                placeholder="Add a counseling note or follow-up instruction"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              Save Changes
            </button>
          </Card>

          <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
              <MessageSquare size={14} /> Notes History
            </div>
            <div className="space-y-3">
              {Array.isArray(enquiry.notes) && enquiry.notes.length ? enquiry.notes.map((item: any, index: number) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-700">{item.content}</p>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
                  No notes recorded yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}