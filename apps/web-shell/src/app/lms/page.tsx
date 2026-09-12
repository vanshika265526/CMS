import React from "react";
import Card from "@/components/ui/Card";
import { GraduationCap, ChevronRight } from "lucide-react";

export default function LMSPage() {
  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[10px] font-utility font-bold text-white/30 uppercase tracking-[0.1em] mb-1">
          Academic <ChevronRight size={12} className="text-white/20" /> LMS
        </div>
        <h1 className="text-2xl font-display font-bold text-on-surface">Learning Management</h1>
        <p className="text-xs text-secondary-container font-utility">Next-gen learning environment for students and faculty</p>
      </header>
      
      <Card className="flex-1 p-8 text-center bg-surface-container-low border-dashed border-2 border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <div className="max-w-md mx-auto py-12">
          <div className="w-16 h-16 bg-indigo-gradient rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-indigo/20">
            <GraduationCap size={32} className="text-white" />
          </div>
          <h2 className="text-xl font-display font-semibold text-on-surface mb-3">LMS Integration in Progress</h2>
          <p className="text-sm text-white/40 font-utility mb-8 leading-relaxed">
            The Learning Management System is being integrated with shared course resources, interactive assessments, and AI tutoring.
          </p>
          <button className="px-6 py-2 bg-indigo-gradient text-white rounded-lg font-utility font-bold text-sm shadow-ambient hover:opacity-90 transition-all active:scale-95">
            Try Beta Version
          </button>
        </div>
      </Card>
    </div>
  );
}
