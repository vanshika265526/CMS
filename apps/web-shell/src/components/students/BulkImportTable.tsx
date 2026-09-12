// FILE: apps/web-shell/src/components/students/BulkImportTable.tsx
import React from "react";
import Card from "@/components/ui/Card";
import { AlertCircle, CheckCircle2, ChevronRight, User } from "lucide-react";

interface BulkImportTableProps {
  data: any[];
}

export default function BulkImportTable({ data }: BulkImportTableProps) {
  return (
    <Card className="p-0 border-none bg-surface-container-low overflow-hidden shadow- ambient">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant/30">
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.15em]">Student Name</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.15em]">Course / Batch</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.15em]">Contact Info</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.15em]">Parent Details</th>
              <th className="px-6 py-4 text-[10px] font-bold text-on-surface/30 uppercase tracking-[0.15em]">Validation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {data.map((row, i) => {
              const hasErrors = !row.firstName || !row.email || !row.course;
              
              return (
                <tr key={i} className="hover:bg-white transition-all group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-lg bg-black/10 text-black flex items-center justify-center font-bold text-xs uppercase">
                         {row.firstName?.[0] || "?"}{row.lastName?.[0] || "?"}
                       </div>
                       <div>
                         <p className="text-sm font-bold text-on-surface">{row.firstName} {row.lastName}</p>
                         <p className="text-[10px] font-bold text-on-surface/30 uppercase leading-none">{row.gender}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-on-surface underline decoration-black/30 underline-offset-4">{row.course}</p>
                    <p className="text-[10px] font-bold text-on-surface/40 uppercase tracking-tighter mt-1">{row.batch}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[11px] font-bold text-on-surface/60">{row.email}</p>
                    <p className="text-[10px] font-bold text-on-surface/30 tabular-nums">{row.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-on-surface/80">{row.parentName}</p>
                    <p className="text-[10px] font-bold text-on-surface/30 uppercase tracking-tight">{row.relation}</p>
                  </td>
                  <td className="px-6 py-4">
                    {hasErrors ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase">
                        <AlertCircle size={14} /> Critical Data Missing
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase">
                        <CheckCircle2 size={14} /> Ready to Import
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="py-20 text-center flex flex-col items-center justify-center">
           <AlertCircle size={32} className="text-on-surface/10 mb-4" />
           <p className="text-sm font-bold text-on-surface/20 uppercase tracking-widest leading-none">Your CSV preview will appear here</p>
        </div>
      )}
    </Card>
  );
}
