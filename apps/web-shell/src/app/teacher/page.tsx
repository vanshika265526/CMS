"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  FileCheck, 
  ArrowUpRight, 
  AlertTriangle,
  Clock,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Settings
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    classesToday: 0,
    shortages: 0,
    submissions: 0
  });
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [stuRes, todayRes, shortRes, matRes] = await Promise.all([
        api.get('/teacher/students'),
        api.get('/teacher/timetable/today'),
        api.get('/teacher/attendance/shortage'),
        api.get('/teacher/materials')
      ]);

      setStats({
        totalStudents: stuRes.data.data.length,
        classesToday: todayRes.data.data.length,
        shortages: shortRes.data.data.length,
        submissions: matRes.data.data.filter((m: any) => m.type === 'Assignment').length
      });
      setTodayClasses(todayRes.data.data);
    } catch (err) {
      console.error("Dashboard data load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return (
     <div className="animate-pulse space-y-8">
        <div className="h-10 w-48 bg-slate-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 h-[400px] bg-slate-50 rounded-3xl"></div>
           <div className="h-[400px] bg-slate-50 rounded-3xl"></div>
        </div>
     </div>
  );

  const getCurrentClass = () => {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    return todayClasses.find((c: any) => {
      if (!c.startTime || !c.endTime) return false;
      const startParts = c.startTime.split(':');
      const endParts = c.endTime.split(':');
      if (startParts.length < 2 || endParts.length < 2) return false;
      
      const start = Number(startParts[0]) * 100 + Number(startParts[1]);
      const end = Number(endParts[0]) * 100 + Number(endParts[1]);
      return currentTime >= start && currentTime <= end;
    });
  };

  const liveClass = getCurrentClass();

  return (
    <div className="space-y-10 pb-20">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">Portal <span className="text-indigo-600">Overview</span></h1>
          <p className="text-slate-500 mt-2 font-medium">Monitoring academic performance and schedule for Spring Semester 2024.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/settings"
            className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:bg-slate-100 transition-all"
          >
            <Settings size={14} />
            Account Settings
          </Link>

          {liveClass && (
             <div className="bg-indigo-600 px-6 py-4 rounded-[2rem] flex items-center gap-4 animate-bounce shadow-xl shadow-indigo-600/20">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-white text-[10px] font-black uppercase tracking-widest">Live Session In Progress: Period {liveClass.period}</span>
             </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl w-fit mb-4">
               <Users size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Students</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.totalStudents}</h3>
            <div className="mt-4 flex items-center text-[10px] font-bold text-green-600">
               <TrendingUp size={12} className="mr-1" />
               <span>ACTIVE ROLL</span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all duration-500">
               <Users size={120} />
            </div>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl w-fit mb-4">
               <Calendar size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Classes Today</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.classesToday}</h3>
            <div className="mt-4 flex items-center text-[10px] font-bold text-indigo-600">
               <Clock size={12} className="mr-1" />
               <span>NEXT: 11:30 AM</span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all duration-500">
               <Calendar size={120} />
            </div>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="p-2.5 bg-red-600 text-white rounded-2xl w-fit mb-4">
               <AlertTriangle size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Shortage Alerts</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.shortages}</h3>
            <div className="mt-4 flex items-center text-[10px] font-bold text-red-600">
               <TrendingUp size={12} className="mr-1" />
               <span>BELOW 75%</span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all duration-500">
               <AlertTriangle size={120} />
            </div>
         </div>

         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="p-2.5 bg-slate-900 text-white rounded-2xl w-fit mb-4">
               <FileCheck size={20} />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Active Assignments</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{stats.submissions}</h3>
            <div className="mt-4 flex items-center text-[10px] font-bold text-slate-600">
               <BookOpen size={12} className="mr-1" />
               <span>UNGRADED ENTRIES</span>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all duration-500">
               <FileCheck size={120} />
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Today's Classes List */}
         <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-bold text-slate-900">Immediate Schedule</h3>
               <Link href="/teacher/timetable" className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 hover:text-slate-900 transition-colors">
                  Full Weekly View
                  <ArrowUpRight size={14} />
               </Link>
            </div>
            
            <div className="space-y-4">
               {liveClass && (
                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] border border-indigo-500 flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-indigo-600/30 group">
                     <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white text-indigo-600 rounded-2xl flex flex-col items-center justify-center font-black">
                           <span className="text-[10px] uppercase leading-none opacity-60">LIVE</span>
                           <span className="text-xl leading-tight">{liveClass.period}</span>
                        </div>
                        <div>
                           <p className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-1">Ongoing Session</p>
                           <h4 className="font-black text-white text-2xl uppercase tracking-tight">{liveClass.subjectId?.name || "Unnamed Subject"}</h4>
                           <div className="flex items-center gap-4 mt-2 text-xs font-bold text-indigo-100 uppercase tracking-widest">
                              <span>Room {liveClass.room || "N/A"}</span>
                              <span>•</span>
                              <span>Batch {liveClass.batchId?.name || "N/A"}</span>
                           </div>
                        </div>
                     </div>
                     {liveClass.subjectId?._id && liveClass.batchId?._id ? (
                        <Link 
                           href={`/teacher/attendance?subjectId=${liveClass.subjectId._id}&batchId=${liveClass.batchId._id}`}
                           className="mt-6 md:mt-0 px-8 py-4 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl group-hover:bg-slate-50 transition-all flex items-center gap-2"
                        >
                           Mark Presence <ChevronRight size={16} />
                        </Link>
                     ) : (
                        <button 
                           disabled 
                           className="mt-6 md:mt-0 px-8 py-4 bg-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 cursor-not-allowed"
                           title="Subject or batch information is missing"
                        >
                           Mark Presence <ChevronRight size={16} />
                        </button>
                     )}
                  </div>
               )}

               {todayClasses.filter((c: any) => c._id !== liveClass?._id).length > 0 ? todayClasses.filter((c: any) => c._id !== liveClass?._id).map((item: any) => (
                  <div key={item._id} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between hover:border-slate-300 transition-all shadow-sm">
                     <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex flex-col items-center justify-center font-bold">
                           <span className="text-[10px] uppercase leading-none opacity-60">Per</span>
                           <span className="text-lg leading-tight">{item.period}</span>
                        </div>
                        <div>
                           <h4 className="font-bold text-slate-900 text-lg">{item.subjectId?.name || "Unnamed Subject"}</h4>
                           <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-semibold text-slate-400 uppercase tracking-tighter">
                              <span className="flex items-center gap-1"><Clock size={12} /> {item.startTime} - {item.endTime}</span>
                              <span className="flex items-center gap-1">• Room {item.room || "N/A"}</span>
                              <span className="flex items-center gap-1">• Batch {item.batchId?.name || "N/A"}</span>
                              <span className="flex items-center gap-1">• Sec {item.section || "N/A"}</span>
                           </div>
                        </div>
                     </div>
                     {item.subjectId?._id && item.batchId?._id ? (
                        <Link href={`/teacher/attendance?subjectId=${item.subjectId._id}&batchId=${item.batchId._id}`} className="p-3 bg-slate-50 text-slate-900 rounded-2xl hover:bg-slate-900 hover:text-white transition-all">
                           <ChevronRight size={20} />
                        </Link>
                     ) : (
                        <button disabled className="p-3 bg-slate-200 text-slate-400 rounded-2xl cursor-not-allowed" title="Subject or batch information missing">
                           <ChevronRight size={20} />
                        </button>
                     )}
                  </div>
               )) : (
                  <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                     <p className="text-slate-400 font-medium italic">No classes scheduled for the remainder of today.</p>
                  </div>
               )}
            </div>
         </div>

         {/* Quick Actions / Activity Feed */}
         <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Priority Actions</h3>
            <div className="bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden">
               <div className="relative z-10">
                  <h4 className="text-lg font-bold mb-2">Publish Results</h4>
                  <p className="text-xs text-slate-400 font-medium mb-6 leading-relaxed">Admin has reviewed Mark Records for Spring Internal. Ready for portal publishing?</p>
                  <button className="px-6 py-2.5 bg-white text-slate-900 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
                     Verify Internal 01
                  </button>
               </div>
               <div className="absolute -right-2 -bottom-2 opacity-10">
                  <TrendingUp size={120} />
               </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pb-2 border-b border-slate-50">Recent Communication</h4>
               <div className="space-y-4">
                  {[1, 2].map(i => (
                     <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex-shrink-0"></div>
                        <div className="min-w-0">
                           <p className="text-xs font-bold text-slate-900 truncate">Message from Admin Office</p>
                           <p className="text-[10px] text-slate-400 line-clamp-1">Reminder: Faculty meeting scheduled for Friday 4PM.</p>
                        </div>
                     </div>
                  ))}
               </div>
               <Link href="/teacher/communication" className="w-full py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors pt-2 block text-center">
                  View All Notifications
               </Link>
            </div>
         </div>
      </div>
    </div>
  );
}
