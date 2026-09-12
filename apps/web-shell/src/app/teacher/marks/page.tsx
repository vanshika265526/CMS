"use client";

import React, { useState, useEffect } from "react";
import MarksEntryTable from "@/components/teacher/MarksEntryTable";
import api from "@/lib/api";
import Link from "next/link";
import { 
  FileSpreadsheet, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  BookOpen, 
  Users,
  Loader2,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function MarksPage() {
  const [subjects, setSubjects] = useState([]);
  const [batches, setBatches] = useState([]);
  const [exams, setExams] = useState([]);
  
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<any>(null);
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchingBatches, setFetchingBatches] = useState(false);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [submittedMarks, setSubmittedMarks] = useState<Record<string, { marks: number; remarks: string; markId: string }>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedSubjectData: any = subjects.find((sub: any) => sub._id === selectedSubject);
  const selectedCourseId = selectedSubjectData?.courseId?._id || selectedSubjectData?.courseId || null;

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [subRes, examRes] = await Promise.all([
        api.get('/teacher/subjects'),
        api.get('/teacher/marks/exams')
      ]);
      setSubjects(subRes.data.data);
      setExams(examRes.data.data);
    } catch (err: any) {
      setError("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedExam) {
      fetchSubmittedMarks(selectedExam._id);
    }
  }, [selectedExam]);

  const handleSubjectChange = async (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedBatch("");
    setSelectedExam(null);
    setStudents([]);
    
    if (!subjectId) {
      setBatches([]);
      return;
    }

    setFetchingBatches(true);
    try {
      const res = await api.get(`/teacher/batches?subjectId=${subjectId}`);
      setBatches(res.data.data);
    } catch (err) {
      setError("Failed to load batches for this subject");
    } finally {
      setFetchingBatches(false);
    }
  };

  const handleBatchChange = async (batchId: string) => {
    setSelectedBatch(batchId);
    setFetchingStudents(true);
    try {
    const res = await api.get(`/teacher/students?batchId=${batchId}`);
    // Map nested backend data to the flat structure expected by MarksEntryTable
    const mappedStudents = (res.data.data || []).map((s: any) => ({
      _id: s._id,
      name: s.personalInfo?.name || `${s.personalInfo?.firstName || ''} ${s.personalInfo?.lastName || ''}`.trim() || 'Unknown Student',
      rollNumber: s.academicInfo?.rollNumber || s.uniqueStudentId || 'N/A'
    }));
    setStudents(mappedStudents);
  } catch (err) {
    setError("Failed to load students for this batch");
  } finally {
    setFetchingStudents(false);
  }
};

  const currentExams = exams.filter((ex: any) => 
    Array.isArray(ex.subjects)
      ? ex.subjects.some((subject: any) => (subject?._id || subject)?.toString() === selectedSubject)
      : (ex.subjectId?._id || ex.subjectId)?.toString() === selectedSubject
  );

  const fetchSubmittedMarks = async (examId: string) => {
    try {
      const res = await api.get(`/teacher/marks/${examId}`);
      console.log('📊 Marks API Response:', res.data);
      const marksMap: Record<string, { marks: number; remarks: string; markId: string }> = {};
      if (Array.isArray(res.data.data)) {
        res.data.data.forEach((m: any) => {
          const sId = m.studentId?._id || m.studentId;
          marksMap[sId] = {
            marks: m.marksObtained,
            remarks: m.remarks || '',
            markId: m._id
          };
          console.log(`✅ Loaded marks for student ${sId}:`, m.marksObtained);
        });
      }
      console.log('📋 Final marks map:', marksMap);
      setSubmittedMarks(marksMap);
    } catch (err) {
      console.log('❌ Error fetching marks:', err);
      // No submitted marks yet, that's okay
    }
  };

  const handleSaveRow = async (studentId: string, marksObtained: number, remarks: string) => {
    if (!selectedExam || !selectedSubject || !selectedBatch) {
      setError("Please select Subject, Batch, and Exam before entering marks");
      return;
    }
    if (!selectedCourseId) {
      setError("Please select a subject before saving marks");
      return;
    }
    
    try {
      await api.post('/teacher/marks/enter', {
        examId: selectedExam._id,
        studentId,
        subjectId: selectedSubject,
        courseId: selectedCourseId,
        batchId: selectedBatch,
        marksObtained,
        maxMarks: selectedExam.totalMarks || 100,
        remarks
      });
      setError("");
      setSuccess("Marks saved successfully");
      // Refresh submitted marks
      if (selectedExam) {
        fetchSubmittedMarks(selectedExam._id);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save marks";
      // Check if the error is about marks already existing
      if (msg.toLowerCase().includes("already exists")) {
        setError("");
        setSuccess("✓ Marks already saved for this student. Click EDIT to modify them.");
        // Refresh submitted marks so the edit button becomes visible
        if (selectedExam) {
          await fetchSubmittedMarks(selectedExam._id);
        }
      } else {
        setError(msg);
        throw err;
      }
    }
  };

  const handleEditSubmittedMarks = async (studentId: string, marksObtained: number, remarks: string) => {
    const submitted = submittedMarks[studentId];
    if (!submitted?.markId) {
      setError("Cannot find mark record for editing");
      throw new Error("Missing markId");
    }

    try {
      setError("");
      await api.put(`/teacher/marks/${submitted.markId}`, {
        marksObtained,
        remarks
      });
      setSuccess("Marks updated successfully");
      // Refresh submitted marks
      if (selectedExam) {
        fetchSubmittedMarks(selectedExam._id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update marks");
      throw err;
    }
  };

  const handleSaveAll = async (rows: { studentId: string; marks: number; remarks: string }[]) => {
    if (!selectedExam || !selectedSubject || !selectedBatch || !selectedCourseId) {
      setError("Please select a subject before saving marks");
      throw new Error("Missing selections");
    }

    try {
      setSuccess("");
      setError("");
      await api.post('/teacher/marks/bulk', {
        examId: selectedExam._id,
        subjectId: selectedSubject,
        courseId: selectedCourseId,
        batchId: selectedBatch,
        maxMarks: selectedExam.totalMarks || selectedExam.maxMarks || 100,
        entries: rows,
      });
      setSuccess("All marks saved successfully");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save all marks");
      throw err;
    }
  };



  if (loading) return (
    <div className="animate-pulse space-y-8 p-8">
      <div className="h-10 w-64 bg-slate-200 rounded-2xl"></div>
      <div className="grid grid-cols-3 gap-6">
         <div className="h-32 bg-slate-100 rounded-4xl"></div>
         <div className="h-32 bg-slate-100 rounded-4xl"></div>
         <div className="h-32 bg-slate-100 rounded-4xl"></div>
      </div>
      <div className="h-125 bg-slate-50 rounded-4xl"></div>
    </div>
  );

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Marks <span className="text-slate-400">&</span> Grading
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">Authorized marks entry for your assigned subjects</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
           {/* Subject Selector */}
           <div className="flex flex-col gap-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
               <BookOpen size={10} /> Subject
             </label>
             <select 
               className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-64"
               value={selectedSubject}
               onChange={(e) => handleSubjectChange(e.target.value)}
             >
               <option value="">Select Subject</option>
               {subjects.map((sub: any) => (
                 <option key={sub._id} value={sub._id}>[{sub.code}] {sub.name}</option>
               ))}
             </select>
           </div>

           {/* Batch Selector */}
           <div className="flex flex-col gap-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
               <Users size={10} /> Batch
             </label>
             <select 
               className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-48 disabled:opacity-50"
               value={selectedBatch}
               disabled={!selectedSubject || fetchingBatches}
               onChange={(e) => handleBatchChange(e.target.value)}
             >
               <option value="">Select Batch</option>
               {batches.map((b: any) => (
                 <option key={b._id} value={b._id}>{b.name}</option>
               ))}
             </select>
           </div>

           {/* Exam Selector */}
           <div className="flex flex-col gap-1.5">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
               <FileSpreadsheet size={10} /> Exam
             </label>
             <select 
               className="bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all w-64 disabled:opacity-50"
               value={selectedExam?._id || ""}
               disabled={!selectedBatch || currentExams.length === 0}
               onChange={(e) => setSelectedExam(currentExams.find((ex: any) => ex._id === e.target.value))}
             >
               <option value="">Select Active Exam</option>
               {currentExams.map((ex: any) => (
                 <option key={ex._id} value={ex._id}>{ex.name}</option>
               ))}
             </select>
           </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-4xl flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
           <div className="bg-red-500 text-white p-1.5 rounded-full">
             <AlertCircle size={16} />
           </div>
           <p className="text-sm font-black tracking-tight">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-4xl flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="bg-emerald-500 text-white p-1.5 rounded-full">
            <CheckCircle2 size={16} />
          </div>
          <p className="text-sm font-black tracking-tight">{success}</p>
        </div>
      )}

      {selectedExam && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in zoom-in-95 duration-300">
           <div className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assessment Type</span>
              <div className="text-lg font-black text-slate-900 mt-2 uppercase flex items-center gap-2">
                <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
                {selectedExam.examType || selectedExam.type}
              </div>
           </div>
           <div className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Score</span>
              <p className="text-3xl font-black text-slate-900 mt-2">{selectedExam.totalMarks || selectedExam.maxMarks || 100}</p>
           </div>
           <div className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Portal Status</span>
              <div className="flex items-center gap-3 text-lg font-black text-emerald-600 mt-2 tracking-tighter uppercase italic">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                OPEN FOR ENTRY
              </div>
           </div>
           <div className="bg-white p-6 rounded-4xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Class Strength</span>
              <p className="text-3xl font-black text-slate-900 mt-2">{students.length}</p>
           </div>
        </div>
      )}

      {/* Entry Table Section */}
      <div className="relative">
        {fetchingStudents && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-4xl">
            <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <Link
            href="/exams/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm hover:bg-slate-800 transition-all"
          >
            Create Class Assessment
          </Link>
        </div>
        
        {selectedBatch ? (
          <div className="space-y-4">
             <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Student Roster — {batches.find((b: any) => b._id === selectedBatch)?.name}</h3>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full">BATCH ID: {selectedBatch.slice(-6)}</span>
                </div>
             </div>
             <MarksEntryTable 
               students={students} 
               onSaveRow={handleSaveRow} 
               onBulkSubmit={handleSaveAll}
               onEditSubmitted={handleEditSubmittedMarks}
               submittedMarks={submittedMarks}
               maxMarks={selectedExam?.totalMarks || selectedExam?.maxMarks || 100}
             />
          </div>
        ) : (
          <div className="bg-white h-100 rounded-4xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center p-12 space-y-6">
             <div className="w-20 h-20 bg-slate-50 rounded-4xl flex items-center justify-center text-slate-200">
                <Filter size={40} />
             </div>
             <div className="max-w-xs">
                <h3 className="text-xl font-black text-slate-900 uppercase italic">Filter Restricted View</h3>
                <p className="text-sm font-medium text-slate-400 mt-2 leading-relaxed">
                  Select a Subject and Batch from your assigned academic portfolio to initiate mark entry.
                </p>
             </div>
             <div className="flex items-center gap-2 text-[10px] font-black text-indigo-500 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 uppercase tracking-widest scale-90">
               <TrendingUp size={14} /> STRICT RBAC ENFORCED
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TrendingUp({ size, className }: { size?: number, className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size || 24} 
            height={size || 24} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
        </svg>
    )
}
