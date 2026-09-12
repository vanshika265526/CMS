"use client";

import React, { useEffect, useMemo, useState } from "react";
import { fetchExams, fetchExamStats, publishExamResults } from "@/lib/api/admin";
import ExamManager from "@/components/admin/ExamManager";
import { Plus, Download, Search, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ExamsPage() {
  const router = useRouter();
  const [exams, setExams] = useState<any[]>([]);
  const [examStats, setExamStats] = useState({ total: 0, upcoming: 0, published: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const ongoing = examStats.upcoming;
    const awaitingPublish = examStats.expired;
    const totalResults = examStats.published;
    const passRates = exams
      .map((exam) => Number(exam?.passRate || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const avgPassRate = passRates.length
      ? `${(passRates.reduce((sum, value) => sum + value, 0) / passRates.length).toFixed(1)}%`
      : "N/A";

    return { ongoing, awaitingPublish, totalResults, avgPassRate };
  }, [examStats, exams]);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, statsRes] = await Promise.all([fetchExams(), fetchExamStats()]);
      if (res.success) setExams(res.data);
      else setError(res?.message || "Failed to load exams");

      if (statsRes?.success && statsRes?.data) {
        setExamStats({
          total: Number(statsRes.data.total || 0),
          upcoming: Number(statsRes.data.upcoming || 0),
          published: Number(statsRes.data.published || 0),
          expired: Number(statsRes.data.expired || 0),
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (id: string) => {
    if (confirm("Publish results for this exam? This action is permanent and will notify all students.")) {
      try {
        await publishExamResults(id);
        alert("Results published successfully!");
        loadExams();
      } catch (err) {
        console.error(err);
        alert("Failed to publish results. Ensure marks are entered for all students.");
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Examination Authority</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Institutional Assessment & Result Control</p>
        </div>

        <div className="flex items-center gap-3">
            <button
             onClick={() => router.push('/exams/results')}
             className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Download size={14} /> Result Archive
           </button>
            <button
             onClick={() => router.push('/exams/create')}
             className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center gap-2"
            >
              <Plus size={14} /> New Exam Cycle
           </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ongoing Exams</p>
          <p className="text-lg font-black text-slate-900 tracking-tighter">{stats.ongoing}</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Awaiting Publish</p>
          <p className="text-lg font-black text-slate-900 tracking-tighter">{stats.awaitingPublish}</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pass Rate (Term)</p>
          <p className="text-lg font-black text-emerald-600 tracking-tighter">{stats.avgPassRate}</p>
         </div>
         <div className="bg-white border border-slate-200 rounded-2xl p-4">
            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Results</p>
          <p className="text-lg font-black text-slate-900 tracking-tighter">{stats.totalResults}</p>
         </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
           <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processing Exam Data...</p>
        </div>
      ) : error ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4 rounded-2xl border border-rose-100 bg-rose-50/50">
          <p className="text-sm font-black uppercase tracking-widest text-rose-600">{error}</p>
          <button onClick={loadExams} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-800">
            Retry
          </button>
        </div>
      ) : (
        <ExamManager 
          exams={exams} 
          onPublish={handlePublish}
          onView={(id) => router.push(`/exams/${id}`)}
          onCreate={() => router.push('/exams/create')}
        />
      )}
    </div>
  );
}
