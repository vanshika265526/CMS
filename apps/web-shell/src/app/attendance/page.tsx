"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AttendanceMarker from '@/components/attendance/AttendanceMarker';
import ShortageAlertsPanel from '@/components/attendance/ShortageAlertsPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardCheck, Brain, BarChart2, Activity, ShieldAlert, CheckCircle2, Calendar } from 'lucide-react';
import { getHubStats } from '@/lib/api/attendance';
import { fetchMyAttendance } from '@/lib/api/student';
import { cn } from '@/lib/utils';
import Card from '@/components/ui/Card';

const staffTabs = [
  { id: 'mark',     label: 'Mark Attendance', icon: ClipboardCheck },
  { id: 'ai',       label: 'AI Shortage Alerts', icon: Brain },
];

const studentTabs = [
  { id: 'overview', label: 'Attendance Overview', icon: BarChart2 },
  { id: 'history',  label: 'Session History', icon: Activity },
];

export default function AttendancePage() {
  const router = useRouter();
  const [role, setRole] = useState<string>('STUDENT');
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({ avgAttendance: 0, pendingLeaves: 0, shortageCount: 0 });
  const [personalData, setPersonalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadResources() {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userRole = user.role;

        // Redirect portal users to their correct attendance page
        if (['COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
          router.replace('/admin/attendance');
          return;
        }
        if (userRole === 'TEACHER') {
          router.replace('/teacher/attendance');
          return;
        }

        setRole(userRole);

        if (['STUDENT', 'PARENT'].includes(userRole)) {
          setActiveTab('overview');
          const res = await fetchMyAttendance();
          if (res.success) setPersonalData(res.data);
        } else {
          setActiveTab('mark');
          const res = await getHubStats();
          if (res.success) setStats(res.data);
        }
      } catch (err) {
        console.error("Failed to load attendance portal data", err);
      } finally {
        setLoading(false);
      }
    }
    loadResources();
  }, [router]);

  const currentTabs = ['STUDENT', 'PARENT'].includes(role) ? studentTabs : staffTabs;

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto w-full pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Attendance <span className="text-indigo-600">Matrices</span></h1>
          <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
            Presence Tracking & Predictive Diagnostics
          </p>
        </div>

        {/* Dynamic Context Pills */}
        {!['STUDENT', 'PARENT'].includes(role) ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
              <BarChart2 size={16} />
              <span>Avg: {stats.avgAttendance || 0}%</span>
            </div>
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
              <Brain size={16} />
              <span>{stats.shortageCount || 0} At-Risk Nodes</span>
            </div>
          </div>
        ) : (
           <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border",
                (personalData?.percentage || 0) < 75 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
              )}>
                 <Activity size={16} />
                 <span>Status: {(personalData?.percentage || 0) < 75 ? "CRITICAL" : "HEALTHY"}</span>
              </div>
           </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-white shadow-sm p-1.5 rounded-2xl border border-slate-100 w-fit">
        {currentTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-8 py-3 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${
              activeTab === tab.id ? 'text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="attendance-tab"
                className="absolute inset-0 bg-indigo-600 rounded-xl"
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon size={16} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 md:p-10 shadow-sm min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'mark' && <AttendanceMarker />}
            {activeTab === 'ai' && <ShortageAlertsPanel />}
            {activeTab === 'overview' && <StudentAttendanceOverview data={personalData} />}
            {activeTab === 'history' && <StudentSessionHistory records={personalData?.records || []} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StudentAttendanceOverview({ data }: { data: any }) {
  if (!data) return null;

  const percentage = data.percentage || 0;
  const isCritical = percentage < 75;

  return (
    <div className="space-y-12">
      {/* Prime Stat Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={cn(
          "md:col-span-2 p-10 rounded-[2.5rem] flex flex-col justify-between relative overflow-hidden",
          isCritical ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
        )}>
          <div className="relative z-10">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Cumulative Presence</p>
             <h2 className="text-7xl font-black tracking-tighter">{percentage}%</h2>
             {isCritical && (
                <div className="mt-6 flex items-center gap-2 bg-white/50 backdrop-blur-md px-4 py-2 rounded-xl border border-rose-200 w-fit">
                   <ShieldAlert size={16} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Warning: Below 75% Threshold</span>
                </div>
             )}
          </div>
          <Activity className="absolute -right-10 -bottom-10 w-48 h-48 opacity-[0.05] rotate-12" />
        </Card>

        <StatMiniCard title="Total Periods" value={data.totalClasses} icon={<BarChart2 size={20} />} color="bg-slate-50 text-slate-600" />
        <StatMiniCard title="Present" value={data.presentClasses} icon={<CheckCircle2 size={20} />} color="bg-indigo-50 text-indigo-600 border-indigo-100" />
      </div>

      {/* Subject Wise Breakdown */}
      <div className="space-y-6">
         <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Academic Itemization</h3>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {data.subjectWise?.map((sub: any, i: number) => {
               const subCritical = sub.percentage < 75;
               return (
                  <Card key={i} className="p-8 border border-slate-100 rounded-3xl hover:shadow-xl transition-all group">
                     <div className="flex justify-between items-start mb-6">
                        <div>
                           <h4 className="text-lg font-black text-slate-900 leading-none">{sub.name}</h4>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                             Last Entry: {sub.lastMarkedAt ? new Date(sub.lastMarkedAt).toLocaleDateString() : 'N/A'}
                           </p>
                        </div>
                        <div className={cn(
                           "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                           subCritical ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                           {sub.percentage}%
                        </div>
                     </div>
                     
                     {/* Progress Track */}
                     <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${sub.percentage}%` }}
                           className={cn(
                              "absolute inset-y-0 left-0 rounded-full",
                              subCritical ? "bg-rose-600" : "bg-emerald-600"
                           )}
                        />
                     </div>
                     <div className="mt-4 flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span>{sub.present} / {sub.total} Sessions</span>
                        <span>{subCritical ? "Attention Required" : "Sufficient"}</span>
                     </div>
                  </Card>
               );
            })}
         </div>
      </div>
    </div>
  );
}

function StudentSessionHistory({ records }: { records: any[] }) {
  return (
    <div className="space-y-6">
       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Temporal Logs</h3>
       <div className="overflow-hidden border border-slate-100 rounded-3xl bg-slate-50/30">
          <table className="w-full text-left">
             <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Timeline</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Subject Reference</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Verification Status</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {records.map((r, i) => (
                   <tr key={i} className="hover:bg-white transition-colors group">
                      <td className="px-6 py-5">
                         <div className="flex items-center gap-3">
                            <Calendar size={14} className="text-slate-300" />
                            <span className="text-xs font-bold text-slate-700">{new Date(r.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                         <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{r.subject?.name || 'Unknown'}</span>
                      </td>
                      <td className="px-6 py-5">
                         <div className={cn(
                            "w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                            r.status === 'Present' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : 
                            r.status === 'Absent' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-amber-50 text-amber-600 border-amber-100"
                         )}>
                            {r.status}
                         </div>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
}

function StatMiniCard({ title, value, icon, color }: any) {
   return (
      <Card className={cn("p-8 rounded-[2.5rem] flex flex-col justify-between border border-slate-100 shadow-sm", color)}>
         <div className="flex justify-between items-start">
            <span className="text-2xl font-black">{value}</span>
            <div className="opacity-40">{icon}</div>
         </div>
         <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mt-4">{title}</p>
      </Card>
   );
}

