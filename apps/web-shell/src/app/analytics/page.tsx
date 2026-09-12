import React from "react";
import Card from "@/components/ui/Card";
import { BarChart3, ChevronRight } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[10px] font-utility font-bold text-white/30 uppercase tracking-[0.1em] mb-1">
          Intelligence <ChevronRight size={12} className="text-white/20" /> Analytics
        </div>
        <h1 className="text-2xl font-display font-bold text-on-surface">Campus IQ</h1>
        <p className="text-xs text-secondary-container font-utility">Advanced institutional analytics and predictive modeling</p>
      </header>
      
      <Card className="flex-1 p-8 text-center bg-surface-container-low border-dashed border-2 border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <div className="max-w-md mx-auto py-12">
          <div className="w-16 h-16 bg-primary-indigo/10 text-primary-indigo rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-indigo/5">
            <BarChart3 size={32} />
          </div>
          <h2 className="text-xl font-display font-semibold text-on-surface mb-3">ML Engine Optimizing</h2>
          <p className="text-sm text-white/40 font-utility mb-8 leading-relaxed">
            The machine learning models are being fine-tuned for high-accuracy student performance prediction and resource optimization.
          </p>
          <button className="px-6 py-2 bg-indigo-gradient text-white rounded-lg font-utility font-bold text-sm shadow-ambient hover:opacity-90 transition-all active:scale-95">
            Run Preliminary Analysis
          </button>
        </div>
      </Card>
    </div>
  );
}
