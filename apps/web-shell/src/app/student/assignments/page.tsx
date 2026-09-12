"use client";

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Calendar, 
  Clock, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ExternalLink,
  Info,
  History,
  Send,
  X,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  fetchAssignments, 
  fetchMySubmissions, 
  submitAssignment 
} from "@/lib/api/assignments";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [assignRes, subRes] = await Promise.all([
        fetchAssignments(),
        fetchMySubmissions()
      ]);
      if (assignRes.success) setAssignments(assignRes.data);
      if (subRes.success) setSubmissions(subRes.data);
    } catch (err) {
      console.error("Failed to load assignments", err);
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForAssignment = (assignmentId: string) => {
    return submissions.find(s => (s.assignmentId?._id || s.assignmentId) === assignmentId);
  };

  const filteredAssignments = assignments.filter(a => {
    const sub = getSubmissionForAssignment(a._id);
    if (activeTab === 'pending') return !sub || sub.status !== 'GRADED';
    if (activeTab === 'completed') return sub && sub.status === 'GRADED';
    return true;
  });

  const getStatusBadge = (assignment: any) => {
    const sub = getSubmissionForAssignment(assignment._id);
    const isLate = new Date() > new Date(assignment.dueDate);

    if (sub?.status === 'GRADED') {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black tracking-widest border border-emerald-100 uppercase">
          <CheckCircle2 size={12} /> Graded ({sub.marks}/{assignment.maxMarks})
        </span>
      );
    }
    if (sub) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black tracking-widest border border-indigo-100 uppercase">
          <History size={12} /> {sub.status === 'LATE' ? 'Late Submission' : 'Submitted'}
        </span>
      );
    }
    if (isLate) {
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black tracking-widest border border-rose-100 uppercase">
          <AlertCircle size={12} /> Overdue
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black tracking-widest border border-amber-100 uppercase">
        <Clock size={12} /> Pending
      </span>
    );
  };

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center animate-pulse text-slate-400 font-black tracking-widest">Loading assignments...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto w-full pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assignments</h1>
          <p className="text-sm text-slate-500 mt-1">Submit your coursework and track your grades.</p>
        </div>

        <div className="flex items-center p-1 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/60 shadow-sm backdrop-blur-sm">
          {['pending', 'completed', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all duration-300 uppercase",
                activeTab === tab 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/10" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Assignment List */}
        <div className="lg:col-span-12 space-y-4">
          {filteredAssignments.length === 0 ? (
            <Card className="py-24 text-center border-dashed border-slate-200">
              <FileText size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">No assignments yet</p>
              <p className="text-sm text-slate-500 mt-2">Your teacher has not posted any assignments for your batch yet.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-geist">
              {filteredAssignments.map((assignment) => (
                <AssignmentCard 
                  key={assignment._id}
                  assignment={assignment}
                  submission={getSubmissionForAssignment(assignment._id)}
                  statusBadge={getStatusBadge(assignment)}
                  onClick={() => setSelectedAssignment(assignment)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedAssignment && (
          <AssignmentDetailModal 
            assignment={selectedAssignment}
            submission={getSubmissionForAssignment(selectedAssignment._id)}
            onClose={() => setSelectedAssignment(null)}
            onOpenSubmit={() => {
              setIsSubmitModalOpen(true);
            }}
            onOpenHistory={() => setIsHistoryModalOpen(true)}
          />
        )}
        
        {isSubmitModalOpen && selectedAssignment && (
          <SubmitModal 
            assignment={selectedAssignment}
            onClose={() => setIsSubmitModalOpen(false)}
            onSuccess={() => {
              setIsSubmitModalOpen(false);
              loadData(); // Reload list
            }}
          />
        )}
        
        {isHistoryModalOpen && selectedAssignment && (
          <HistoryModal 
            submission={getSubmissionForAssignment(selectedAssignment._id)}
            onClose={() => setIsHistoryModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function AssignmentCard({ assignment, submission, statusBadge, onClick }: any) {
  return (
    <motion.div
      layoutId={assignment._id}
      onClick={onClick}
      className="group cursor-pointer bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center transition-transform group-hover:rotate-12 group-hover:scale-110">
            <FileText size={20} />
          </div>
          {statusBadge}
        </div>
        
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
          {assignment.title}
        </h3>
        
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 mb-4 flex items-center gap-2">
          {assignment.subjectId?.name || 'N/A'} • {assignment.subjectId?.code || 'GEN'}
        </p>

        <div className="space-y-3 pt-4 border-t border-slate-50">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-slate-400" /> Due Date</span>
            <span className="text-slate-900">{format(new Date(assignment.dueDate), "MMM dd, yyyy")}</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><Info size={14} className="text-slate-400" /> Points</span>
            <span className="text-slate-900">{assignment.maxMarks} Marks</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AssignmentDetailModal({ assignment, submission, onClose, onOpenSubmit, onOpenHistory }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-100 flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
                <FileText size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none">{assignment.title}</h2>
                <p className="text-sm font-bold text-indigo-600 mt-2 uppercase tracking-widest">
                  {assignment.subjectId?.name} ({assignment.subjectId?.code})
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <DetailStat label="Points" value={`${assignment.maxMarks} Total`} icon={<Award size={16} />} color="text-amber-600 bg-amber-50" />
            <DetailStat label="Due" value={format(new Date(assignment.dueDate), "MMM dd, hh:mm a")} icon={<Calendar size={16} />} color="text-indigo-600 bg-indigo-50" />
            <DetailStat label="Status" value={submission?.status || 'NOT SUBMITTED'} icon={<Clock size={16} />} color="text-slate-600 bg-slate-50" />
          </div>

          <div className="space-y-12">
            <section>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Instructions</h4>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
            </section>

            {assignment.attachments?.length > 0 && (
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Reference Materials</h4>
                <div className="space-y-3">
                  {assignment.attachments.map((file: any, i: number) => (
                    <a 
                      key={i}
                      href={file.fileUrl} 
                      target="_blank" 
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors border border-slate-100">
                          <FileText size={16} />
                        </div>
                        <span className="text-sm font-bold text-slate-900">{file.name}</span>
                      </div>
                      <ExternalLink size={16} className="text-slate-300 group-hover:text-indigo-600" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {submission && (
              <section className="p-8 bg-slate-900 rounded-4xl text-white overflow-hidden relative">
                <Sparkles className="absolute -right-10 -bottom-10 text-white/5" size={200} />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Your Submission</h4>
                    <div className="space-y-2">
                       <p className="text-2xl font-black">
                         {submission.status === 'GRADED' ? 'Results Published' : 'Final Review Pending'}
                       </p>
                       {submission.status === 'GRADED' && (
                         <div className="flex items-center gap-4">
                            <span className="text-4xl font-black text-emerald-400">{submission.marks}</span>
                            <span className="text-sm text-slate-400">out of {assignment.maxMarks}</span>
                         </div>
                       )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={onOpenHistory}
                      className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black tracking-widest transition-all uppercase flex items-center gap-2"
                    >
                      <History size={14} /> Submission History
                    </button>
                    {submission.status !== 'GRADED' && (
                       <button 
                         onClick={onOpenSubmit}
                         className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-xs font-black tracking-widest transition-all uppercase flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                       >
                         <Upload size={14} /> Re-Submit
                       </button>
                    )}
                  </div>
                </div>

                {submission.feedback && (
                  <div className="mt-8 pt-8 border-t border-white/10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Teacher's Feedback</p>
                    <p className="text-sm text-slate-300 italic">"{submission.feedback}"</p>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
        
        {!submission && (
          <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-4">
            <button 
               onClick={onClose}
               className="px-8 py-4 text-xs font-black tracking-widest text-slate-400 hover:text-slate-900 transition-colors uppercase"
            >
              Cancel
            </button>
            <button 
              onClick={onOpenSubmit}
              className="px-10 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black tracking-widest shadow-xl shadow-slate-900/20 hover:-translate-y-1 active:scale-95 transition-all uppercase flex items-center gap-2"
            >
              <Upload size={16} /> Mark as Done
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function SubmitModal({ assignment, onClose, onSuccess }: any) {
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [textSubmission, setTextSubmission] = useState("");
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsUploading(true);
    
    // Use the existing cloudinary upload mechanism
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "cms_materials"); // Fallback if needed

    try {
      // Direct Cloudinary upload (replacing this with your platform's upload service if available)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setFileUrl(data.secure_url);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileUrl && !textSubmission) return;

    setLoading(true);
    try {
      const res = await submitAssignment({
        assignmentId: assignment._id,
        fileUrl,
        fileName,
        textSubmission
      });
      if (res.success) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to submit", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-110 flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-4xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Turn In Work</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Document Upload</label>
            <div className={cn(
              "relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all",
              fileUrl ? "border-emerald-200 bg-emerald-50/10" : "border-slate-100 hover:border-indigo-200 bg-slate-50/30"
            )}>
              <input 
                type="file" 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              {isUploading ? (
                <div className="animate-spin text-indigo-600"><History size={32} /></div>
              ) : fileUrl ? (
                <>
                  <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                  <p className="text-sm font-bold text-slate-900">{fileName}</p>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-slate-300 mb-2 group-hover:text-indigo-600" />
                  <p className="text-xs font-bold text-slate-400">Click to upload PDF or Document</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Comment (Optional)</label>
            <textarea 
              value={textSubmission}
              onChange={(e) => setTextSubmission(e.target.value)}
              placeholder="Tell your teacher anything about this submission..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-100 transition-all h-32 resize-none"
            />
          </div>

          <button 
            type="submit"
            disabled={(!fileUrl && !textSubmission) || loading || isUploading}
            className={cn(
              "w-full py-4 rounded-2xl text-xs font-black tracking-widest uppercase shadow-xl transition-all flex items-center justify-center gap-2",
              fileUrl || textSubmission
                ? "bg-indigo-600 text-white shadow-indigo-600/20 hover:-translate-y-1"
                : "bg-slate-100 text-slate-300 shadow-none cursor-not-allowed"
            )}
          >
            <Send size={16} /> {loading ? 'Submitting...' : 'Turn In'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

function HistoryModal({ submission, onClose }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-110 flex items-center justify-center p-4"
    >
      <motion.div className="bg-white rounded-4xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Submission History</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            {submission.versions.map((v: any, i: number) => (
              <div key={i} className="flex gap-4 relative">
                {i < submission.versions.length - 1 && <div className="absolute left-4 top-8 bottom--4 w-0.5 bg-slate-100" />}
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10", i === submission.currentVersionIndex ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-400")}>
                   {submission.versions.length - i}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs font-bold text-slate-900">Version {submission.versions.length - i}</p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-slate-600 truncate max-w-50">{v.fileName}</span>
                    <a href={v.fileUrl} target="_blank" className="text-indigo-600 font-bold text-[10px] uppercase">View</a>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{format(new Date(v.submittedAt), "MMM dd, hh:mm a")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailStat({ label, value, icon, color }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", color)}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xs font-bold text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}

function Award(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    >
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}
