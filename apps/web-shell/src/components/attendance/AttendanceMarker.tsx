'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, Save, ChevronDown, Calendar, Loader2 } from 'lucide-react';
import { fetchMyBatches, fetchMySubjects } from '@/lib/api/teacher';
import { getStudents } from '@/lib/api/students';
import { markBulkAttendance } from '@/lib/api/attendance';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentRecord {
  id: string;
  name: string;
  rollNumber: string;
  status: AttendanceStatus | null;
}

// ── Status Button Component ────────────────────────────────────────────────
function StatusButton({
  value, current, onChange,
}: { value: AttendanceStatus; current: AttendanceStatus | null; onChange: (v: AttendanceStatus) => void }) {
  const config = {
    present: { icon: <Check size={14} />, label: 'P', active: 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20', idle: 'border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 bg-slate-50' },
    absent:  { icon: <X size={14} />,     label: 'A', active: 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-600/20',     idle: 'border-slate-200 text-slate-400 hover:border-rose-400 hover:text-rose-500 bg-slate-50' },
    late:    { icon: <Clock size={14} />,  label: 'L', active: 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20',  idle: 'border-slate-200 text-slate-400 hover:border-amber-400 hover:text-amber-500 bg-slate-50' },
    excused: { icon: <Calendar size={14} />, label: 'E', active: 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20', idle: 'border-slate-200 text-slate-400 hover:border-indigo-400 hover:text-indigo-500 bg-slate-50' },
  };
  const c = config[value];
  const isActive = current === value;
  return (
    <button
      onClick={() => onChange(value)}
      className={cn(
        "w-10 h-10 rounded-xl border font-bold text-xs flex items-center justify-center transition-all duration-300",
        isActive ? c.active : c.idle
      )}
      title={value}
    >
      {c.label}
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AttendanceMarker() {
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initial Data Fetch — only batches (subjects load per-batch on selection)
  useEffect(() => {
    async function init() {
      try {
        const batchRes = await fetchMyBatches();
        setBatches(Array.isArray(batchRes.data) ? batchRes.data : (batchRes.data || []));
      } catch (err) {
        console.error("Failed to load assigned batches", err);
      }
    }
    init();
  }, []);

  // Load subjects when batch changes (strict: only subjects assigned in that batch)
  useEffect(() => {
    if (!selectedBatch) {
      setSubjects([]);
      setSelectedSubject('');
      return;
    }
    async function loadSubjects() {
      try {
        const subRes = await fetchMySubjects(selectedBatch);
        const data = Array.isArray(subRes.data) ? subRes.data : [];
        console.log("[TEACHER_SUBJECTS_LOADED]", { batchId: selectedBatch, count: data.length });
        setSubjects(data);
      } catch (err) {
        console.error("Failed to load assigned subjects", err);
      }
    }
    loadSubjects();
  }, [selectedBatch]);
  // Fetch Students when Parameters Change
  useEffect(() => {
    setIsSaved(false); // Reset saved state on any param change
    if (!selectedBatch) {
      setStudents([]);
      return;
    }
    async function fetchRoster() {
      setLoading(true);
      try {
        const res = await getStudents({ batchId: selectedBatch });
        const roster = (res.data || []).map((s: any) => ({
          id: s._id,
          name: `${s.personalInfo.firstName} ${s.personalInfo.lastName}`,
          rollNumber: s.uniqueStudentId,
          status: null
        }));
        setStudents(roster);
      } catch (err) {
        console.error("Failed to fetch roster");
      } finally {
        setLoading(false);
      }
    }
    fetchRoster();
  }, [selectedBatch, selectedSubject, selectedDate]);

  const isConfigured = selectedBatch && selectedSubject && selectedDate;
  const total = students.length;
  const marked = students.filter(s => s.status !== null).length;
  const presentCount = students.filter(s => s.status === 'present' || s.status === 'late').length;
  const absentCount = students.filter(s => s.status === 'absent').length;

  const markAll = (status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => ({ ...s, status })));
  };

  const updateStudentStatus = (id: string, status: AttendanceStatus) => {
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  };

  const handleSave = async () => {
    if (marked < total || isSaved) return; // Guard: prevent double-submission
    setIsSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const batchData = batches.find(b => b._id === selectedBatch);
      
      const payload = {
        batchId: selectedBatch,
        courseId: typeof batchData?.courseId === 'object' ? batchData.courseId._id : (batchData?.courseId || ''),
        subjectId: selectedSubject,
        teacherId: user.id || '60b8d295f13a3c1a488c0b71',
        date: selectedDate,
        records: students.map(s => {
          let status: 'Present' | 'Absent' | 'Leave' = 'Present';
          if (s.status === 'absent') status = 'Absent';
          else if (s.status === 'excused') status = 'Leave';
          else if (s.status === 'present' || s.status === 'late') status = 'Present';
          
          return {
            studentId: s.id,
            status,
            remarks: ''
          };
        })
      };

      const res = await markBulkAttendance(payload);
      if (res.success) {
        setIsSaved(true);
        // NO timeout reset — isSaved stays true until teacher changes batch/subject/date
        // This prevents re-submission of the same session
      }
    } catch (err) {
      console.error("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Config Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Target Batch</label>
          <div className="relative group">
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 pr-12 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
            >
              <option value="">Select Cluster...</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Academic Subject</label>
          <div className="relative group">
            <select
              value={selectedSubject}
              onChange={e => setSelectedSubject(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 pr-12 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all cursor-pointer"
            >
              <option value="">Select Domain...</option>
              {subjects.map((s, idx) => {
                 const sid = s?._id || s?.subjectId || s?.id || `sub-${idx}`;
                 const sName = s?.name || s?.subjectName || 'Unknown Subject';
                 const sCode = s?.code || s?.subjectCode || '';
                 return <option key={sid} value={sid}>{sName} {sCode ? `(${sCode})` : ''}</option>;
              })}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Reference Date</label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition-all"
            />
          </div>
        </div>
      </div>

      {/* ── Attendance Sheet ── */}
      <AnimatePresence mode="wait">
        {!isConfigured ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50"
          >
            <Calendar className="w-16 h-16 text-slate-200 mb-6" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Awaiting Parameters</p>
            <p className="text-slate-500 mt-2 text-sm font-medium">Select a batch, subject, and date to initialize the roster.</p>
          </motion.div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">fetching roster data...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Sheet Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex flex-wrap justify-between items-center gap-4 bg-slate-50/30">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-left">Processing State</p>
                  <p className="text-sm font-black text-slate-900">{marked} / {total} Mapped</p>
                </div>
                <div className="h-10 w-px bg-slate-200 hidden sm:block" />
                <div className="flex items-center gap-6">
                  <span className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 uppercase tracking-wider">{presentCount} Presence</span>
                  <span className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 uppercase tracking-wider">{absentCount} Absence</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => markAll('present')} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm">All Present</button>
                <button onClick={() => markAll('absent')} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 bg-white text-rose-600 border border-rose-200 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">All Absent</button>
              </div>
            </div>

            {/* Student Rows */}
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {students.map((student, idx) => (
                <div
                  key={student.id}
                  className={cn(
                    "flex items-center justify-between px-8 py-5 hover:bg-slate-50/80 transition-all duration-300",
                    student.status === 'present' && "border-l-4 border-emerald-500 bg-emerald-50/10",
                    student.status === 'absent' && "border-l-4 border-rose-500 bg-rose-50/10",
                    student.status === 'late' && "border-l-4 border-amber-500 bg-amber-50/10",
                    student.status === 'excused' && "border-l-4 border-indigo-500 bg-indigo-50/10",
                    !student.status && "border-l-4 border-transparent"
                  )}
                >
                  <div className="flex items-center gap-5">
                    <span className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-900 text-sm leading-tight">{student.name}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">ID# {student.rollNumber}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <StatusButton value="present" current={student.status} onChange={s => updateStudentStatus(student.id, s)} />
                    <StatusButton value="late"    current={student.status} onChange={s => updateStudentStatus(student.id, s)} />
                    <StatusButton value="excused" current={student.status} onChange={s => updateStudentStatus(student.id, s)} />
                    <StatusButton value="absent"  current={student.status} onChange={s => updateStudentStatus(student.id, s)} />
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 bg-slate-100/50 border-t border-slate-100 flex justify-between items-center gap-10">
              <div className="flex-1 max-w-sm">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  <span>Aggregation Pipeline</span>
                  <span>{marked} / {total} Verified</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    className="h-full bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/20"
                    initial={{ width: 0 }}
                    animate={{ width: `${(marked / total) * 100}%` }}
                    transition={{ type: 'spring', damping: 20 }}
                  />
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={marked < total || isSaving || isSaved}
                className={cn(
                  "flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl group",
                  isSaved
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/30 disabled:opacity-40 disabled:hover:scale-100 hover:scale-[1.02] active:scale-95'
                )}
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isSaved ? (
                  <><Check size={16} /> Session Locked — Change Subject to Continue</>
                ) : (
                  <>
                    <Save size={16} /> 
                    <span>Deploy Presence Log</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
