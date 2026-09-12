import React from "react";
import Card from "@/components/ui/Card";
import { Sparkles, ChevronRight } from "lucide-react";

export default function AIAssistantPage() {
  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[10px] font-utility font-bold text-white/30 uppercase tracking-widest mb-1">
          Intelligence <ChevronRight size={12} className="text-white/20" /> AI Assistant
        </div>
        <h1 className="text-2xl font-display font-bold text-on-surface">NGCMS AI</h1>
        <p className="text-xs text-secondary-container font-utility">Conversational interface for institutional data exploration</p>
      </header>
      
      <Card className="flex-1 p-8 text-center bg-surface-container-low border-dashed border-2 border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-100">
        <div className="max-w-md mx-auto py-12">
          <div className="w-16 h-16 bg-white/10 text-primary-indigo rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-indigo/10">
            <Sparkles size={32} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-display font-semibold text-on-surface mb-3">Preparing your AI assistant</h2>
          <p className="text-sm text-white/40 font-utility mb-8 leading-relaxed">
            The AI assistant is learning your institution's specific data schema to provide more accurate and contextual responses.
          </p>
          <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden mb-8">
            <div className="bg-indigo-gradient w-2/3 h-full animate-progress" />
          </div>
          <p className="text-[10px] text-white/20 font-utility uppercase tracking-widest">Setting up your knowledge context...</p>
        </div>
      </Card>
    </div>
  );
}
