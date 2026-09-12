'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, BookOpen, School, UserCheck, Trash2,
  PlusCircle, ChevronRight, CheckCircle, Loader2, 
  ArrowRightLeft, Sparkles, LogOut, X, Search, Filter, Save
} from 'lucide-react';
import {
  fetchAssignments, assignTeacher, removeTeacherAssignment,
  assignStudentToBatch, fetchBatches, fetchSubjects,
  fetchStudents, fetchFaculties
} from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// ─── Reusable UI (Premium Indigo Design) ─────────────────────

function Card({ children, className = '' }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden", className)}
    >
      {children}
    </motion.div>
  );
}

function PremiumBadge({ color, children }: any) {
  return (
    <span className={cn("text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1.5 rounded-xl border-2", color)}>
      {children}
    </span>
  );
}

function Select({ label, value, onChange, options, placeholder, icon: Icon }: any) {
  return (
    <div className="space-y-2.5">
      {label && <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{label}</label>}
      <div className="relative group">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 pr-10 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all cursor-pointer group-hover:border-slate-200"
        >
          <option value="">{placeholder || 'Select...'}</option>
          {options.map((o: any) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-2">
           {Icon && <Icon size={14} className="text-slate-300" />}
           <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
        </div>
      </div>
    </div>
  );
}

// ─── Register Teacher Modal (Indigo Themed) ───────────────────

function RegisterTeacherModal({ isOpen, onClose, onRefresh }: any) {
  const [formData, setFormData] = useState({ name: '', email: '', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleRegister = async () => {
    if (!formData.name || !formData.email) { setError('Name and Email are required.'); return; }
    setLoading(true); setError('');
    try {
      const { createFaculty } = await import('@/lib/api/admin');
      await createFaculty({
        personalInfo: { name: formData.name, email: formData.email },
        department: formData.department,
        qualification: 'Dr./Prof.',
        experience: 0
      });
      onRefresh(); onClose(); 
      setFormData({ name: '', email: '', department: '' });
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to register teacher.');
    } finally { setLoading(false); }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-white rounded-[2.5rem] p-10 relative shadow-2xl border border-white/20"
        >
          <button onClick={onClose} className="absolute right-8 top-8 text-slate-400 hover:text-slate-900 transition-colors">
            <X size={24} />
          </button>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">New Faculty</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Add to Academic Directory</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Full Legal Name</label>
              <input 
                type="text" 
                placeholder="e.g. Dr. Richard Feynman"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            {/* ... other code remained the same ... */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">University Email</label>
              <input 
                type="email" 
                placeholder="name@university.edu"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Primary Department</label>
              <input 
                type="text" 
                placeholder="e.g. Theoretical Physics"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                value={formData.department}
                onChange={e => setFormData({...formData, department: e.target.value})}
              />
            </div>
          </div>

          {error && <p className="mt-6 text-[10px] font-bold text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 text-center uppercase tracking-widest">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full mt-10 bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-indigo-400" />}
            Register Faculty Member
          </button>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}

// ─── Tab 1: Assign Teacher (Indigo Theme) ─────────────────────

function AssignTeacherTab({ batches, subjects, faculties, onRefresh }: any) {
  const [batchId, setBatchId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const subjectOpts = subjects.map((s: any) => ({ value: s._id, label: `${s.name} (${s.code})` }));
  const batchOpts = batches.map((b: any) => ({ value: b._id, label: b.name }));
  const teacherOpts = faculties.map((f: any) => ({
    value: f.userId?._id || f._id,
    label: f.userId?.name || f.personalInfo?.name || 'Unknown Teacher'
  }));

  const handleAssign = async () => {
    if (!batchId || !subjectId || !teacherId) { setMsg({ type: 'error', text: 'Please finalize all selections.' }); return; }
    setLoading(true); setMsg(null);
    try {
      const res = await assignTeacher({ teacherId, subjectId, batchId });
      setMsg({ type: 'success', text: res.message || 'Academic Record Updated!' });
      onRefresh();
    } catch (e: any) { setMsg({ type: 'error', text: e.response?.data?.message || 'Conflict detected in assignment.' }); }
    finally { setLoading(false); }
  };

  return (
    <Card className="p-10 border-indigo-100/50">
      <div className="flex items-center gap-5 mb-10">
        <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-indigo-600/20">
          <ArrowRightLeft size={24} className="text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Smart Assignment</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 px-1 border-l-2 border-indigo-500">
            Map intellectual capital to academic entities
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <Select label="Target Batch" value={batchId} onChange={setBatchId} options={batchOpts} placeholder="Class/Batch..." icon={School} />
        <Select label="Course Module" value={subjectId} onChange={setSubjectId} options={subjectOpts} placeholder="Subject..." icon={BookOpen} />
        <Select label="Lead Faculty" value={teacherId} onChange={setTeacherId} options={teacherOpts} placeholder="Professor..." icon={UserCheck} />
      </div>

      <AnimatePresence>
        {batchId && subjectId && teacherId && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center gap-5 p-6 bg-indigo-50 rounded-[1.5rem] border border-indigo-100 mb-10 overflow-hidden"
          >
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
               <Sparkles className="text-white" size={18} />
            </div>
            <div className="text-xs font-bold text-slate-800 leading-relaxed uppercase tracking-tight">
              System will map <strong className="text-indigo-600 font-black">{teacherOpts.find((t: any) => t.value === teacherId)?.label}</strong> to 
              deliver <strong className="text-indigo-600 font-black">{subjectOpts.find((s: any) => s.value === subjectId)?.label}</strong> for 
              the duration of <strong className="text-indigo-600 font-black">{batchOpts.find((b: any) => b.value === batchId)?.label}</strong>.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {msg && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn("p-5 rounded-[1.5rem] mb-10 text-[10px] font-black uppercase tracking-widest text-center border-2", 
            msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
          )}
        >
          {msg.text}
        </motion.div>
      )}

      <button
        onClick={handleAssign}
        disabled={loading}
        className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Finalize Assignment
      </button>
    </Card>
  );
}

// ─── Tab 3: View List (Premium Theme) ─────────────────────────

function ViewAssignmentsTab({ assignments, onRemove }: any) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (a: any) => {
    const key = `${a.teacherId}-${a.subjectId}-${a.batchId}`;
    setRemoving(key);
    try {
      await removeTeacherAssignment({ teacherId: a.teacherId, subjectId: a.subjectId, batchId: a.batchId });
      onRemove();
    } catch (e) { console.error(e); }
    finally { setRemoving(null); }
  };

  if (!assignments.length) {
    return (
      <Card className="p-32 text-center bg-slate-50 border-dashed">
        <School size={48} className="mx-auto text-slate-200 mb-6" />
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Academic Vacuum</h3>
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-2">Initialize assignments to populate this directory</p>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent space-y-4">
      <div className="flex items-center justify-between mb-4 px-2">
         <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Assignment Registry</h3>
         <PremiumBadge color="text-indigo-600 bg-indigo-50 border-indigo-100">{assignments.length} Entries</PremiumBadge>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {assignments.map((a: any, i: number) => {
          const key = `${a.teacherId}-${a.subjectId}-${a.batchId}`;
          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group"
            >
              <div className="flex items-center gap-6">
                 <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center text-white font-black text-sm shadow-lg">
                    {a.teacherName?.split(' ').map((n: string) => n[0]).join('')}
                 </div>
                 <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{a.teacherName}</h4>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-0.5">{a.teacherEmail}</p>
                 </div>
              </div>

              <div className="hidden lg:flex items-center gap-12">
                 <div className="text-center">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Batched Class</p>
                    <PremiumBadge color="text-emerald-600 bg-emerald-50 border-emerald-100">{a.batchName}</PremiumBadge>
                 </div>
                 <div className="text-center px-8 border-x border-slate-100">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Assigned Subject</p>
                    <PremiumBadge color="text-indigo-600 bg-indigo-50 border-indigo-100">{a.subjectName}</PremiumBadge>
                 </div>
              </div>

              <button
                onClick={() => handleRemove(a)}
                disabled={removing === key}
                className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all group/btn disabled:opacity-50"
              >
                {removing === key ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />}
              </button>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}

const TABS = [
  { id: 'assign-teacher', label: 'Assign Teacher', icon: <ArrowRightLeft size={16} /> },
  { id: 'assign-student', label: 'Assign Student', icon: <UserCheck size={16} /> },
  { id: 'view-all', label: 'View All', icon: <Users size={16} /> },
];

export default function AdminAssignmentsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('assign-teacher');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [batchRes, subjectRes, studentRes, facultyRes, assignmentRes] = await Promise.all([
        fetchBatches(), fetchSubjects(), fetchStudents(), fetchFaculties(), fetchAssignments()
      ]);
      setBatches(batchRes.data || []);
      setSubjects(subjectRes.data || []);
      setStudents(studentRes.data || []);
      setFaculties(facultyRes.data || []);
      setAssignments(assignmentRes.data || []);
    } catch (e) {
      console.error('[CORE_LOAD_FAILURE]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <School size={16} />
            </div>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Institutional Ops</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Academic Assignments</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2 border-l-4 border-slate-900 pl-4">
            Dynamic Mapping System for <span className="text-indigo-600">Smart Resource Allocation</span>
          </p>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowRegisterModal(true)}
             className="px-8 py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-3 active:scale-95 group"
           >
             <PlusCircle size={14} className="group-hover:rotate-90 transition-transform" />
             Add Faculty Member
           </button>
        </div>
      </div>

      <RegisterTeacherModal 
        isOpen={showRegisterModal} 
        onClose={() => setShowRegisterModal(false)}
        onRefresh={loadAll}
      />

      {/* Stats Board */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Assignments', value: assignments.length, color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: Sparkles },
          { label: 'Strategic Batches', value: batches.length, color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: School },
          { label: 'Course Modules', value: subjects.length, color: 'text-purple-600 bg-purple-50 border-purple-100', icon: BookOpen },
          { label: 'Active Students', value: students.length, color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Users },
        ].map(stat => (
          <div key={stat.label} className={cn("p-8 rounded-[2rem] border-2 flex flex-col relative group overflow-hidden", stat.color)}>
            <stat.icon className="absolute -right-4 -bottom-4 w-32 h-32 opacity-[0.03] group-hover:scale-110 transition-transform duration-700" />
            <p className="text-5xl font-black tracking-tighter mb-2">{loading ? '...' : stat.value}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 border-l-2 border-current pl-3">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Control Interface */}
      <div className="space-y-6">
        <div className="flex gap-3 p-1.5 bg-slate-100 rounded-[1.75rem] w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
              )}
            >
              <div className={cn("transition-colors", activeTab === tab.id ? 'text-indigo-400' : 'text-slate-300')}>
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
              <Loader2 className="animate-spin text-slate-900" size={40} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Synchronizing Registry</p>
            </div>
          ) : (
            <>
              {activeTab === 'assign-teacher' && <AssignTeacherTab batches={batches} subjects={subjects} faculties={faculties} onRefresh={loadAll} />}
              {activeTab === 'assign-student' && (
                <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-100 rounded-[3rem]">
                   <Users size={48} className="text-slate-100 mb-6" />
                   <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest">SIS Module Redirect</h3>
                   <button onClick={() => router.push('/admin/admissions')} className="mt-4 px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20">Go to Admissions</button>
                </div>
              )}
              {activeTab === 'view-all' && <ViewAssignmentsTab assignments={assignments} onRemove={loadAll} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
