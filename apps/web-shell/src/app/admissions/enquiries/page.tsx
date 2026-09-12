"use client";

import React, { useEffect, useState } from "react";
import { getEnquiries, updateEnquiryStatus } from "@/lib/api/admissions";
import EnquiryKanbanBoard from "@/components/admissions/EnquiryKanbanBoard";
import EnquiryForm from "@/components/admissions/EnquiryForm";
import { Search, Filter, Download, Loader2 } from "lucide-react";

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await getEnquiries();
      if (res.success) setEnquiries(res.data);
    } catch (err) {
      console.error("Failed to fetch enquiries", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string): Promise<boolean> => {
    try {
      const res = await updateEnquiryStatus(id, newStatus, "Status updated from Kanban Board");
      if (res.success) {
        setMessage("Enquiry status updated successfully.");
        fetchEnquiries();
        return true;
      }
      return false;
    } catch (err) {
      setMessage("Unable to update the status right now.");
      return false;
    }
  };

  return (
    <div className="space-y-8 h-full flex flex-col">
      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{message}</div>
      ) : null}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admissions Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Handle student enquiries, applications, and enrollment pipeline.</p>
        </div>

        <div className="flex items-center space-x-3">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search candidates..." 
                className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all w-64 shadow-sm"
              />
           </div>
           <button className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
             <Filter className="w-5 h-5" />
           </button>
           <button className="flex items-center space-x-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-semibold">
              <Download className="w-5 h-5" />
              <span>Export</span>
           </button>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center bg-white rounded-3xl border border-slate-200">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className="flex-1">
          <EnquiryKanbanBoard 
            initialEnquiries={enquiries} 
            onStatusChange={handleStatusChange} 
            onNewEnquiryClick={() => setShowEnquiryForm(true)} 
          />
        </div>
      )}

      {showEnquiryForm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
          <EnquiryForm onSuccess={fetchEnquiries} onClose={() => setShowEnquiryForm(false)} />
        </div>
      )}
    </div>
  );
}
