"use client";

import React from "react";
import { 
  Users, 
  GraduationCap, 
  TrendingUp, 
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowRightLeft,
  ArrowRight,
  School
} from "lucide-react";
import StatsCard from "@/components/admin/StatsCard";
import { fetchDashboardStats, fetchEnrollmentActivity } from "@/lib/api/admin";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = React.useState<any>(null);
   const [enrollmentSeries, setEnrollmentSeries] = React.useState<Array<{ month: string; count: number }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
      const loadAll = async () => {
         await Promise.all([loadStats(), loadEnrollmentActivity()]);
      };

      loadAll();

      const intervalId = window.setInterval(loadAll, 30000);
      return () => window.clearInterval(intervalId);
  }, []);

  const loadStats = async () => {
    try {
      const res = await fetchDashboardStats();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

   const loadEnrollmentActivity = async () => {
      try {
         const res = await fetchEnrollmentActivity();
         if (res.success && Array.isArray(res.data)) {
            setEnrollmentSeries(res.data.map((item: any) => ({
               month: String(item.month || ''),
               count: Number(item.count || 0),
            })));
         }
      } catch (err) {
         console.error('Failed to load enrollment activity', err);
      }
   };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Operations Hub</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Real-time college performance metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          icon={<Users className="text-blue-500" />} 
          label="Total Students" 
          value={loading ? "..." : stats?.totalStudents?.toLocaleString() || "0"} 
          trend={stats?.studentTrend || "Counting..."}
          description="Active enrollments across all batches"
        />
        <StatsCard 
          icon={<GraduationCap className="text-emerald-500" />} 
          label="Faculty Count" 
          value={loading ? "..." : stats?.totalFaculty || "0"} 
          trend={stats?.facultyTrend || "Synchronizing..."}
          description="Subject matter experts on roll"
        />
        <StatsCard 
          icon={<TrendingUp className="text-amber-500" />} 
          label="Revenue" 
          value={loading ? "..." : `₹${(stats?.revenue / 100000).toFixed(1)}L`} 
          trend={stats?.revenueTrend || "Realizing..."}
          description="Total fee collection this year"
        />
        <StatsCard 
          icon={<AlertCircle size={24} className="text-rose-500" />} 
          label="At-Risk Students" 
          value={loading ? "..." : stats?.atRiskCount || "0"} 
          trend="Real-time Analysis"
          description={loading ? "Analyzing..." : `${stats?.atRiskCount} require immediate intervention`}
        />
      </div>

      {/* Quick Access & Strategic Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Link 
          href="/admin/assignments"
          className="group relative bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-600/20 cursor-pointer hover:scale-[1.02] transition-all overflow-hidden block"
        >
           <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
           <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                    <ArrowRightLeft className="text-white" size={24} />
                 </div>
                 <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">Academic Assignments</h2>
              </div>
              <p className="text-sm font-medium text-indigo-100 max-w-sm mb-8 leading-relaxed">
                 Configure faculty subject-batch mappings and student enrollments. System-wide data sync enabled.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em]">
                 Enter Portal <ArrowRight size={14} />
              </div>
           </div>
        </Link>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex items-center gap-8 shadow-sm">
           <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shrink-0">
               <School size={32} />
           </div>
           <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1">Campus Hierarchy</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                 Manage Departments, Courses, and Batches across 4 distinct academic spheres.
              </p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
           <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-6">Enrollment Activity</h3>
           <div className="h-64 flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 relative group overflow-hidden">
              {loading ? (
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Data...</p>
              ) : (
                 <div className="w-full h-full p-8 flex items-end gap-4">
                    {enrollmentSeries.map((item: any, idx: number) => (
                       <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                          <div 
                            className="w-full bg-slate-900 rounded-t-lg transition-all hover:bg-indigo-600 cursor-help relative group/bar"
                            style={{
                              height: `${(item.count / Math.max(1, ...enrollmentSeries.map((i: any) => i.count))) * 100}%`,
                              minHeight: item.count > 0 ? '6px' : '2px'
                            }}
                          >
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap">
                                {item.count} Enrollments
                             </div>
                          </div>
                          <span className="text-[8px] font-black text-slate-400 uppercase">{item.month}</span>
                       </div>
                    ))}
                    {enrollmentSeries.length === 0 && (
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic text-center w-full">No recent enrollment data</p>
                    )}
                 </div>
              )}
           </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col">
           <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-400">Critical Alerts</h3>
              <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                 <AlertCircle size={14} />
              </div>
           </div>
           
           <div className="space-y-6">
              {loading ? (
                <div className="space-y-4">
                   {[1,2,3].map(i => <div key={i} className="h-10 bg-white/5 animate-pulse rounded-lg" />)}
                </div>
              ) : (
                stats?.alerts?.map((alert: any, idx: number) => (
                  <AlertItem 
                    key={idx}
                    title={alert.title} 
                    detail={alert.detail} 
                    time={alert.time}
                  />
                ))
              )}
           </div>

           <Link href="/admin/communication" className="mt-auto w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-center block">
              View All Notifications
           </Link>
        </div>
      </div>

      {/* AI Early Warning System Section */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
         <div className="flex items-center justify-between mb-8">
            <div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">AI Early Warning System</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Students flagged for immediate intervention</p>
            </div>
            <Link href="/admin/students" className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All {stats?.atRiskCount || 0}</Link>
         </div>

         <div className="space-y-4">
            {loading ? (
               <div className="h-20 bg-slate-50 animate-pulse rounded-2xl" />
            ) : (
               stats?.atRiskStudents?.map((student: any) => (
                  <div key={student._id} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:shadow-lg transition-all group">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white text-[10px] font-black uppercase">
                           {student.personalInfo.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <div>
                           <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{student.personalInfo.name}</p>
                           <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{student.uniqueStudentId || student.studentId || 'N/A'}</p>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        {student.academicInfo?.attendancePercentage < 75 && (
                           <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-2 py-1 rounded-lg uppercase">Low Attendance</span>
                        )}
                        {student.academicInfo?.feeStatus === 'Overdue' && (
                           <span className="text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg uppercase">Fee Overdue</span>
                        )}
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mb-0.5">Risk Level</p>
                        <p className="text-sm font-black text-slate-900 tracking-tighter">CRITICAL</p>
                     </div>
                  </div>
               ))
            )}
            {!loading && stats?.atRiskStudents?.length === 0 && (
               <div className="py-12 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  No critical interventions required today
               </div>
            )}
         </div>
      </div>
    </div>
  );
}

function AlertItem({ title, detail, time }: { title: string, detail: string, time: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-white/90">{title}</p>
        <div className="flex items-center gap-1 text-[8px] text-white/30 uppercase font-black">
           <Clock size={8} /> {time}
        </div>
      </div>
      <p className="text-[10px] font-medium text-white/50 leading-relaxed">{detail}</p>
    </div>
  );
}
