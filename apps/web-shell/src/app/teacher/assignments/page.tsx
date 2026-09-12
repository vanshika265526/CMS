"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  FileText, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  X,
  ExternalLink,
  MessageSquare,
  GraduationCap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  fetchAssignments, 
  createAssignment, 
  fetchAssignmentSubmissions, 
  gradeSubmission 
} from "@/lib/api/assignments";
import api from "@/lib/api";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function TeacherAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const res = await fetchAssignments();
      if (res.success) setAssignments(res.data);
    } catch (err) {
      console.error("Failed to load assignments", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (id: string) => {
    try {
      const res = await fetchAssignmentSubmissions(id);
      if (res.success) setSubmissions(res.data);
    } catch (err) {
      console.error("Failed to load submissions", err);
    }
  };

  useEffect(() => {
    if (selectedAssignment) {
      loadSubmissions(selectedAssignment._id);
    }
  }, [selectedAssignment]);

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center animate-pulse text-slate-400 font-black tracking-widest uppercase">LOADING TEACHER PORTAL...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto w-full pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assignment Management</h1>
          <p className="text-sm text-slate-500 mt-1">Create, track, and grade student submissions.</p>
        </div>

        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black tracking-widest shadow-xl shadow-slate-900/10 hover:-translate-y-1 active:scale-95 transition-all uppercase flex items-center gap-2"
        >
          <Plus size={18} /> New Assignment
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Assignment List */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Published Assignments</h3>
          {assignments.length === 0 ? (
            <Card className="py-12 text-center border-dashed border-slate-200">
              <p className="text-xs font-bold text-slate-400 uppercase">No assignments yet</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <button
                  key={assignment._id}
                  onClick={() => setSelectedAssignment(assignment)}
                  className={cn(
                    "w-full text-left p-6 rounded-3xl border transition-all duration-300 group",
                    selectedAssignment?._id === assignment._id 
                      ? "bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10" 
                      : "bg-white text-slate-900 border-slate-200 hover:border-slate-300"
                  )}
                >
                  <h4 className="font-bold truncate group-hover:px-1 transition-all">{assignment.title}</h4>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", selectedAssignment?._id === assignment._id ? "text-slate-400" : "text-slate-400")}>
                    {assignment.subjectId?.name} • {assignment.batchId?.name}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] font-bold flex items-center gap-1">
                      <Calendar size={12} /> {format(new Date(assignment.dueDate), "MMM dd")}
                    </span>
                    <ChevronRight size={14} className={selectedAssignment?._id === assignment._id ? "text-white" : "text-slate-300"} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submissions Queue */}
        <div className="lg:col-span-8">
          {selectedAssignment ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Submissions: {selectedAssignment.title}</h3>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    {submissions.filter(s => s.status === 'GRADED').length} Graded
                  </span>
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                    {submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'LATE').length} Pending
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {submissions.length === 0 ? (
                  <Card className="py-24 text-center border-dashed border-slate-200">
                    <Users size={48} className="text-slate-200 mx-auto mb-4" />
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No student submissions yet</p>
                  </Card>
                ) : (
                  submissions.map((sub) => (
                    <SubmissionRow 
                      key={sub._id} 
                      submission={sub} 
                      onGrade={() => {
                        setSelectedSubmission(sub);
                        setIsGradingModalOpen(true);
                      }} 
                    />
                  ))
                )}
              </div>
            </div>
          ) : (
             <Card className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50/50 border-dashed border-slate-200 min-h-[400px]">
                <GraduationCap size={64} className="text-slate-200 mb-6" />
                <h3 className="text-xl font-bold text-slate-400">Select an Assignment</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 max-w-xs">Choose from personal assignments to view student progress and begin grading.</p>
             </Card>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateAssignmentModal 
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
              setIsCreateModalOpen(false);
              loadAssignments();
            }}
          />
        )}

        {isGradingModalOpen && selectedSubmission && (
          <GradingModal 
            submission={selectedSubmission}
            assignment={selectedAssignment}
            onClose={() => setIsGradingModalOpen(false)}
            onSuccess={() => {
              setIsGradingModalOpen(false);
              loadSubmissions(selectedAssignment._id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function SubmissionRow({ submission, onGrade }: any) {
  const currentVersion = submission.versions[submission.currentVersionIndex];
  
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 flex items-center justify-between gap-6 hover:shadow-lg transition-all group">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 shrink-0">
          {submission.studentId?.name?.[0]}
        </div>
        <div className="min-w-0">
          <h4 className="font-bold text-slate-900 truncate">{submission.studentId?.name}</h4>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            Submitted {format(new Date(currentVersion.submittedAt), "MMM dd, hh:mm a")}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {submission.status === 'GRADED' ? (
           <div className="text-right">
              <p className="text-lg font-black text-emerald-500">{submission.marks}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Graded</p>
           </div>
        ) : (
          <div className={cn(
            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
            submission.status === 'LATE' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
          )}>
            {submission.status}
          </div>
        )}
        
        <button 
          onClick={onGrade}
          className="p-3 bg-slate-100 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function CreateAssignmentModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    subjectId: "",
    batchId: "",
    dueDate: "",
    maxMarks: 100
  });
  const [subjects, setSubjects] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch subjects and batches for the teacher
    const fetchMeta = async () => {
      try {
        const [subRes, batchRes] = await Promise.all([
          api.get('/subjects'), // Generic subject endpoint
          api.get('/teacher/my-batches') // Assuming this endpoint exists for teachers
        ]);
        if (subRes.data.success) setSubjects(subRes.data.data);
        if (batchRes.status === 200) setBatches(batchRes.data.data || batchRes.data);
      } catch (err) {
        console.error("Meta fetch failed", err);
      }
    };
    fetchMeta();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createAssignment(formData);
      if (res.success) onSuccess();
    } catch (err) {
      console.error("Create failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
    >
      <motion.div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create Assignment</h3>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assignment Title</label>
            <input 
              required
              type="text" 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-bold"
              placeholder="e.g., Final Physics Project"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Subject</label>
            <select 
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
              value={formData.subjectId}
              onChange={(e) => setFormData({...formData, subjectId: e.target.value})}
            >
              <option value="">Select Subject</option>
              {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Batch</label>
            <select 
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
              value={formData.batchId}
              onChange={(e) => setFormData({...formData, batchId: e.target.value})}
            >
              <option value="">Select Batch</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Due Date & Time</label>
            <input 
              required
              type="datetime-local" 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
              value={formData.dueDate}
              onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maximum Marks</label>
            <input 
              required
              type="number" 
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none"
              value={formData.maxMarks}
              onChange={(e) => setFormData({...formData, maxMarks: parseInt(e.target.value)})}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Instructions & Description</label>
            <textarea 
              required
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none h-40 resize-none font-medium"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Outline the assignment requirements..."
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-4 pt-6">
            <button type="submit" disabled={loading} className="px-12 py-5 bg-slate-900 text-white rounded-2xl text-xs font-black tracking-widest uppercase shadow-xl hover:-translate-y-1 transition-all">
              {loading ? "Publishing..." : "Publish Assignment"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function GradingModal({ submission, assignment, onClose, onSuccess }: any) {
  const [marks, setMarks] = useState(submission.marks || "");
  const [feedback, setFeedback] = useState(submission.feedback || "");
  const [loading, setLoading] = useState(false);
  const currentVersion = submission.versions[submission.currentVersionIndex];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await gradeSubmission(submission._id, { marks: parseFloat(marks), feedback });
      if (res.success) onSuccess();
    } catch (err) {
      console.error("Grading failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[120] flex items-center justify-center p-4 lg:p-8"
    >
      <motion.div className="bg-white rounded-[3rem] w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden">
          {/* File Viewer Side */}
          <div className="bg-slate-100/50 p-8 overflow-y-auto custom-scrollbar border-r border-slate-100">
            <div className="space-y-8">
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Student Submission</h4>
                <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
                  <FileText size={64} className="text-slate-200 mb-6" />
                  <h3 className="font-bold text-slate-900">{currentVersion.fileName}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2">{format(new Date(currentVersion.submittedAt), "MMM dd, hh:mm a")}</p>
                  <a 
                    href={currentVersion.fileUrl} 
                    target="_blank" 
                    className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest uppercase flex items-center gap-2 hover:bg-slate-800 transition-all"
                  >
                    <ExternalLink size={14} /> Open Document
                  </a>
                </div>
              </div>

              {currentVersion.textSubmission && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Student Comments</h4>
                  <div className="p-6 bg-slate-900 text-slate-300 rounded-3xl text-sm leading-relaxed italic">
                    "{currentVersion.textSubmission}"
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grading Panel */}
          <div className="p-12 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="mb-12">
               <h3 className="text-3xl font-black text-slate-900 truncate">{submission.studentId?.name}</h3>
               <p className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] mt-2">Grade Assignment</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 flex-1">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Award Marks</label>
                  <span className="text-xs font-bold text-slate-400">Out of {assignment.maxMarks}</span>
                </div>
                <input 
                  required
                  type="number" 
                  max={assignment.maxMarks}
                  min={0}
                  step={0.1}
                  value={marks} 
                  onChange={(e) => setMarks(e.target.value)}
                  className="w-full text-5xl font-black text-slate-900 bg-transparent border-none outline-none focus:text-indigo-600 transition-colors"
                  placeholder="0.0"
                />
                <div className="h-[2px] bg-indigo-50 w-full" />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Feedback</label>
                <textarea 
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-100 transition-all h-48 resize-none font-medium"
                  placeholder="Provide constructive feedback for the student..."
                />
              </div>

              <div className="pt-8 flex items-center gap-4">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                  Close
                </button>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl text-xs font-black tracking-widest uppercase shadow-xl shadow-indigo-600/20 hover:-translate-y-1 transition-all"
                >
                  {loading ? "Saving Results..." : "Publish Grade"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
