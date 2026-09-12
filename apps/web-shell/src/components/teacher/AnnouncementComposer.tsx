"use client";

import React, { useState } from "react";
import { Megaphone, Send, Clock, AlertCircle, CheckCircle2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnouncementComposerProps {
  onPost: (data: { title: string, body: string, targetClass: string, priority: string }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function AnnouncementComposer({ onPost, isSubmitting }: AnnouncementComposerProps) {
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    targetClass: "all",
    priority: "Normal"
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    setError("");

    try {
      await onPost(formData);
      setSuccess(true);
      setFormData({ title: "", body: "", targetClass: "all", priority: "Normal" });
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to post announcement");
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
         <div className="p-2.5 bg-slate-900 text-white rounded-2xl shadow-lg shadow-slate-900/10">
            <Megaphone size={20} />
         </div>
         <div>
            <h3 className="text-lg font-bold text-slate-900">Compose Announcement</h3>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-0.5">Reach your students instantly</p>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Title</label>
              <input 
                type="text" 
                required
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="e.g. Schedule Change for Monday"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-slate-100 outline-none transition-all font-medium"
              />
           </div>
           
           <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Priority</label>
              <div className="flex items-center gap-2 p-1 bg-slate-50 border border-slate-100 rounded-2xl">
                 {['Normal', 'Important', 'Urgent'].map(p => (
                   <button
                     key={p}
                     type="button"
                     onClick={() => setFormData({...formData, priority: p})}
                     className={cn(
                       "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                       formData.priority === p 
                         ? "bg-white text-slate-900 shadow-sm border border-slate-100" 
                         : "text-slate-400 hover:text-slate-600"
                     )}
                   >
                     {p}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="space-y-1.5">
           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Audience</label>
           <div className="flex items-center gap-3">
              <select 
                value={formData.targetClass}
                onChange={e => setFormData({...formData, targetClass: e.target.value})}
                className="flex-1 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none font-bold text-slate-700"
              >
                <option value="all">All My Classes</option>
                <option value="65e1234567890abcdef12345">Batch 2024 (A)</option>
                <option value="65e1234567890abcdef12346">Batch 2024 (B)</option>
              </select>
              <div className="px-4 py-3 bg-slate-900 text-white rounded-2xl flex items-center gap-2">
                 <Users size={16} />
                 <span className="text-[10px] font-black uppercase tracking-widest">Broadcast</span>
              </div>
           </div>
        </div>

        <div className="space-y-1.5">
           <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Message Body</label>
           <textarea 
             required
             rows={5}
             value={formData.body}
             onChange={e => setFormData({...formData, body: e.target.value})}
             placeholder="Write your announcement details here..."
             className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none resize-none focus:ring-2 focus:ring-slate-100 transition-all font-medium"
           />
        </div>

        <div className="flex items-center justify-between pt-2">
           <div className="flex-1">
              {success && (
                <p className="text-xs font-bold text-green-600 flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  Announcement posted successfully!
                </p>
              )}
              {error && (
                <p className="text-xs font-bold text-red-600 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </p>
              )}
           </div>
           
           <button 
             type="submit"
             disabled={isSubmitting}
             className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all flex items-center gap-3 disabled:opacity-50"
           >
             {isSubmitting ? "Broadcasting..." : "Confirm & Post"}
             <Send size={14} />
           </button>
        </div>
      </form>
    </div>
  );
}
