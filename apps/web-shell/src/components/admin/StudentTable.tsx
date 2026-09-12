"use client";

import React from "react";
import { MoreHorizontal, Mail, Phone, MapPin, Calendar, Trash2, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentTableProps {
  students: any[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onUpdateEnrollmentId: (id: string, enrollmentId: string) => Promise<void>;
}

export default function StudentTable({ students, onDelete, onEdit, onUpdateEnrollmentId }: StudentTableProps) {
  const [editingEnrollmentId, setEditingEnrollmentId] = React.useState<string | null>(null);
  const [draftEnrollmentId, setDraftEnrollmentId] = React.useState<string>("");

  return (
    <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50 border-b border-slate-100">
          <tr>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-12">S.No</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student Info</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Student ID</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Course & Batch</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Parent Details</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {students.map((student, index) => (
            <tr key={student._id} className="hover:bg-slate-50 transition-colors group">
              <td className="px-6 py-4">
                <p className="text-[10px] font-bold text-slate-500">{String(index + 1).padStart(2, '0')}</p>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white overflow-hidden shadow-sm">
                    {student.personalInfo.photo ? (
                      <img src={student.personalInfo.photo} alt={student.personalInfo.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-xs">
                        {student.personalInfo?.name?.[0] || student.personalInfo?.firstName?.[0] || '?'}
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">
                      {student.personalInfo?.name || `${student.personalInfo?.firstName} ${student.personalInfo?.lastName}`}
                    </p>
                    <p className="text-[9px] font-medium text-slate-400">{student.personalInfo?.email}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                {editingEnrollmentId === student.uniqueStudentId ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={draftEnrollmentId}
                      onChange={(e) => setDraftEnrollmentId(e.target.value)}
                      className="px-2 py-1 border border-slate-200 rounded text-[10px] font-black font-mono w-44"
                    />
                    <button
                      onClick={async () => {
                        try {
                          await onUpdateEnrollmentId(student.uniqueStudentId, draftEnrollmentId);
                          setEditingEnrollmentId(null);
                        } catch {
                          // Keep editor open so admin can correct duplicate/invalid values.
                        }
                      }}
                      className="p-1 rounded bg-emerald-50 text-emerald-600"
                      title="Confirm"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingEnrollmentId(null);
                        setDraftEnrollmentId("");
                      }}
                      className="p-1 rounded bg-slate-100 text-slate-500"
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingEnrollmentId(student.uniqueStudentId);
                      setDraftEnrollmentId(student.enrollmentId || student.studentId || student.uniqueStudentId || "");
                    }}
                    className="text-[10px] font-black text-slate-700 font-mono tracking-tighter bg-slate-100 px-2 py-0.5 rounded active:scale-95 transition-transform"
                    title="Click to edit enrollment ID"
                  >
                    {student.enrollmentId || student.studentId || student.uniqueStudentId || "N/A"}
                  </button>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">
                    {student.academicInfo?.course || "General"}
                  </p>
                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                    {student.academicInfo?.batch || "N/A"}
                  </p>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="space-y-1 min-w-56">
                  <p className="text-[10px] font-bold text-slate-900 uppercase tracking-tight">
                    {student.parentInfo?.name || "N/A"}
                  </p>
                  <p className="text-[9px] font-medium text-slate-500">
                    {student.parentInfo?.relation || "Guardian"}
                  </p>
                  <p className="text-[9px] font-medium text-slate-400">
                    {student.parentInfo?.phone || "No phone"}
                  </p>
                  <p className="text-[9px] font-medium text-slate-400 break-all">
                    {student.parentInfo?.email || "No email"}
                  </p>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
                  (student.academicInfo?.status?.toLowerCase() === "active" || student.status === "Active") ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  student.academicInfo?.status?.toLowerCase() === "dropped" ? "bg-rose-50 text-rose-600 border-rose-100" :
                  "bg-amber-50 text-amber-600 border-amber-100"
                )}>
                  {student.academicInfo?.status || student.status || "active"}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEdit(student.uniqueStudentId)}
                      className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onDelete(student.uniqueStudentId)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-rose-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {students.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center bg-white">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
              <Users size={32} />
           </div>
           <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Student Records Found</p>
        </div>
      )}
    </div>
  );
}

import { Users } from "lucide-react";
