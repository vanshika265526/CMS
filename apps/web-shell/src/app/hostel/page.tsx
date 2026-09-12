import React from "react";
import Card from "@/components/ui/Card";
import { Home, ChevronRight } from "lucide-react";

export default function HostelPage() {
  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-[10px] font-utility font-bold text-white/30 uppercase tracking-[0.1em] mb-1">
          Operations <ChevronRight size={12} className="text-white/20" /> Hostel
        </div>
        <h1 className="text-2xl font-display font-bold text-on-surface">Hostel Management</h1>
        <p className="text-xs text-secondary-container font-utility">Accommodation planning, mess management and security tracking</p>
      </header>
      
      <Card className="flex-1 p-8 text-center bg-surface-container-low border-dashed border-2 border-white/5 rounded-2xl flex flex-col items-center justify-center min-h-[400px]">
        <div className="max-w-md mx-auto py-12">
          <div className="w-16 h-16 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-orange-500/5">
            <Home size={32} />
          </div>
          <h2 className="text-xl font-display font-semibold text-on-surface mb-3">Facility Mapping Active</h2>
          <p className="text-sm text-white/40 font-utility mb-8 leading-relaxed">
            The hostel module is being populated with 3D campus maps for intelligent room allocation and automated maintenance requests.
          </p>
          <button className="px-6 py-2 bg-orange-500 text-white rounded-lg font-utility font-bold text-sm shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all active:scale-95">
            Initiate Mapping
          </button>
        </div>
      </Card>
    </div>
  );
}
