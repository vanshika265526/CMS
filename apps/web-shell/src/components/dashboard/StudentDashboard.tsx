"use client";

import React from "react";
import Link from "next/link";
import { 
  Clock, 
  Sparkles, 
  GraduationCap as GradIcon,
  Megaphone,
  Book,
  AlertCircle,
  FileText,
  Download,
  Calendar,
  ArrowUpRight,
  ClipboardCheck
} from "lucide-react";
import Card from "@/components/ui/Card";
import { useSocket } from "@/components/providers/SocketProvider";
import { fetchMyAnnouncements, fetchUnreadCount } from "@/lib/api/communication";
import { fetchMyProfile, fetchMyAttendance, fetchMyResults, fetchMyTodaySchedule, fetchMyLibraryTransactions, fetchMyAssignments, fetchMyMaterials } from "@/lib/api/student";
import { cn } from "@/lib/utils";

const resolveFileUrl = (rawUrl?: string) => {
  if (!rawUrl) return '#';
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
  const apiRoot = base.replace(/\/api\/?$/, '');
  return `${apiRoot}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
};

export default function StudentDashboard() {
  const { socket } = useSocket();
  const [profile, setProfile] = React.useState<any>(null);
  const [attendanceData, setAttendanceData] = React.useState<any>(null);
  const [resultsData, setResultsData] = React.useState<any>(null);
  const [schedule, setSchedule] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [libraryTx, setLibraryTx] = React.useState<any[]>([]);
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [materials, setMaterials] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = async () => {
    try {
      const results = await Promise.allSettled([
        fetchMyProfile(),
        fetchMyAttendance(),
        fetchMyResults(),
        fetchMyTodaySchedule(),
        fetchMyAnnouncements(),
        fetchUnreadCount(),
        fetchMyLibraryTransactions({ limit: 3 }),
        fetchMyAssignments(),
        fetchMyMaterials()
      ]);

      const [
        profileRes, 
        attendanceRes, 
        resultsRes, 
        scheduleRes, 
        annRes, 
        unreadRes, 
        libraryRes, 
        assignmentsRes, 
        materialsRes
      ] = results.map(r => r.status === 'fulfilled' ? r.value : { success: false, data: [], count: 0 });

      if (profileRes.success) {
        setProfile(profileRes.data);
        localStorage.setItem("student_profile", JSON.stringify({
          _id: profileRes.data._id,
          batchId: profileRes.data.academicInfo?.batchId || profileRes.data.batchId
        }));
      }
      if (attendanceRes.success) setAttendanceData(attendanceRes.data);
      if (resultsRes.success) setResultsData(resultsRes.data);
      if (scheduleRes.success) setSchedule(scheduleRes.data);
      if (annRes.success) setAnnouncements(annRes.data);
      if (unreadRes.success) setUnreadCount(unreadRes.data.count);
      if (libraryRes?.success) setLibraryTx(libraryRes.data);
      if (assignmentsRes?.success) setAssignments(assignmentsRes.data);
      if (materialsRes?.success) setMaterials(materialsRes.data);

    } catch (err) {
      console.error("Failed to load student dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();

    if (socket) {
      const handlers = [
        ["attendanceUpdated", loadData],
        ["resultsPublished", loadData],
        ["newMessage", loadData],
        ["libraryUpdate", loadData],
        ["notification", loadData]
      ];
      handlers.forEach(([evt, cb]) => socket.on(evt as string, cb as any));
      return () => {
        handlers.forEach(([evt, cb]) => socket.off(evt as string, cb as any));
      };
    }
  }, [socket]);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Clock className="animate-spin text-indigo-400" size={48} />
      </div>
    );
  }

  const attendancePct = attendanceData?.percentage || attendanceData?.data?.percentage || 0;
  const subjectWise = attendanceData?.subjectWise || attendanceData?.data?.subjectWise || [];
  const cgpa = resultsData?.overallCgpa || resultsData?.data?.overallCgpa || 0;
  const lastPercent = resultsData?.latestPercentage || resultsData?.data?.latestPercentage || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {profile?.personalInfo?.firstName}!
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {profile?.academicInfo?.course} | Batch {profile?.academicInfo?.batch}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Roll Number</p>
              <p className="text-sm font-bold text-slate-900">{profile?.academicInfo?.rollNumber || 'N/A'}</p>
            </div>
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg border border-slate-800">
              {profile?.personalInfo?.firstName?.[0]}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Attendance" value={`${attendancePct}%`} trend={attendancePct >= 75 ? "Safe" : "Low"} trendUp={attendancePct >= 75} subtitle="Overall Presence" icon={<Clock size={20} />} color="bg-indigo-50 text-indigo-600 border border-indigo-100" />
        <KPICard title="Current CGPA" value={`${cgpa}`} trend={cgpa >= 7 ? "Excellent" : "Average"} trendUp={cgpa >= 7} subtitle="Academic Standing" icon={<Sparkles size={20} />} color="bg-amber-50 text-amber-600 border border-amber-100" />
        <KPICard title="Performance" value={`${lastPercent}%`} trend="Latest Exam" trendUp={lastPercent >= 40} subtitle="Recent Result" icon={<GradIcon size={20} />} color="bg-purple-50 text-purple-600 border border-purple-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {announcements.length > 0 && (
            <Card className="p-6 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/20 border-none overflow-hidden relative group">
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Active Announcements</h3>
                    <p className="text-xs text-indigo-100 font-medium">You have {announcements.length} new messages.</p>
                  </div>
                </div>
                <Link href="/communication" className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95">
                  Enter Hub
                </Link>
              </div>
            </Card>
          )}

          {assignments.length > 0 && (
            <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl animate-in zoom-in-95 duration-700 delay-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display uppercase tracking-tight">Active Assignments</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending Tasks & Submissions</p>
                </div>
                <Link href="/student/assignments" className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shadow-sm border border-indigo-100 hover:bg-slate-900 hover:text-white transition-all">
                  <ArrowUpRight size={20} />
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map((assignment: any) => {
                  const dueDate = new Date(assignment.dueDate || new Date());
                  const diffDays = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  let status = "Pending";
                  let statusClass = "bg-indigo-50 text-indigo-600 border-indigo-100";
                  let Icon = Book;
                  if (assignment.submissionStatus === 'GRADED') {
                    status = "Graded"; statusClass = "bg-emerald-50 text-emerald-600 border-emerald-100"; Icon = ClipboardCheck;
                  } else if (assignment.submissionStatus === 'SUBMITTED') {
                    status = "Submitted"; statusClass = "bg-blue-50 text-blue-600 border-blue-100"; Icon = Clock;
                  } else if (diffDays < 0) {
                    status = "Overdue"; statusClass = "bg-rose-50 text-rose-600 border-rose-100"; Icon = AlertCircle;
                  } else if (diffDays <= 2) {
                    status = `Due in ${diffDays}d`; statusClass = "bg-amber-50 text-amber-600 border-amber-100"; Icon = Clock;
                  }
                  return (
                    <Link href={`/student/assignments`} key={assignment._id} className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col group hover:bg-white hover:shadow-ambient hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${statusClass.split(' ')[0]}`} />
                      <div className="flex justify-between items-start mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${statusClass}`}>
                          <Icon size={10} /> {status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight mb-1 group-hover:text-indigo-600">{assignment.title}</h3>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 truncate italic">{assignment.subjectId?.name || "General"}</p>
                    </Link>
                  );
                })}
              </div>
            </Card>
          )}

          {materials.length > 0 && (
            <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display uppercase tracking-tight">Study Materials</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Notes & Reference Guides</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shadow-sm border border-emerald-100 text-emerald-600">
                  <FileText size={20} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {materials.map((item: any) => (
                  <a key={item._id} href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noopener noreferrer" className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-ambient hover:border-emerald-100 transition-all">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                      <Download size={18} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate italic">{item.type} • {item.subjectId?.name || 'General'}</p>
                    </div>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl">
            <h2 className="text-xl font-bold text-slate-900 mb-6 font-display">Today's Schedule</h2>
            <div className="space-y-6">
              {schedule.length > 0 ? schedule.map((slot, i) => (
                <EventRow key={i} month="TOD" day={slot.startTime} title={slot.subjectId?.name || "Class"} sub={`${slot.room || 'TBD'} | Period ${slot.period}`} color="bg-indigo-50 text-indigo-600" />
              )) : (
                <div className="py-12 text-center opacity-40">
                  <Clock size={32} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Sessions Logged Today</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, trendUp, subtitle, icon, color }: any) {
  return (
    <Card className="p-6 border border-slate-100 bg-white shadow-sm rounded-3xl group hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center transition-all group-hover:scale-110`}>{icon}</div>
        <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{trend}</div>
      </div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-[11px] text-slate-400 font-medium tracking-wide">{subtitle}</span>
      </div>
    </Card>
  );
}

function EventRow({ month, day, title, sub, color }: any) {
  return (
    <div className="flex gap-4 items-start">
      <div className={`w-10 h-10 ${color} rounded-xl flex flex-col items-center justify-center shrink-0 border border-current/10 shadow-sm`}>
        <span className="text-[10px] font-bold leading-none opacity-80">{month}</span>
        <span className="text-sm font-black">{day}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{title}</p>
        <p className="text-[11px] text-slate-400 font-medium">{sub}</p>
      </div>
    </div>
  );
}
