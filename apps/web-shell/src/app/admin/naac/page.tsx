"use client";

import React, { useEffect, useState } from "react";
import { fetchNaacDocuments, fetchNaacStats, uploadNaacDocument } from "@/lib/api/admin";
import ComplianceDocuments from "@/components/admin/ComplianceDocuments";
import { AlertCircle, BookOpen, Cpu, Loader2, ShieldCheck, Upload, X } from "lucide-react";

export default function NaacPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    criterion: "1",
    academicYear: "2025-26",
    description: "",
    fileUrl: "",
  });

  useEffect(() => {
    loadNaacData();
  }, []);

  const loadNaacData = async () => {
    try {
      setLoading(true);
      const [docRes, statRes] = await Promise.all([
        fetchNaacDocuments(),
        fetchNaacStats()
      ]);
      
      if (docRes.success) setDocuments(docRes.data);
      if (statRes.success) setStats(statRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const uploadToCloudinary = async (file: File) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "cms_materials";

    if (!cloudName) {
      throw new Error("Cloudinary cloud name is not configured");
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error?.message || "Failed to upload evidence file");
    }

    return data.secure_url as string;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setFeedback(null);

      if (!form.fileUrl) {
        throw new Error("Please upload an evidence file or provide a file URL.");
      }

      await uploadNaacDocument({
        title: form.title,
        criterion: form.criterion,
        academicYear: form.academicYear,
        description: form.description,
        fileUrl: form.fileUrl,
      });

      setForm({ title: "", criterion: "1", academicYear: "2025-26", description: "", fileUrl: "" });
      setShowUploadModal(false);
      setFeedback("Evidence uploaded successfully.");
      await loadNaacData();
    } catch (err: any) {
      setFeedback(err?.response?.data?.message || err.message || "Failed to upload evidence");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;

    try {
      setUploadingFile(true);
      setFeedback(null);
      const url = await uploadToCloudinary(file);
      setForm((prev) => ({ ...prev, fileUrl: url }));
    } catch (err: any) {
      setFeedback(err?.message || "Cloudinary upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <ShieldCheck size={16} className="text-indigo-600 fill-indigo-100" />
             <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em]">Internal Quality Assurance Cell</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase font-sans">NAAC Quality Vault</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Institutional Compliance & Accreditation Management</p>
        </div>

        <div className="flex items-center gap-3">
           <button onClick={() => setShowGuideModal(true)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
              <BookOpen size={14} /> Criterion Guide
           </button>
           <button onClick={() => setShowUploadModal(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-2xl shadow-slate-200 transition-all flex items-center gap-2">
              <Upload size={14} /> Upload Evidence
           </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 flex items-center gap-2">
          <AlertCircle size={16} className="text-amber-500" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {CRITERIA.map((c) => {
            const docCount = stats.find(s => s._id === c.id)?.count || 0;
            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-4xl p-6 shadow-sm hover:border-indigo-200 transition-colors group">
                 <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-indigo-500">Criterion {c.id}</span>
                    <Cpu size={14} className="text-slate-100 group-hover:text-indigo-100" />
                 </div>
                 <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-tight mb-4 min-h-6 group-hover:text-indigo-600">{c.title}</h3>
                 <div className="w-full bg-slate-50 h-1 rounded-full overflow-hidden">
                    <div className="bg-slate-900 h-full group-hover:bg-indigo-600 transition-all" style={{ width: `${Math.min(docCount * 10, 100)}%` }} />
                 </div>
                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-2">{docCount} Files Uploaded</p>
              </div>
            );
         })}
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
           <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Verifying Evidence Trail...</p>
        </div>
      ) : (
        <ComplianceDocuments documents={documents} />
      )}

      {showGuideModal && (
        <Dialog title="NAAC Criterion Guide" onClose={() => setShowGuideModal(false)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CRITERIA.map((criterion) => (
              <div key={criterion.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Criterion {criterion.id}</p>
                <p className="text-sm font-semibold text-slate-800">{criterion.title}</p>
              </div>
            ))}
          </div>
        </Dialog>
      )}

      {showUploadModal && (
        <Dialog title="Upload Evidence" onClose={() => setShowUploadModal(false)}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Title</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                  value={form.title}
                  onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Criterion</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                  value={form.criterion}
                  onChange={(event) => setForm((prev) => ({ ...prev, criterion: event.target.value }))}
                >
                  {CRITERIA.map((criterion) => (
                    <option key={criterion.id} value={String(criterion.id)}>Criterion {criterion.id}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Academic Year</label>
                <input
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                  value={form.academicYear}
                  onChange={(event) => setForm((prev) => ({ ...prev, academicYear: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Evidence File</label>
                <input
                  type="file"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 bg-white"
                  onChange={(event) => handleFileChange(event.target.files?.[0])}
                  required={!form.fileUrl}
                />
                <p className="mt-1 text-[10px] font-semibold text-slate-400">Uploads to Cloudinary if configured. You can also paste a file URL below.</p>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">File URL</label>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
                value={form.fileUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
                placeholder="Cloudinary or hosted file URL"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
              <textarea
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400 min-h-28"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest">Cancel</button>
              <button type="submit" disabled={submitting || uploadingFile} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60 flex items-center gap-2">
                {submitting || uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Save Evidence
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-4xl bg-white shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300 flex items-center justify-center">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const CRITERIA = [
  { id: 1, title: "Curricular Aspects" },
  { id: 2, title: "Teaching-Learning & Eval" },
  { id: 3, title: "Research, Innovations & Extension" },
  { id: 4, title: "Infrastructure & Learning Res" },
  { id: 5, title: "Student Support & Progression" },
  { id: 6, title: "Governance, Leadership & Management" },
  { id: 7, title: "Institutional Values & Best Practices" }
];
