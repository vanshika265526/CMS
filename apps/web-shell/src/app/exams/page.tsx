"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExams } from "@/hooks/useExams";
import { getExamStats } from "@/lib/api/exams";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  FileText, 
  Users,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function ExamsDashboard() {
  const router = useRouter();
  const [collegeId, setCollegeId] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const { exams, loading, error } = useExams(collegeId);
  const [stats, setStats] = useState({ total: 0, upcoming: 0, published: 0, expired: 0 });
  const [search, setSearch] = useState("");

  useEffect(() => {
    const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      // Redirect PARENT users to results page
      if (parsedUser.role === "PARENT") {
        router.push("/exams/results");
        return;
      }
      setUser(parsedUser);
      if (parsedUser.collegeId && isValidObjectId(parsedUser.collegeId)) {
        setCollegeId(parsedUser.collegeId);
      }
    }
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await getExamStats();
        if (res?.success && res?.data) {
          setStats({
            total: Number(res.data.total || 0),
            upcoming: Number(res.data.upcoming || 0),
            published: Number(res.data.published || 0),
            expired: Number(res.data.expired || 0),
          });
        }
      } catch {
        // Non-blocking: list still renders from useExams.
      }
    };

    if (collegeId) {
      loadStats();
    }
  }, [collegeId, exams.length]);

  const isStaff = user?.role === 'SUPER_ADMIN' || user?.role === 'COLLEGE_ADMIN' || user?.role === 'TEACHER';
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COLLEGE_ADMIN';

  const filteredExams = exams.filter(exam => 
    (exam.name || "").toLowerCase().includes(search.toLowerCase()) || 
    (exam.code || "").toLowerCase().includes(search.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return "bg-success-container text-success border-success";
      case 'SCHEDULED': return "bg-primary-container text-primary border-primary";
      case 'EXPIRED': return "bg-rose-100 text-rose-700 border-rose-300";
      case 'DRAFT': return "bg-surface-container-highest text-surface-on-surface-variant border-outline";
      default: return "bg-surface-container text-surface-on-surface-variant";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-on-surface tracking-tight">Exams & Results</h1>
          <p className="text-sm text-surface-on-surface-variant mt-1">Manage schedules, marks entry, and result publication</p>
        </div>
        
        <div className="flex items-center gap-3">
          {isStaff && (
            <Link 
              href="/exams/create"
              className="bg-primary text-primary-on-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <Plus size={18} /> {isAdmin ? 'Create Exam' : 'Create Assessment'}
            </Link>
          )}
          {!isStaff && (
            <Link 
              href="/exams/results"
              className="bg-secondary text-secondary-on-secondary px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-secondary/20 flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
            >
              <FileText size={18} /> My Results
            </Link>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Exams" value={stats.total} icon={<FileText size={20} className="text-primary" />} />
        <StatCard label="Upcoming" value={stats.upcoming} icon={<Calendar size={20} className="text-secondary-container-on-secondary-container" />} />
        <StatCard label="Published" value={stats.published} icon={<CheckCircle2 size={20} className="text-success" />} />
        <StatCard label="Expired" value={stats.expired} icon={<AlertCircle size={20} className="text-rose-500" />} />
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-2 bg-surface-container p-2 rounded-2xl border border-outline shadow-sm max-w-md">
        <Search size={18} className="text-surface-on-surface-variant ml-2" />
        <input 
          type="text"
          placeholder="Search exams..."
          className="bg-transparent border-none text-sm font-semibold text-surface-on-surface placeholder:text-surface-on-surface-variant/50 outline-none w-full py-2"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Exam List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-12 flex justify-center"><p className="text-surface-on-surface-variant animate-pulse">Loading exams...</p></div>
        ) : filteredExams.length > 0 ? (
          filteredExams.map((exam) => (
            <Link href={`/exams/${exam._id}`} key={exam._id}>
              <Card className="p-5 hover:bg-surface-container-low transition-all cursor-pointer group border-outline-variant hover:border-primary">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex gap-5 items-center">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-surface-on-surface">{exam.name}</h3>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary-container/20 rounded-md">
                          {exam.code}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-surface-on-surface-variant">
                          <Calendar size={14} />
                          {new Date(exam.scheduleDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-surface-on-surface-variant">
                          <Clock size={14} />
                          {exam.duration} mins
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border ${getStatusStyle(exam.status)}`}>
                      {exam.status}
                    </div>
                    <ChevronRight size={20} className="text-surface-on-surface-variant group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <div className="py-24 text-center bg-surface-container-lowest rounded-3xl border border-dashed border-outline">
            <AlertCircle size={48} className="text-surface-on-surface-variant/20 mx-auto mb-4" />
            <p className="text-lg font-bold text-surface-on-surface-variant uppercase tracking-widest">No exams found</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <Card className="p-6 border border-outline-variant bg-surface-container-lowest shadow-sm flex items-center justify-between group hover:shadow-md transition-all rounded-3xl">
      <div>
        <p className="text-[11px] font-black text-surface-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-bold text-surface-on-surface">{value}</p>
      </div>
      <div className="p-4 bg-surface-container-high rounded-2xl flex items-center justify-center transition-all group-hover:scale-110">
        {icon}
      </div>
    </Card>
  );
}

