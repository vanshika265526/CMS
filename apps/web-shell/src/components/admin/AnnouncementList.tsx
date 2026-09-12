"use client";

import React from "react";
import { Megaphone, Users, Calendar, MoreHorizontal, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnouncementListProps {
  announcements: any[];
}

export default function AnnouncementList({ announcements }: AnnouncementListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Institutional Broadcasts</h3>
         <button className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Manage Queue</button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {announcements.map((item) => (
          <div key={item._id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group">
             <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Megaphone size={18} />
                   </div>
                   <div>
                      <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{item.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                         <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{item.targetClass || 'all'}</span>
                         <span className="w-1 h-1 rounded-full bg-slate-200" />
                         <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   {item.pinned && <Pin size={14} className="text-indigo-500 fill-indigo-500 rotate-45" />}
                   <button className="text-slate-300 hover:text-slate-900 transition-colors">
                      <MoreHorizontal size={16} />
                   </button>
                </div>
             </div>
             
             <p className="text-[10px] font-medium text-slate-600 leading-relaxed line-clamp-2 mb-4">
                {item.body || item.content}
             </p>

             <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 rounded-full bg-slate-900 text-[7px] flex items-center justify-center text-white font-black">
                      A
                   </div>
                   <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sent by {item.senderId?.name || "Admin"}</span>
                </div>
                <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                   Read Full Path
                </button>
             </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
             <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-slate-200 shadow-sm mb-4">
                <Megaphone size={24} />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Active Announcements</p>
          </div>
        )}
      </div>
    </div>
  );
}
