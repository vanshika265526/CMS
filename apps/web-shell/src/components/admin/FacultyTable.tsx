"use client";

import React from "react";
import { MoreHorizontal, Mail, Phone, Book, Briefcase, Trash2, Edit2, Shield, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface FacultyTableProps {
  faculties: any[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onAssign: (id: string) => void;
  onView: (id: string) => void;
}

export default function FacultyTable({ faculties, onDelete, onEdit, onAssign, onView }: FacultyTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee Info</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Employee ID</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Dept & Subjects</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Experience</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {faculties.map((faculty) => (
            <tr key={faculty._id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-slate-200 grayscale hover:grayscale-0 transition-all">
                    {faculty.personalInfo.name[0]}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{faculty.personalInfo.name}</p>
                    <p className="text-[9px] font-medium text-slate-400">{faculty.personalInfo.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                 <span className="text-[10px] font-black text-slate-700 font-mono tracking-tighter bg-slate-100 px-2 py-0.5 rounded">
                   {faculty.employeeId}
                 </span>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">{faculty.department}</p>
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                     {faculty.assignedSubjects?.length || 0} Subjects Assigned
                  </p>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                   <Briefcase size={12} className="text-slate-400" />
                   {faculty.experience} Years
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                  faculty.status === "Active" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  faculty.status === "On-Leave" ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                  {faculty.status}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onView(faculty._id)}
                      className="p-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-100 transition-all shadow-sm"
                      title="View Profile Stats"
                    >
                      <Eye size={14} />
                    </button>
                    <button 
                      onClick={() => onAssign(faculty._id)}
                     className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg border border-transparent hover:border-indigo-100 transition-all"
                     title="Assign Subjects"
                   >
                     <Book size={14} />
                   </button>
                   <button 
                     onClick={() => onEdit(faculty._id)}
                     className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                     title="Edit Record"
                   >
                     <Edit2 size={14} />
                   </button>
                   <button 
                     onClick={() => onDelete(faculty._id)}
                     className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-rose-100 transition-all"
                     title="Mark Retired/Resigned"
                   >
                     <Trash2 size={14} />
                   </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {faculties.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center bg-white">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
              <Shield size={32} />
           </div>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Faculty Records Found</p>
        </div>
      )}
    </div>
  );
}
