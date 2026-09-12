"use client";

import React from "react";
import { User, Layers, Calendar, FileText, CreditCard, MessageSquare } from "lucide-react";

interface StudentProfileTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hideFees?: boolean;
}

const tabs = [
  { id: "overview", label: "Overview", icon: <User size={16} /> },
  { id: "academics", label: "Academics", icon: <Layers size={16} /> },
  { id: "attendance", label: "Attendance", icon: <Calendar size={16} /> },
  { id: "fees", label: "Fees", icon: <CreditCard size={16} /> },
  { id: "documents", label: "Documents", icon: <FileText size={16} /> },
  { id: "comms", label: "Communication", icon: <MessageSquare size={16} /> },
];

export default function StudentProfileTabs({ activeTab, setActiveTab, hideFees = false }: StudentProfileTabsProps) {
  const visibleTabs = hideFees ? tabs.filter((tab) => tab.id !== "fees") : tabs;

  return (
    <div className="flex border-b border-slate-100 gap-1 overflow-x-auto no-scrollbar scroll-smooth px-4">
      {visibleTabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-6 py-4 text-xs font-bold uppercase tracking-wider transition-all relative shrink-0 ${
            activeTab === tab.id 
            ? "text-indigo-600" 
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-t-xl"
          }`}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.3)] animate-in slide-in-from-bottom-1 duration-300" />
          )}
        </button>
      ))}
    </div>
  );
}
