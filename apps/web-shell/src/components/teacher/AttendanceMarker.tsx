"use client";

import React, { useState } from "react";
import { User, CheckCircle, XCircle, Clock, AlertTriangle, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface Student {
  _id: string;
  name: string;
  studentId?: string;
  uniqueStudentId?: string;
}

interface AttendanceRecord {
  studentId: string;
  status: 'Present' | 'Absent' | 'Leave';
  note?: string;
}

interface AttendanceMarkerProps {
  students: Student[];
  initialRecords?: AttendanceRecord[];
  onSubmit: (records: AttendanceRecord[]) => void;
  isSubmitting?: boolean;
}

export default function AttendanceMarker({ students, initialRecords, onSubmit, isSubmitting }: AttendanceMarkerProps) {
  const [records, setRecords] = React.useState<Record<string, { status: 'Present' | 'Absent' | 'Leave'; note: string }>>({});
  
  React.useEffect(() => {
    if (initialRecords && initialRecords.length > 0) {
      const initial: Record<string, { status: 'Present' | 'Absent' | 'Leave'; note: string }> = {};
      initialRecords.forEach(r => {
        initial[r.studentId] = { status: r.status, note: r.note || "" };
      });
      setRecords(initial);
    }
  }, [initialRecords]);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const toggleStatus = (studentId: string, status: 'Present' | 'Absent' | 'Leave') => {
    setRecords(prev => ({
      ...prev,
      [studentId]: { status, note: prev[studentId]?.note || "" }
    }));
  };

  const updateNote = (studentId: string, note: string) => {
    setRecords(prev => {
      if (!prev[studentId]) return prev;
      return {
        ...prev,
        [studentId]: { ...prev[studentId], note }
      };
    });
  };

  const markAll = (status: 'Present' | 'Absent' | 'Leave') => {
    const next: Record<string, { status: 'Present' | 'Absent' | 'Leave'; note: string }> = {};
    students.forEach(s => {
      next[s._id] = { status, note: "" };
    });
    setRecords(next);
  };

  const reset = () => {
    setRecords({});
  };

  const presentCount = Object.values(records).filter(s => s.status === 'Present').length;
  const absentCount = Object.values(records).filter(s => s.status === 'Absent').length;
  const leaveCount = Object.values(records).filter(s => s.status === 'Leave').length;
  const unmarkedCount = students.length - (presentCount + absentCount + leaveCount);

  const percentage = students.length > 0 
    ? ((presentCount / students.length) * 100).toFixed(1)
    : "0.0";

  const preSubmitCheck = () => {
    if (unmarkedCount > 0) {
      setShowWarningModal(true);
    } else {
      executeSubmit();
    }
  };

  const executeSubmit = () => {
    setShowWarningModal(false);
    
    // Auto mark unmarked as absent based on user rules
    const formattedRecords: AttendanceRecord[] = students.map(s => {
      const rec = records[s._id];
      return {
        studentId: s._id,
        status: rec?.status || 'Absent',
        note: rec?.note || ""
      };
    });
    
    onSubmit(formattedRecords);
  };

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl shadow-slate-900/10 text-white">
        <div className="flex items-center gap-6 overflow-x-auto pb-2 md:pb-0">
           <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Format</span>
              <span className="text-2xl font-black">{students.length}</span>
           </div>
           
           <div className="h-10 w-px bg-slate-700 shrink-0"></div>
           
           <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Present</span>
              <span className="text-lg font-bold text-emerald-50">{presentCount}</span>
           </div>
           
           <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Absent</span>
              <span className="text-lg font-bold text-rose-50">{absentCount}</span>
           </div>
           
           <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Leave</span>
              <span className="text-lg font-bold text-amber-50">{leaveCount}</span>
           </div>
           
           <div className="h-10 w-px bg-slate-700 shrink-0"></div>
           
           <div className="flex flex-col shrink-0">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Attending</span>
              <span className="text-2xl font-black text-white">{percentage}%</span>
           </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
           <button 
             onClick={() => markAll('Present')}
             className="px-5 py-3 text-[10px] uppercase tracking-widest font-black bg-white/10 text-white rounded-xl hover:bg-white/20 hover:text-white transition-all active:scale-95"
           >
             Mark All Present
           </button>
           <button 
             onClick={reset}
             className="px-5 py-3 text-[10px] uppercase tracking-widest font-black bg-transparent border border-white/20 text-slate-300 rounded-xl hover:bg-white/5 transition-all"
           >
             Clear All
           </button>
        </div>
      </div>

      {/* Student List View */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16 text-center">#</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Profile</th>
              <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-[400px]">Matrix Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {students.map((student, index) => {
              const rec = records[student._id];
              const status = rec?.status;
              const note = rec?.note;
              
              const isUnmarked = !status;
              
              return (
                <tr 
                  key={student._id} 
                  className={cn(
                    "transition-colors hover:bg-slate-50/50",
                    isUnmarked && "border-l-4 border-l-orange-400 bg-orange-50/10",
                    status === 'Present' && "bg-emerald-50/20",
                    status === 'Absent' && "bg-rose-50/20",
                    status === 'Leave' && "bg-amber-50/20"
                  )}
                >
                  <td className="p-5 text-[11px] font-black text-slate-500 text-center font-mono">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm",
                        status === 'Present' ? "bg-emerald-100 text-emerald-600" :
                        status === 'Absent' ? "bg-rose-100 text-rose-600" :
                        status === 'Leave' ? "bg-amber-100 text-amber-600" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{student.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 font-mono">
                          ID: {student.studentId || student.uniqueStudentId || student._id.slice(-6).toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <StatusButton 
                          active={status === 'Present'} 
                          onClick={() => toggleStatus(student._id, 'Present')}
                          type="Present"
                        />
                        <StatusButton 
                          active={status === 'Absent'} 
                          onClick={() => toggleStatus(student._id, 'Absent')}
                          type="Absent"
                        />
                        <StatusButton 
                          active={status === 'Leave'} 
                          onClick={() => toggleStatus(student._id, 'Leave')}
                          type="Leave"
                        />
                      </div>
                      
                      {(status === 'Absent' || status === 'Leave') && (
                        <input
                          type="text"
                          placeholder="Add optional note (max 100 chars)..."
                          maxLength={100}
                          value={note || ""}
                          onChange={(e) => updateNote(student._id, e.target.value)}
                          className="w-full mt-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-slate-300 transition-all"
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end pt-4">
         <button
           onClick={preSubmitCheck}
           disabled={isSubmitting || students.length === 0}
           className="px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
         >
           {isSubmitting ? (
             <><div className="w-4 h-4 border-2 border-slate-400 border-t-white rounded-full animate-spin" /> Transmitting...</>
           ) : (
             <><Send size={16} /> Submit Matrix Log</>
           )}
         </button>
      </div>

      {/* Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowWarningModal(false)} />
          <div className="bg-white max-w-md w-full rounded-[2.5rem] p-8 shadow-2xl relative z-10 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl flex items-center justify-center mb-6">
               <AlertTriangle size={28} />
            </div>
            <h2 className="text-xl font-black text-slate-900">Incomplete Matrix</h2>
            <p className="text-slate-500 font-medium text-sm mt-3 leading-relaxed">
              <strong className="text-slate-900">{unmarkedCount} students</strong> are currently unmarked. If you proceed, they will automatically be recorded as <strong className="text-rose-600">Absent</strong>.
            </p>
            
            <div className="flex items-center gap-3 mt-8">
              <button 
                onClick={() => setShowWarningModal(false)}
                className="flex-1 py-4 bg-slate-50 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={executeSubmit}
                className="flex-1 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all active:scale-95"
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusButton({ active, onClick, type }: { active: boolean, onClick: () => void, type: 'Present'|'Absent'|'Leave' }) {
  const isPresent = type === 'Present';
  const isAbsent = type === 'Absent';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all border",
        active && isPresent ? "bg-emerald-500 border-emerald-500 text-emerald-50 shadow-md shadow-emerald-500/20" :
        active && isAbsent ? "bg-rose-500 border-rose-500 text-rose-50 shadow-md shadow-rose-500/20" :
        active ? "bg-amber-500 border-amber-500 text-amber-50 shadow-md shadow-amber-500/20" :
        "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 hover:bg-slate-50"
      )}
    >
      {type === 'Present' && <CheckCircle size={14} />}
      {type === 'Absent' && <XCircle size={14} />}
      {type === 'Leave' && <Clock size={14} />}
      <span className="hidden sm:inline">{type}</span>
      <span className="sm:hidden">{type.charAt(0)}</span>
    </button>
  );
}
