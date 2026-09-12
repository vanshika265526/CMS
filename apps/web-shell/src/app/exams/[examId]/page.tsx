"use client";

import React, { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExam } from "@/hooks/useExams";
import { useMarks } from "@/hooks/useMarks";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  FileSpreadsheet,
  BarChart3,
  Share2,
  AlertCircle,
  FileText,
  UserCheck,
  Edit3
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ExamDetailsPage({ params }: { params: Promise<{ examId: string }> }) {
  const router = useRouter();
  const { examId } = use(params);
  const { exam, loading, error, fetchExam } = useExam(examId);
  const { publishResults, loading: publishing } = useMarks(examId);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Redirect PARENT users away from management pages
      if (parsedUser.role === "PARENT") {
        router.push("/exams/results");
        return;
      }
      setUser(parsedUser);
    }
  }, [router]);

  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'COLLEGE_ADMIN' || user?.role === 'TEACHER';
  const isPublished = exam?.status === 'PUBLISHED';

  if (loading) return (
    <div className="h-full min-h-100 flex flex-col items-center justify-center p-12">
      <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading exam details...</p>
    </div>
  );
  
  if (error || !exam) return <div className="py-24 text-center text-error border border-dashed border-error/20 rounded-3xl m-8">Error: {error || "Exam entity not found"}</div>;

  const handlePublish = async () => {
    if (confirm("Consolidate results? Permanent student records will be generated.")) {
      try {
        await publishResults();
        await fetchExam();
      } catch (err: any) {
        alert(err?.response?.data?.message || "Unable to publish results right now");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link 
            href="/exams"
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ChevronLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md uppercase tracking-widest">{exam.code}</span>
              <span className={cn(
                "text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border",
                isPublished ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"
              )}>{exam.status}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{exam.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isStaff && !isPublished && (
             <Link 
                href={`/exams/${examId}/marks`}
                className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/30 flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <Edit3 size={18} /> Enter Marks
              </Link>
          )}
          {isStaff && exam.status === 'SCHEDULED' && (
             <button 
                onClick={handlePublish}
                disabled={publishing}
                className="bg-white text-indigo-600 border border-indigo-200 px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-sm flex items-center gap-2 hover:bg-indigo-50 active:scale-95 transition-all disabled:opacity-50"
              >
                <Share2 size={18} /> {publishing ? "Processing..." : "Publish Result Matrix"}
              </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border border-slate-100 bg-white shadow-sm rounded-3xl relative overflow-hidden group">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-indigo-50 rounded-full blur-3xl group-hover:bg-indigo-100/50 transition-all duration-700" />
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            <DetailItem icon={<Calendar className="text-indigo-500" />} label="Schedule Date" value={new Date(exam.scheduleDate).toLocaleDateString()} />
            <DetailItem icon={<Clock className="text-indigo-500" />} label="Duration" value={`${exam.duration} Minutes`} />
            <DetailItem icon={<FileText className="text-indigo-500" />} label="Weightage" value={`${exam.totalMarks} Marks`} />
            <DetailItem icon={<UserCheck className="text-indigo-500" />} label="Passing" value={`${exam.passingMarks} Marks`} />
          </div>

          <div className="relative z-10 pt-8 mt-8 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Linked Subjects</h3>
            <div className="flex flex-wrap gap-2">
              {exam.subjects?.map((s: any) => (
                <span key={s._id} className="px-4 py-2 bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
           {isPublished ? (
             <Card className="p-8 border-none bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/20">
                <BarChart3 className="w-12 h-12 mb-4 opacity-50" />
                <h3 className="text-xl font-bold mb-2 tracking-tighter">Results Live</h3>
                <p className="text-sm text-indigo-100 leading-relaxed mb-6">
                  Performance matrices and student hall tickets have been finalized.
                </p>
                <Link href={`/exams/results?examId=${examId}`} className="block w-full py-4 bg-white text-indigo-600 rounded-2xl font-black text-center text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-all active:scale-95 shadow-lg">
                  View Analysis Deck
                </Link>
             </Card>
           ) : isStaff ? (
             <Card className="p-8 border border-slate-100 bg-white rounded-3xl shadow-sm">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6">
                  <AlertCircle className="text-amber-500" size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Grading Pending</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  The marking console is open for this exam. Please record the matrix soon.
                </p>
             </Card>
           ) : (
             <Card className="p-8 border border-slate-100 bg-white rounded-3xl shadow-sm">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6">
                  <Clock className="text-indigo-500" size={24} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Evaluation Phase</h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  The faculty evaluation cycle is currently in progress.
                </p>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}

function Loader2({ size, className }: any) {
  return <BarChart3 className={cn("animate-spin", className)} size={size} />;
}

function DetailItem({ icon, label, value }: any) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {icon}
        {label}
      </div>
      <p className="text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

