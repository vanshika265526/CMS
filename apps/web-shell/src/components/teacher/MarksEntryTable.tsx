"use client";

import React, { useState } from "react";
import { User, Save, CheckCircle2, AlertCircle, Send, Edit2 } from "lucide-react";
import GradeBadge from "./GradeBadge";
import { cn } from "@/lib/utils";

interface Student {
  _id: string;
  name: string;
  rollNumber: string;
}

interface MarksEntryTableProps {
  students: Student[];
  onSaveRow: (studentId: string, marks: number, remarks: string) => Promise<void>;
  onBulkSubmit: (data: { studentId: string, marks: number, remarks: string }[]) => Promise<void>;
  onEditSubmitted?: (studentId: string, marks: number, remarks: string) => Promise<void>;
  maxMarks: number;
  submittedMarks?: Record<string, { marks: number, remarks: string, markId?: string }>;
  isEditMode?: boolean;
}

export default function MarksEntryTable({ 
  students, 
  onSaveRow, 
  onBulkSubmit,
  onEditSubmitted,
  maxMarks,
  submittedMarks = {},
  isEditMode = false
}: MarksEntryTableProps) {
  const [entries, setEntries] = useState<Record<string, { marks: string, remarks: string, status: 'idle' | 'saving' | 'saved' | 'error', isEditing: boolean }>>({});
  const [savingAll, setSavingAll] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  // Sync entries when students prop changes
  React.useEffect(() => {
    const initial: any = {};
    students.forEach(s => {
      const submitted = submittedMarks[s._id];
      initial[s._id] = {
        marks: submitted ? submitted.marks.toString() : "",
        remarks: submitted ? submitted.remarks : "",
        status: 'idle',
        isEditing: false
      };
    });
    setEntries(initial);
  }, [students, submittedMarks]);

  const handleInputChange = (studentId: string, field: 'marks' | 'remarks', value: string) => {
    setEntries(prev => ({
      ...prev,
      [studentId]: prev[studentId] ? { ...prev[studentId], [field]: value, status: 'idle' } : { marks: "", remarks: "", [field]: value, status: 'idle', isEditing: false }
    }));
  };

  const calculateGrade = (marks: string) => {
    if (!marks) return null;
    const m = parseFloat(marks);
    if (isNaN(m)) return null;
    const percentage = (m / maxMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  };

  const saveRow = async (studentId: string) => {
    const entry = entries[studentId];
    if (!entry || !entry.marks) return;
    
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], status: 'saving' } }));
    try {
      await onSaveRow(studentId, parseFloat(entry.marks), entry.remarks);
      setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], status: 'saved' } }));
    } catch (err) {
      setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], status: 'error' } }));
    }
  };

  const updateSubmittedMarks = async (studentId: string) => {
    const entry = entries[studentId];
    if (!entry || !entry.marks || !onEditSubmitted) return;
    
    setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], status: 'saving' } }));
    try {
      await onEditSubmitted(studentId, parseFloat(entry.marks), entry.remarks);
      setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], status: 'saved', isEditing: false } }));
      setEditingStudentId(null);
    } catch (err) {
      setEntries(prev => ({ ...prev, [studentId]: { ...prev[studentId], status: 'error' } }));
    }
  };

  const saveAllRows = async () => {
    const payload = students
      .map((student) => {
        const entry = entries[student._id];
        const marks = Number(entry?.marks);
        if (!entry || entry.marks === '' || Number.isNaN(marks) || marks > maxMarks) {
          return null;
        }
        return {
          studentId: student._id,
          marks,
          remarks: entry.remarks || '',
        };
      })
      .filter(Boolean) as { studentId: string; marks: number; remarks: string }[];

    if (payload.length === 0) return;

    setSavingAll(true);
    try {
      await onBulkSubmit(payload);
      setEntries((prev) => {
        const next: any = { ...prev };
        payload.forEach((row) => {
          if (next[row.studentId]) {
            next[row.studentId].status = 'saved';
          }
        });
        return next;
      });
    } finally {
      setSavingAll(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest w-16">#</th>
            <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Student</th>
            <th className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest w-32">Marks ({maxMarks})</th>
            <th className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest w-24">Grade</th>
            <th className="p-4 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Remarks</th>
            <th className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest w-24">Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student, index) => {
            const entry = entries[student._id] || { marks: "", remarks: "", status: 'idle', isEditing: false };
            const submitted = submittedMarks[student._id];
            const isEditing = entry.isEditing || editingStudentId === student._id;
            const displayMarks = entry.marks || (submitted?.marks?.toString() || "");
            const displayRemarks = entry.remarks || (submitted?.remarks || "");
            const grade = calculateGrade(entry.marks || displayMarks);
            const isError = (entry.marks || displayMarks) ? parseFloat(entry.marks || displayMarks) > maxMarks : false;
            const isSubmitted = submitted && !entry.marks;

            return (
              <tr key={student._id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-sm font-bold text-slate-400">{String(index + 1).padStart(2, '0')}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{student.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">{student.rollNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="relative flex items-center gap-2">
                    <input
                      type="number"
                      value={displayMarks}
                      onChange={(e) => handleInputChange(student._id, 'marks', e.target.value)}
                      readOnly={isSubmitted && !isEditing}
                      placeholder="00"
                      className={cn(
                        "flex-1 px-3 py-2 text-center text-sm font-bold border rounded-xl focus:ring-2 outline-none transition-all",
                        isSubmitted && !isEditing && "bg-slate-50 cursor-not-allowed",
                        isError 
                          ? "border-red-300 bg-red-50 text-red-600 focus:ring-red-100" 
                          : "border-slate-200 focus:border-slate-900 focus:ring-slate-100"
                      )}
                    />
                    {isSubmitted && !isEditing && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">SUBMITTED</span>
                    )}
                    {isError && (
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                         Exceeds Max!
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4 text-center">
                  {grade && <GradeBadge grade={grade} />}
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    value={displayRemarks}
                    onChange={(e) => handleInputChange(student._id, 'remarks', e.target.value)}
                    readOnly={isSubmitted && !isEditing}
                    placeholder="Add brief remarks..."
                    className={cn(
                      "w-full px-3 py-2 text-sm border-b border-transparent outline-none transition-all bg-transparent",
                      isSubmitted && !isEditing && "cursor-not-allowed",
                      !isSubmitted || isEditing ? "hover:border-slate-200 focus:border-slate-900 focus:bg-slate-50/50" : ""
                    )}
                  />
                </td>
                <td className="p-4 text-center">
                  {isSubmitted && !isEditing ? (
                    <button
                      onClick={() => {
                        setEditingStudentId(student._id);
                        setEntries(prev => ({
                          ...prev,
                          [student._id]: {
                            marks: submitted.marks.toString(),
                            remarks: submitted.remarks,
                            status: 'idle',
                            isEditing: true
                          }
                        }));
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 mx-auto"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                  ) : isEditing && isSubmitted ? (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => updateSubmittedMarks(student._id)}
                        disabled={entry.status === 'saving' || !displayMarks || isError}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          entry.status === 'saved' 
                            ? "text-green-600 bg-green-50" 
                            : entry.status === 'error'
                            ? "text-red-600 bg-red-50"
                            : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                        )}
                      >
                        {entry.status === 'saving' ? (
                          <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <CheckCircle2 size={18} />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingStudentId(null);
                          setEntries(prev => ({
                            ...prev,
                            [student._id]: {
                              marks: '',
                              remarks: '',
                              status: 'idle',
                              isEditing: false
                            }
                          }));
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-600 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => saveRow(student._id)}
                      disabled={entry.status === 'saving' || !displayMarks || isError}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 mx-auto",
                        entry.status === 'saved' 
                          ? "text-green-600 bg-green-50" 
                          : entry.status === 'error'
                          ? "text-red-600 bg-red-50"
                          : "text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      {entry.status === 'saving' ? (
                        <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                      ) : entry.status === 'saved' ? (
                        <>
                          <CheckCircle2 size={16} />
                          Saved
                        </>
                      ) : entry.status === 'error' ? (
                        <>
                          <AlertCircle size={16} />
                          Error
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save
                        </>
                      )}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
        <div className="text-sm text-slate-600">
          {students.length > 0 && (
            <>
              <span className="font-bold">{Object.values(entries).filter(e => e.status === 'saved').length}</span>
              <span> of {students.length} saved</span>
            </>
          )}
        </div>
        <button
          onClick={saveAllRows}
          disabled={savingAll}
          className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60"
        >
          {savingAll ? 'Saving...' : 'Save All'}
        </button>
      </div>
    </div>
  );
}
