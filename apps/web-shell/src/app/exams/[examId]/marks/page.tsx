"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExam } from "@/hooks/useExams";
import { useMarks } from "@/hooks/useMarks";
import { getStudents } from "@/lib/api/students";
import MarksGrid from "@/components/exams/MarksGrid";
import { ChevronLeft, Loader2, CheckCircle2, Share2, BarChart3 } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";

export default function MarksEntryPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const router = useRouter();
  
  const { exam, loading: examLoading } = useExam(examId);
  const { publishResults, loading: publishing } = useMarks(examId);
  
  const [students, setStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (exam && exam.courses && exam.courses.length > 0) {
      fetchRoster();
    }
  }, [exam]);

  const fetchRoster = async () => {
    try {
      // Support both legacy course-name filtering and id-based filtering.
      const primaryCourse = exam?.courses?.[0];
      const params: any = {};
      if (primaryCourse?.name) params.course = primaryCourse.name;
      if (primaryCourse?._id) params.courseId = primaryCourse._id;

      const res = await getStudents(params);
      if (res && res.data) {
        setStudents(res.data);
      } else if (Array.isArray(res)) {
        setStudents(res);
      }
    } catch (err) {
      console.error("Failed to fetch student roster", err);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Extract batchId from first student if available, otherwise from exam
  const getBatchId = () => {
    if (students.length > 0 && students[0].batchId?._id) {
      return students[0].batchId._id;
    }
    if (students.length > 0 && students[0].academicInfo?.batchId?._id) {
      return students[0].academicInfo.batchId._id;
    }
    if (students.length > 0 && typeof students[0].batchId === 'string') {
      return students[0].batchId;
    }
    return "";
  };

  const handlePublish = async () => {
    if (!confirm("Confirm result publication? This generates permanent student records.")) return;
    try {
      const res = await publishResults();
      if (res.success) {
        setPublished(true);
        setTimeout(() => router.push("/exams"), 2000);
      }
    } catch (err) {
      alert("Matrix consolidation failed.");
    }
  };

  if (examLoading || studentsLoading) {
    return (
      <div className="h-full min-h-100 flex flex-col items-center justify-center p-12">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading marks workspace...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Exam record not found</p>
        <Link href="/exams" className="inline-block mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800">
          Back to Exams
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link 
            href={`/exams/${examId}`}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tighter">Grading Station</h1>
            <p className="text-sm text-slate-500 mt-1 font-medium">Processing: <span className="text-indigo-600 font-bold uppercase">{exam.name}</span></p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-indigo-50/50 border border-indigo-100/50 px-5 py-2.5 rounded-2xl">
            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">Max Weightage</p>
            <p className="text-2xl font-black text-indigo-700 leading-none">{exam.totalMarks}</p>
          </div>
          
          <button 
            onClick={handlePublish}
            disabled={publishing || published || exam.status === 'PUBLISHED'}
            className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/30 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {publishing ? <Loader2 size={16} className="animate-spin" /> : published || exam.status === 'PUBLISHED' ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
            {published || exam.status === 'PUBLISHED' ? "Published" : "Consolidate results"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="p-0 border-none bg-transparent shadow-none">
           <MarksGrid 
             examId={examId}
             subjects={exam.subjects || []}
             students={students}
             courseId={exam.courses?.[0]?._id || exam.courses?.[0]}
             batchId={getBatchId()}
             totalMarks={exam.totalMarks || 100}
           />
        </Card>
      </div>

      {published && (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10">
           <CheckCircle2 size={28} />
           <div>
             <p className="font-bold text-lg">Logic Gates Consolidated!</p>
             <p className="text-xs opacity-80 uppercase tracking-widest font-black">Permanent records updated.</p>
           </div>
        </div>
      )}
    </div>
  );
}

