"use client";

import React, { useEffect, useState } from "react";
import { getDepartments, getCourses, getBatches } from "@/lib/api/academics";
import Card from "@/components/ui/Card";
import { Layers, Calendar, Users, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AcademicsOverview() {
  const [stats, setStats] = useState({ depts: 0, courses: 0, batches: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [deptRes, courseRes, batchRes] = await Promise.all([
          getDepartments(),
          getCourses(),
          getBatches()
        ]);
        
        setStats({
          depts: Array.isArray(deptRes) ? deptRes.length : deptRes.data?.length || 0,
          courses: Array.isArray(courseRes) ? courseRes.length : courseRes.data?.length || 0,
          batches: Array.isArray(batchRes) ? batchRes.length : batchRes.data?.length || 0,
        });
      } catch (err) {
        console.error("Failed to load academic stats", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Departments" count={stats.depts} icon={<Layers size={20} className="text-white" />} href="/academics/departments" color="bg-indigo-500" />
        <StatCard title="Active Courses" count={stats.courses} icon={<Calendar size={20} className="text-white" />} href="/academics/courses" color="bg-emerald-500" />
        <StatCard title="Mapped Batches" count={stats.batches} icon={<Users size={20} className="text-white" />} href="/academics/batches" color="bg-amber-500" />
      </div>

      <Card className="p-8 bg-indigo-600 text-white border-none shadow-xl shadow-indigo-600/20 overflow-hidden relative rounded-3xl">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <h3 className="text-2xl font-bold mb-2 relative z-10">Curriculum Structure</h3>
        <p className="text-sm text-indigo-100 max-w-xl relative z-10 leading-relaxed mb-6 font-medium">
          The academic engine synchronizes departments, courses, and localized batches. Data configured here seamlessly links to the Admissions and Student Lifecycle pipelines.
        </p>
        <div className="flex items-center gap-4 relative z-10">
           <Link href="/academics/departments" className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/90 transition-all flex items-center gap-2 shadow-sm">
             Initialize Department <ArrowRight size={14} />
           </Link>
        </div>
      </Card>
    </div>
  );
}

function StatCard({ title, count, icon, href, color }: any) {
  return (
    <Link href={href} className="block group">
      <Card className="p-6 border border-slate-100 bg-slate-50 group-hover:bg-white group-hover:shadow-md group-hover:border-slate-200 transition-all h-full flex flex-col justify-between relative overflow-hidden rounded-3xl">
        <div className="flex items-center justify-between mb-8 z-10 relative">
          <div className={`w-12 h-12 ${color} rounded-[1rem] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
          <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:-rotate-45 transition-all" />
        </div>
        <div className="z-10 relative">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">{title}</p>
          <h2 className="text-4xl font-black text-slate-900">{count}</h2>
        </div>
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-slate-100/50 rounded-tl-full -mr-16 -mb-16 group-hover:scale-150 group-hover:bg-indigo-50 transition-transform duration-700 pointer-events-none" />
      </Card>
    </Link>
  );
}
