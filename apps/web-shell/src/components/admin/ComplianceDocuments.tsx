"use client";

import React from "react";
import { FileText, ExternalLink, Calendar, CheckCircle2, Clock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComplianceDocumentsProps {
  documents: any[];
}

export default function ComplianceDocuments({ documents }: ComplianceDocumentsProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileText size={20} />
               </div>
               <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Accreditation Evidence Vault</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Criterion-wise documentation for NAAC Cycle 2</p>
               </div>
            </div>
            <button className="text-[9px] font-black text-slate-400 hover:text-slate-900 uppercase tracking-widest transition-colors">Audit History</button>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {documents.map((doc) => (
             <div key={doc._id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-slate-200 hover:shadow-xl transition-all group relative">
                <div className="flex items-start justify-between mb-4">
                   <div className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded tracking-widest">
                      Criterion {doc.criterion}
                   </div>
                   <div className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex items-center gap-1", 
                      doc.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                   )}>
                      {doc.status === 'APPROVED' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      {doc.status}
                   </div>
                </div>

                <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight mb-2 truncate pr-8">{doc.title}</h4>
                <p className="text-[9px] font-medium text-slate-400 line-clamp-2 leading-relaxed mb-6">{doc.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                   <div className="flex items-center gap-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <Calendar size={12} /> {doc.academicYear}
                   </div>
                   <a 
                     href={doc.fileUrl} 
                     target="_blank" 
                     className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 text-[9px] font-black uppercase tracking-widest"
                   >
                      View Evidence <ExternalLink size={10} />
                   </a>
                </div>
                
                <button className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all">
                   <MoreHorizontal size={16} />
                </button>
             </div>
           ))}

           {documents.length === 0 && (
             <div className="md:col-span-2 py-20 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-3xl">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Zero evidence entries for selected filters</p>
             </div>
           )}
         </div>
      </div>
    </div>
  );
}
