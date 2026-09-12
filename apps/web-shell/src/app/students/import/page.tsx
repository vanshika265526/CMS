// FILE: apps/web-shell/src/app/students/import/page.tsx
"use client";

import React, { useState } from "react";
import { bulkImportStudents } from "@/lib/api/students";
import { Upload, ChevronLeft, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import BulkImportTable from "@/components/students/BulkImportTable";

export default function StudentImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Basic CSV Preview (Mocking for UI, actual parsing happens on backend)
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const rows = text.split("\n").slice(1, 6); // Preview first 5 rows
        const mockData = rows.map(r => {
          const cols = r.split(",");
          return { firstName: cols[0], lastName: cols[1], email: cols[2], course: cols[4], batch: cols[5], relation: cols[10] };
        });
        setPreviewData(mockData);
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await bulkImportStudents(formData);
      if (res.success) {
        setResult(res.data);
        setMessage("Student import completed successfully.");
      } else {
        setMessage(res.message || "Unable to import students right now.");
      }
    } catch (err) {
      setMessage("Unable to import students right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{message}</div>
      ) : null}

      <header>
        <Link 
          href="/students" 
          className="flex items-center gap-2 text-[10px] font-utility font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-2 hover:text-black transition-colors"
        >
          <ChevronLeft size={12} /> Back to Directory
        </Link>
        <h1 className="text-3xl font-display font-bold text-on-surface tracking-tight flex items-center gap-4">
          <Upload className="text-black" size={32} />
          Bulk Data Onboarding
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-8 bg-surface-container-lowest border-none shadow-ambient">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-widest mb-6">1. Upload CSV</h3>
            <div className="relative border-2 border-dashed border-outline-variant rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-black/40 hover:bg-surface-container-low transition-all cursor-pointer group">
               <input type="file" accept=".csv" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
               <div className="w-12 h-12 bg-surface-container-low text-on-surface/20 rounded-xl flex items-center justify-center group-hover:bg-black/10 group-hover:text-black transition-all">
                  <FileText size={24} />
               </div>
               <p className="text-xs font-bold text-on-surface/40 uppercase tracking-tighter">
                 {file ? file.name : "Select Student CSV"}
               </p>
            </div>
          </Card>

          <Card className="p-8 bg-surface-container-low/50 border-none">
             <h3 className="text-xs font-bold text-on-surface/40 uppercase tracking-[0.2em] mb-4">Instructions</h3>
             <ul className="space-y-3">
                 <li className="text-[11px] font-bold text-on-surface/60 flex gap-2">
                   <div className="w-4 h-4 rounded-full bg-black/10 text-black flex items-center justify-center text-[10px] shrink-0">1</div>
                   Use the standard template (firstName, lastName, email, etc.)
                </li>
                <li className="text-[11px] font-bold text-on-surface/60 flex gap-2">
                   <div className="w-4 h-4 rounded-full bg-black/10 text-black flex items-center justify-center text-[10px] shrink-0">2</div>
                   Ensure unique email addresses for all students.
                </li>
                <li className="text-[11px] font-bold text-on-surface/60 flex gap-2">
                   <div className="w-4 h-4 rounded-full bg-black/10 text-black flex items-center justify-center text-[10px] shrink-0">3</div>
                   Department IDs must match existing system IDs.
                </li>
             </ul>
          </Card>
        </div>

        {/* Preview & Results */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <BulkImportTable data={previewData} />
          
          <div className="flex justify-end pt-4">
             <button 
               disabled={!file || loading}
               onClick={handleImport}
               className="bg-white text-black border-2 border-black px-10 py-4 rounded-2xl font-bold text-sm shadow-xl flex items-center gap-3 hover:bg-surface-container-low active:scale-95 transition-all disabled:opacity-30 disabled:pointer-events-none"
             >
               {loading ? <Loader2 size={18} className="animate-spin text-black" /> : <><CheckCircle size={20} className="text-black" /> Start Import Process</>}
             </button>
          </div>

          {result && (
            <Card className="p-2 border-none bg-emerald-500/10 animate-in zoom-in-95 duration-500">
               <div className="flex items-center gap-4 p-4 text-emerald-500">
                  <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-lg border border-white/20">
                     <CheckCircle size={24} />
                  </div>
                  <div>
                     <h4 className="text-lg font-display font-bold">Import Success</h4>
                     <p className="text-xs font-bold uppercase tracking-tight opacity-70">
                       {result.imported} Students enrolled • {result.errors.length} Failures recorded
                     </p>
                  </div>
               </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
