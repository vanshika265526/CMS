"use client";

import React, { useState, useEffect } from "react";
import { User, BookOpen, ChevronRight, Hash, Calendar, MoreHorizontal, UserPlus } from "lucide-react";
import { motion } from "framer-motion";

interface Enquiry {
  _id: string;
  name: string;
  courseInterest?: { _id?: string; name?: string } | string;
  phone: string;
  email: string;
  source: string;
  status: string;
  createdAt: string;
  studentId?: string;
}

interface KanbanBoardProps {
  initialEnquiries: Enquiry[];
  onStatusChange: (id: string, newStatus: string) => Promise<boolean>;
  onNewEnquiryClick?: () => void;
  onEnquiryClick?: (enquiry: Enquiry) => void;
}

const COLUMNS = [
  { id: 'New', title: 'New', color: 'bg-blue-500' },
  { id: 'Contacted', title: 'Contacted', color: 'bg-amber-400' },
  { id: 'Interested', title: 'Interested', color: 'bg-purple-500' },
  { id: 'applied', title: 'Applied', color: 'bg-indigo-500' },
  { id: 'admitted', title: 'Admitted', color: 'bg-emerald-500' },
  { id: 'NotInterested', title: 'Not Interested', color: 'bg-rose-500' }
];

export default function EnquiryKanbanBoard({ initialEnquiries, onStatusChange, onNewEnquiryClick, onEnquiryClick }: KanbanBoardProps) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>(initialEnquiries);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    setEnquiries(initialEnquiries);
  }, [initialEnquiries]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    setDraggedId(null);

    const targetEnquiry = enquiries.find(eq => eq._id === id);
    if (!targetEnquiry || targetEnquiry.status === newStatus) return;

    // Optimistic Update
    const previousState = [...enquiries];
    setEnquiries(current => 
      current.map(eq => (eq._id === id ? { ...eq, status: newStatus } : eq))
    );

    // Backend Update
    const success = await onStatusChange(id, newStatus);
    if (!success) setEnquiries(previousState);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Admission CRM</h3>
          <p className="text-sm text-slate-500">Manage student leads and enrollment pipeline</p>
        </div>
        {onNewEnquiryClick && (
          <button 
            onClick={onNewEnquiryClick}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>New Enquiry</span>
          </button>
        )}
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-5 overflow-x-auto pb-4 custom-scrollbar h-full">
        {COLUMNS.map((col) => {
          const cards = enquiries.filter(e => e.status === col.id);
          return (
            <div 
              key={col.id} 
              className="flex-shrink-0 w-[300px] flex flex-col h-full max-h-[600px]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <header className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.color}`} />
                  <span className="font-bold text-slate-600 text-xs uppercase tracking-wider">{col.title}</span>
                  <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{cards.length}</span>
                </div>
                <MoreHorizontal className="w-4 h-4 text-slate-300 cursor-pointer hover:text-slate-500 transition-colors" />
              </header>

              <div className={`flex-1 bg-slate-50 rounded-2xl p-3 border border-slate-200/60 overflow-y-auto custom-scrollbar flex flex-col gap-3 transition-colors ${draggedId ? 'bg-indigo-50/30' : ''}`}>
                {cards.map((enquiry) => (
                  <motion.div
                    layoutId={enquiry._id}
                    key={enquiry._id}
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, enquiry._id)}
                    onDragEnd={() => setDraggedId(null)}
                    whileHover={{ y: -4 }}
                    className={`p-4 rounded-xl border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing group transition-all bg-white hover:border-indigo-300 ${draggedId === enquiry._id ? 'opacity-50' : 'opacity-100'}`}
                    onClick={() => onEnquiryClick?.(enquiry)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                         <div className="w-8 h-8 rounded-full flex items-center justify-center bg-indigo-50 text-indigo-600">
                           <User className="w-4 h-4" />
                         </div>
                         <h4 className="font-semibold text-slate-800 line-clamp-1 text-sm">{enquiry.name}</h4>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>

                    <div className="space-y-2 text-xs text-slate-500">
                      <div className="flex items-center space-x-2">
                        <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{typeof enquiry.courseInterest === 'string' ? enquiry.courseInterest : enquiry.courseInterest?.name || 'Course inquiry'}</span>
                      </div>
                      
                      {enquiry.studentId ? (
                        <div className="flex items-center space-x-2 text-emerald-600 font-mono font-bold text-[10px] bg-emerald-100/50 px-2 py-1 rounded-lg w-fit">
                          <Hash className="w-3 h-3" />
                          <span>{enquiry.studentId}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(enquiry.createdAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 flex justify-end">
                      <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-1 bg-slate-50 text-slate-400 rounded">
                        {enquiry.status}
                      </span>
                    </div>
                  </motion.div>
                ))}
                
                {cards.length === 0 && !draggedId && (
                  <div className="flex flex-col items-center justify-center h-24 text-slate-300 text-xs font-semibold gap-2 border border-dashed border-slate-200 rounded-xl my-2">
                    No candidates
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
