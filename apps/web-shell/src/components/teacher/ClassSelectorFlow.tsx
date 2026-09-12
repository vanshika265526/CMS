'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, BookOpen, Clock, CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Props {
  onSelectionComplete: (selection: { batchId: string; subjectId: string; lecture: number; date: Date, batch: any, subject: any }) => void;
  initialSelection?: { batchId?: string, subjectId?: string, lecture?: number };
}

export default function ClassSelectorFlow({ onSelectionComplete, initialSelection }: Props) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  
  // Data
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  // Selections
  const [selBatch, setSelBatch] = useState<any | null>(null);
  const [selSubject, setSelSubject] = useState<any | null>(null);
  const [selLecture, setSelLecture] = useState<number | null>(null);
  
  // Load initial batches
  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teacher/my-batches');
      setBatches(res.data.data || []);
      
      if (initialSelection?.batchId && res.data.data) {
        const batch = res.data.data.find((b: any) => b._id === initialSelection.batchId);
        if (batch) {
          setSelBatch(batch);
          setStep(2);
          fetchSubjects(batch._id);
        }
      }
    } catch (err) {
      console.error("Failed to load batches", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async (batchId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/teacher/my-subjects?batchId=${batchId}`);
      setSubjects(res.data.data || []);
      
      if (initialSelection?.subjectId && res.data.data) {
        const sub = res.data.data.find((s: any) => s._id === initialSelection.subjectId);
        if (sub) {
          setSelSubject(sub);
          setStep(3);
          
          if (initialSelection?.lecture) {
            setSelLecture(initialSelection.lecture);
            handleComplete(sub, initialSelection.lecture);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load subjects", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSelect = (batch: any) => {
    setSelBatch(batch);
    setSelSubject(null);
    setSelLecture(null);
    setStep(2);
    fetchSubjects(batch._id);
  };

  const handleSubjectSelect = (subject: any) => {
    setSelSubject(subject);
    setSelLecture(null);
    setStep(3);
  };

  const handleComplete = (subject = selSubject, lecture = selLecture) => {
    if (selBatch && subject && lecture) {
      onSelectionComplete({
        batchId: selBatch._id,
        subjectId: subject._id,
        lecture: lecture,
        date: new Date(),
        batch: selBatch,
        subject: subject
      });
    }
  };

  const reset = () => {
    setSelBatch(null);
    setSelSubject(null);
    setSelLecture(null);
    setStep(1);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tighter uppercase">Initialize Session</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Select class parameters to begin marking</p>
        </div>
        <button 
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-colors text-[10px] font-bold uppercase tracking-widest"
        >
          <RotateCcw size={14} /> Reset Flow
        </button>
      </div>

      {/* Progress Tracker */}
      <div className="flex items-center gap-4 mb-10">
        <StepIndicator active={step >= 1} current={step === 1} label="Section" icon={<Users size={14} />} />
        <div className={cn("h-[2px] w-8 rounded-full transition-colors", step >= 2 ? "bg-indigo-500" : "bg-slate-100")} />
        <StepIndicator active={step >= 2} current={step === 2} label="Subject" icon={<BookOpen size={14} />} />
        <div className={cn("h-[2px] w-8 rounded-full transition-colors", step >= 3 ? "bg-indigo-500" : "bg-slate-100")} />
        <StepIndicator active={step >= 3} current={step === 3} label="Lecture" icon={<Clock size={14} />} />
      </div>

      <div className="min-h-[200px] relative">
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {batches.length === 0 ? (
                <EmptyState msg="No assigned sections found." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {batches.map(b => (
                    <button
                      key={b._id}
                      onClick={() => handleBatchSelect(b)}
                      className={cn(
                        "p-6 rounded-2xl border text-left transition-all hover:shadow-md group active:scale-95",
                        selBatch?._id === b._id ? "border-indigo-500 bg-indigo-50/50" : "border-slate-100 bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      <Users className={cn("mb-3", selBatch?._id === b._id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-900")} size={24} />
                      <h3 className="font-black text-slate-900">{b.name}</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Batch • {b.year || 'Current'}</p>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              {subjects.length === 0 ? (
                <EmptyState msg="No subjects found for this section." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {subjects.map(s => (
                    <button
                      key={s._id}
                      onClick={() => handleSubjectSelect(s)}
                      className={cn(
                        "p-6 rounded-2xl border text-left transition-all hover:shadow-md group active:scale-95 flex items-center justify-between",
                        selSubject?._id === s._id ? "border-indigo-500 bg-indigo-50/50" : "border-slate-100 bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      <div>
                        <BookOpen className={cn("mb-3", selSubject?._id === s._id ? "text-indigo-600" : "text-slate-400 group-hover:text-slate-900")} size={24} />
                        <h3 className="font-black text-slate-900 text-lg">{s.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CODE: {s.code}</p>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(l => (
                  <button
                    key={l}
                    onClick={() => setSelLecture(l)}
                    className={cn(
                      "aspect-square rounded-2xl border flex flex-col items-center justify-center transition-all hover:shadow-md active:scale-95",
                      selLecture === l 
                        ? "border-indigo-500 bg-indigo-600 text-white shadow-indigo-600/20 shadow-lg" 
                        : "border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                    )}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Lec</span>
                    <span className="text-2xl font-black">{l}</span>
                  </button>
                ))}
              </div>
              
              <button
                disabled={!selLecture}
                onClick={() => handleComplete()}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Launch Attendance Console <ChevronRight size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepIndicator({ active, current, label, icon }: any) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-300",
      active ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-slate-100 bg-slate-50 text-slate-400",
      current && "border-indigo-500 shadow-sm ring-2 ring-indigo-500/20"
    )}>
      {active && !current ? <CheckCircle2 size={14} className="text-indigo-500" /> : icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
      <div className="w-12 h-12 bg-slate-200 text-slate-400 rounded-full flex items-center justify-center mb-4">
        <Clock size={20} />
      </div>
      <p className="text-sm font-bold text-slate-500">{msg}</p>
    </div>
  );
}
