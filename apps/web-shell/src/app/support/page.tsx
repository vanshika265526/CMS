import React from "react";
import Card from "@/components/ui/Card";
import { HelpCircle, ChevronRight, MessageSquare } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[10px] font-utility font-bold text-white/30 uppercase tracking-[0.1em] mb-1">
          System <ChevronRight size={12} className="text-white/20" /> Support
        </div>
        <h1 className="text-2xl font-display font-bold text-on-surface">Help & Support</h1>
        <p className="text-xs text-secondary-container font-utility">24/7 technical assistance and platform documentation</p>
      </header>
      
      <Card className="flex-1 p-8 text-center bg-surface-container-low border-dashed border-2 border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <div className="max-w-md mx-auto py-12">
          <div className="w-16 h-16 bg-primary-indigo/10 text-primary-indigo rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-indigo/5">
            <HelpCircle size={32} />
          </div>
          <h2 className="text-xl font-display font-semibold text-on-surface mb-3">Support Systems Active</h2>
          <p className="text-sm text-white/40 font-utility mb-8 leading-relaxed">
            Our support engineers are available round the clock. For immediate assistance, use the AI Assistant or open a high-priority ticket.
          </p>
          <div className="flex gap-4">
            <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-gradient text-white rounded-lg font-utility font-bold text-sm shadow-ambient hover:opacity-90 transition-all active:scale-95">
              <MessageSquare size={16} />
              <span>Open Ticket</span>
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white/5 text-white/60 rounded-lg font-utility font-bold text-sm hover:bg-white/10 transition-all border border-white/5">
              Documentation
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
