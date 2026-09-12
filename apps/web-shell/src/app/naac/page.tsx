import React from "react";
import Card from "@/components/ui/Card";
import { FileText, ChevronRight } from "lucide-react";

export default function NAACPage() {
  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[10px] font-utility font-bold text-white/30 uppercase tracking-[0.1em] mb-1">
          Intelligence <ChevronRight size={12} className="text-white/20" /> NAAC Reports
        </div>
        <h1 className="text-2xl font-display font-bold text-on-surface">Accreditation Engine</h1>
        <p className="text-xs text-secondary-container font-utility">Automated documentation and compliance tracking for NAAC/NIRF</p>
      </header>
      
      <Card className="flex-1 p-8 text-center bg-surface-container-low border-dashed border-2 border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <div className="max-w-md mx-auto py-12">
          <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/5">
            <FileText size={32} />
          </div>
          <h2 className="text-xl font-display font-semibold text-on-surface mb-3">Compliance Matrix Mapping</h2>
          <p className="text-sm text-white/40 font-utility mb-8 leading-relaxed">
            We are mapping institutional data to the latest NAAC criteria to automate your self-study reports and institutional information for quality assessment.
          </p>
          <button className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-utility font-bold text-sm shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-all active:scale-95">
            Start Compliance Check
          </button>
        </div>
      </Card>
    </div>
  );
}
