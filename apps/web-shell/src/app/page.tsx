"use client";

import React from "react";
import Card from "@/components/ui/Card";
import Link from "next/link";
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight,
  Clock,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Book,
  School,
  GraduationCap as GradIcon,
  CalendarDays,
  Baby,
  Calendar,
  Download,
  Award,
  ClipboardCheck,
  Bell,
  Megaphone
} from "lucide-react";
import { fetchMyProfile, fetchMyAttendance, fetchMyResults, fetchMyTodaySchedule, fetchMyLibraryTransactions, fetchMyAssignments } from "@/lib/api/student";
import { fetchMyAnnouncements, fetchUnreadCount } from "@/lib/api/communication";
import { fetchMyStudentProfile, fetchMyStudentAttendance, fetchMyStudentResults, fetchMyStudentTimetable, fetchMyStudentFees } from "@/lib/api/parent";
import { useSocket } from "@/components/providers/SocketProvider";
import { fetchTodayTimetable as fetchTeacherTimetable, fetchTeacherDashboardStats } from "@/lib/api/teacher";
import { getExams } from "@/lib/api/exams";
import { cn } from "@/lib/utils";
import { getSessionUser } from "@/lib/session";
import NgCMSLandingPage from "@/components/NgCMSLanding";

import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [role, setRole] = React.useState<string | null>(null);
  const [isVisitor, setIsVisitor] = React.useState<boolean | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setIsVisitor(true);
      return;
    }

    setIsVisitor(false);
    const userRole = getSessionUser()?.role;
    setRole(userRole);
    
    // Strategic Redirection to Specialized Portals
    if (userRole === "SUPER_ADMIN") {
      router.push("/super-admin/dashboard");
    } else if (userRole === "COLLEGE_ADMIN") {
      router.push("/admin");
    } else if (userRole === "TEACHER") {
      router.push("/teacher");
    } else if (userRole === "LIBRARIAN") {
      router.push("/librarian");
    }
  }, [router]);

  if (isVisitor === null) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isVisitor) {
    return <NgCMSLandingPage />;
  }

  // Loading or Redirecting State
  if (!role || role === "COLLEGE_ADMIN" || role === "SUPER_ADMIN" || role === "TEACHER" || role === "LIBRARIAN") return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
       <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  switch (role) {
    case "TEACHER":
      return <TeacherDashboard />;
    case "STUDENT":
      return <StudentDashboard />;
    case "PARENT":
      return <ParentDashboard />;
    default:
      return null;
  }
}

function PublicLanding() {
  return (
    <div className="min-h-screen bg-[#080719] text-white overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-white/10 backdrop-blur bg-[#080719]/80">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 shadow-[0_0_24px_rgba(67,56,247,0.5)] grid place-items-center font-bold">✦</div>
            <div className="font-black tracking-tight">NgCMS <span className="text-indigo-400">ERP</span></div>
          </div>
          <Link href="/login" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold hover:bg-indigo-500 transition-colors">
            Sign In
          </Link>
        </div>
      </header>

      <section className="relative px-6 pt-24 pb-20 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(67,56,247,0.4),transparent_70%)]" />
        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-4 py-1 text-xs uppercase tracking-[0.15em] text-indigo-200">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            St. Xavier's Digital Curator
          </div>
          <h1 className="mt-7 text-5xl md:text-7xl font-black tracking-tight leading-[0.95]">
            The <span className="text-indigo-400">Intelligent</span><br />Campus OS
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-slate-300 text-base md:text-lg leading-relaxed">
            Unified academics, attendance, exams, finance, library, and communication across student, parent, teacher, and admin portals.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="rounded-full bg-indigo-600 px-6 py-3 font-semibold hover:bg-indigo-500 transition-colors">
              Initialize Connection
            </Link>
            <a href="#modules" className="rounded-full border border-white/25 px-6 py-3 font-semibold hover:bg-white/10 transition-colors">
              Explore Features
            </a>
          </div>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-6xl px-6 pb-20 grid gap-4 md:grid-cols-3">
        {[
          ["Smart Attendance", "Real-time shortage alerts and parent notifications."],
          ["Exams & Results", "Mark entry, verification, and secure publish flow."],
          ["Timetable", "Role-aware schedule views with instant propagation."],
          ["Subjects & Materials", "Syllabus and references in one searchable hub."],
          ["Finance & Fees", "Clear fee tracking for student, parent, and admin."],
          ["Communication", "Announcements and message channels across roles."],
        ].map(([title, desc]) => (
          <div key={title} className="rounded-3xl border border-white/10 bg-white/5 p-6 hover:border-indigo-400/60 transition-colors">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="mt-2 text-sm text-slate-300">{desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

function AdminDashboard() {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Strategic KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Enrollment" value="2,847" trend="+12%" trendUp={true} subtitle="vs last year" icon={<Users size={20} />} color="bg-indigo-50 text-indigo-600 border-indigo-100" />
        <KPICard title="Attendance" value="78.4%" trend="-2.1%" trendUp={false} subtitle="Stable" icon={<Clock size={20} />} color="bg-emerald-50 text-emerald-600 border-emerald-100" />
        <KPICard title="Strategic Revenue" value="₹ 1.24 Cr" trend="+5.4%" trendUp={true} subtitle="Target 1.5 Cr" icon={<CreditCard size={20} />} color="bg-purple-50 text-purple-600 border-purple-100" />
        <KPICard title="At-Risk Alerts" value="47" trend="+3" trendUp={false} subtitle="AI Flagged" icon={<AlertCircle size={20} />} color="bg-amber-50 text-amber-600 border-amber-100" />
      </div>

      {/* Primary Operations Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Assignments Portal (The Missing Link) */}
        <Link 
          href="/admin/assignments"
          className="group relative bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/20 cursor-pointer hover:scale-[1.02] transition-all overflow-hidden border border-slate-800"
        >
           <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
           <div className="relative z-10">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-600/20">
                 <ArrowUpRight className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-black tracking-tighter uppercase leading-none mb-4">Academic Assignments</h2>
              <p className="text-xs font-medium text-slate-400 max-w-60 mb-8 leading-relaxed">
                 Configure teacher subject-batch mappings and student academic flows.
              </p>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">
                 System Control <ChevronRight size={12} />
              </div>
           </div>
        </Link>

        {/* AI Early Warning Panel (Condensed) */}
        <Card className="md:col-span-2 p-8 border border-slate-100 bg-white shadow-sm rounded-[2.5rem]">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">AI Early Warning</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Intervention required</p>
            </div>
            <Link href="/students" className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all">
              <ChevronRight size={20} />
            </Link>
          </div>
          <div className="space-y-4">
            <RiskRow name="Aravind Swami" id="STU-2024-089" risk="CRITICAL" score={92} factors={["Low Attendance"]} />
            <RiskRow name="Megha Raj" id="STU-2024-112" risk="HIGH" score={84} factors={["Grade Drop"]} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* System Health Card */}
         <Card className="p-8 border border-slate-100 bg-white shadow-sm rounded-[2.5rem] flex items-center gap-8">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center shrink-0 border border-indigo-100">
               <ShieldCheck size={32} />
            </div>
            <div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1 font-display">Governance Active</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                  Institutional protocols enforced across all 4 student portals.
               </p>
            </div>
         </Card>

         <Card className="p-8 border border-slate-100 bg-white shadow-sm rounded-[2.5rem] flex items-center gap-8">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shrink-0 border border-emerald-100">
               <Sparkles size={32} />
            </div>
            <div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-1 font-display">AI Insights Hub</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-loose">
                  Predictive analytics suggests +4% attendance growth next month.
               </p>
            </div>
         </Card>
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, trendUp, subtitle, icon, color }: any) {
  return (
    <Card className="p-6 border border-slate-100 bg-white shadow-sm rounded-3xl group hover:shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center transition-all group-hover:scale-110`}>
          {icon}
        </div>
        <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
          {trendUp ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
          {trend}
        </div>
      </div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
        <span className="text-[11px] text-slate-400 font-medium tracking-wide">{subtitle}</span>
      </div>
    </Card>
  );
}

function ParentDashboard() {
  const { socket } = useSocket();
  const [parentData, setParentData] = React.useState<any>(null);
  const [children, setChildren] = React.useState<any[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const [childSchedule, setChildSchedule] = React.useState<any[]>([]);
  const [fees, setFees] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [profileRes, attendanceRes, resultsRes, timetableRes, feesRes] = await Promise.all([
          fetchMyStudentProfile().catch(() => ({ success: false, data: null })),
          fetchMyStudentAttendance().catch(() => ({ success: false, data: null })),
          fetchMyStudentResults().catch(() => ({ success: false, data: null })),
          fetchMyStudentTimetable().catch(() => ({ success: false, data: [] })),
          fetchMyStudentFees().catch(() => ({ success: false, data: null }))
        ]);
        if (profileRes.success) setParentData(profileRes.data);
        if (profileRes.success) {
          const student = profileRes.data;
          // Store child profile for Socket joining
          localStorage.setItem("children_profiles", JSON.stringify([{
            _id: student._id,
            batchId: student.academicInfo?.batchId || student.batchId 
          }]));
          
          setChildren([{ 
            student: student, 
            attendance: attendanceRes.data.records, 
            results: resultsRes.data.results,
            stats: { 
              attendancePct: attendanceRes.data.percentage,
              cgpa: resultsRes.data.overallCgpa 
            }
          }]);
        }
        if (timetableRes.success) {
           // Get today's slots from the grouped weekly timetable
           const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
           const today = days[new Date().getDay()];
           setChildSchedule(timetableRes.data[today] || []);
        }
        if (feesRes.success) setFees(feesRes.data);

      } catch (err) {
        console.error("Failed to load parent dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    if (socket) {
      socket.on("attendanceUpdated", loadData);
      socket.on("resultsPublished", loadData);
      return () => {
        socket.off("attendanceUpdated", loadData);
        socket.off("resultsPublished", loadData);
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

  const currentChild = children[selectedChildIndex];
  const attendance = currentChild?.attendance || [];
  const results = currentChild?.results || [];
  const dueBalance = Number(fees?.due_amount ?? fees?.summary?.balance ?? 0);

  const attPct = currentChild?.stats?.attendancePct || 0;
  const childCgpa = currentChild?.stats?.cgpa || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Parent Portal — {parentData?.personalInfo?.firstName} {parentData?.personalInfo?.lastName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoring the academic journey of your children
          </p>
        </div>
        
        {children.length > 1 && (
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            {children.map((child, idx) => (
              <button
                key={child.student._id}
                onClick={() => setSelectedChildIndex(idx)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedChildIndex === idx 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {child.student.personalInfo.firstName}
              </button>
            ))}
          </div>
        )}
      </div>

      {currentChild ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard 
              title="Attendance" 
              value={`${attPct}%`} 
              trend={attPct > 75 ? "Consistent" : "Low"} 
              trendUp={attPct > 75} 
              subtitle="Current Semester" 
              icon={<Clock size={20} />} 
              color="bg-indigo-50 text-indigo-600 border border-indigo-100" 
            />
            <KPICard 
              title="Avg Performance" 
              value={`${childCgpa}`} 
              trend={childCgpa > 7 ? "+0.4" : "-0.2"} 
              trendUp={childCgpa > 7} 
              subtitle="Current CGPA" 
              icon={<TrendingUp size={20} />} 
              color="bg-emerald-50 text-emerald-600 border border-emerald-100" 
            />
            <KPICard 
              title="Academic Status" 
              value="Active" 
              trend="Good Standing" 
              trendUp={true} 
              subtitle={currentChild.student.academicInfo.course} 
              icon={<GradIcon size={20} />} 
              color="bg-amber-50 text-amber-600 border border-amber-100" 
            />
            <KPICard 
              title="Financial Status" 
              value={`₹${dueBalance}`} 
              trend={dueBalance <= 0 ? "All Clear" : "Pending"} 
              trendUp={dueBalance <= 0} 
              subtitle="Pending Dues" 
              icon={<CreditCard size={20} />} 
              color={dueBalance <= 0 ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"} 
            />
          </div>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Recent Attendance</h3>
                <Link href="/attendance" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  View Full Report <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="space-y-4">
                {attendance.length > 0 ? attendance.map((record: any, i: number) => {
                   return (
                     <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 border border-slate-200">
                           <Calendar size={14} />
                         </div>
                         <div>
                           <p className="text-sm font-bold text-slate-900">{record.subject?.name || "Unspecified Class"}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(record.date).toLocaleDateString()}</p>
                         </div>
                       </div>
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         record.status === 'Present' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                       }`}>
                         {record.status || "N/A"}
                       </span>
                     </div>
                   );
                }) : (
                  <p className="text-center py-8 text-slate-400 italic">No recent records found.</p>
                )}
              </div>
            </Card>

            <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Latest Results</h3>
                <Link href="/exams/results" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  Transcripts <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="space-y-6">
                {results.length > 0 ? results.map((result: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xs uppercase border border-indigo-100">
                      {result.status}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{result.examId?.name}</p>
                      <p className="text-xs text-slate-400 font-medium">Percentage: {result.percentage.toFixed(1)}% | CGPA: {result.cgpa.toFixed(2)}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12">
                    <Award size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-sm text-slate-400">No examination results published yet.</p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Today's Schedule</h2>
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calendar size={16} />
                </div>
              </div>
              <div className="space-y-6">
                {childSchedule.length > 0 ? childSchedule.map((slot: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-xs uppercase border border-indigo-100">
                      <Clock size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900">{slot.subjectId?.name || slot.subject || "Class"}</p>
                      <p className="text-xs text-slate-400 font-medium">{slot.startTime} • {slot.teacherId?.name || 'Teacher'} • Room {slot.room || slot.roomNo || 'TBD'}</p>
                    </div>
                  </div>
                )) : (
                  <div className="py-12 text-center opacity-40">
                    <Clock size={32} className="mx-auto mb-4 text-slate-300" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No classes today</p>
                  </div>
                )}
              </div>
              <Link 
                href="/student/timetable" 
                className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center"
              >
                View Full Timetable
              </Link>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-24 text-center bg-white border border-dashed border-slate-200 rounded-4xl">
           <Baby size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">No Children Linked</p>
           <p className="text-sm text-slate-400 mt-2">Please contact the college administration to link your child's profile.</p>
        </Card>
      )}
    </div>
  );
}


function TeacherDashboard() {
  const [stats, setStats] = React.useState<any>(null);
  const [timetable, setTimetable] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, timetableRes] = await Promise.all([
          fetchTeacherDashboardStats(),
          fetchTeacherTimetable()
        ]);
        if (statsRes.success) setStats(statsRes.data);
        if (timetableRes.success) setTimetable(timetableRes.data);
      } catch (err) {
        console.error("Failed to load teacher dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div className="h-[60vh] flex items-center justify-center"><Clock className="animate-spin text-indigo-400" size={48} /></div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1200">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Academic Orchestration</h1>
          <p className="text-sm font-semibold text-slate-500 mt-1 uppercase tracking-wider">LMS Management & Performance Monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 text-xs font-bold uppercase tracking-widest">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Direct Reach" 
          value={`${stats?.totalUniqueStudents || 0}`} 
          trend="Unique Students" 
          trendUp={true} 
          subtitle="Across all batches" 
          icon={<Users size={20} />} 
          color="bg-indigo-50 text-indigo-600 border border-indigo-100" 
        />
        <KPICard 
          title="Assigned Batches" 
          value={`${stats?.assignedBatches || 0}`} 
          trend="Active Clusters" 
          trendUp={true} 
          subtitle="Strategic Units" 
          icon={<School size={20} />} 
          color="bg-emerald-50 text-emerald-600 border border-emerald-100" 
        />
        <KPICard 
          title="Sessions Today" 
          value={`${stats?.todaySessionsMarked || 0}`} 
          trend="Marked Logs" 
          trendUp={stats?.todaySessionsMarked > 0} 
          subtitle="Attendance Sync" 
          icon={<ClipboardCheck size={20} />} 
          color="bg-amber-50 text-amber-600 border border-amber-100" 
        />
        <KPICard 
          title="Course Modules" 
          value={`${stats?.assignedSubjects || 0}`} 
          trend="Total Subjects" 
          trendUp={true} 
          subtitle="Curriculum Load" 
          icon={<Book size={20} />} 
          color="bg-purple-50 text-purple-600 border border-purple-100" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-8 border border-slate-100 bg-white shadow-ambient rounded-[2.5rem]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Academic Mapping</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Grouped by assigned batch</p>
            </div>
            <Link href="/attendance" className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">Mark Attendance</Link>
          </div>
          
          <div className="space-y-6">
            {stats?.assignments?.length > 0 ? (() => {
               // Grouping logic
               const groups: Record<string, any[]> = {};
               stats.assignments.forEach((a: any) => {
                 const bName = a.batch?.name || 'Unknown Batch';
                 if (!groups[bName]) groups[bName] = [];
                 groups[bName].push(a.subject?.name);
               });

               return Object.entries(groups).map(([batchName, subjects], idx) => (
                 <div key={idx} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 border-l-4 border-l-indigo-600 group hover:bg-white hover:shadow-xl transition-all duration-300">
                    <div className="flex items-center justify-between mb-4">
                       <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{batchName}</h4>
                       <span className="text-[10px] font-black bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full uppercase tracking-widest">{subjects.length} Subjects</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {subjects.map((sub, sIdx) => (
                         <span key={sIdx} className="text-[10px] font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200">
                           {sub}
                         </span>
                       ))}
                    </div>
                 </div>
               ));
            })() : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                 <Book size={48} className="text-slate-100 mb-4" />
                 <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No Active Assignments</p>
                 <p className="text-xs text-slate-500 mt-2">Contact administrator to link your faculty profile to subjects.</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-[2.5rem]">
          <h2 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-tight font-display">Timebound Schedule</h2>
          <div className="space-y-6">
            {timetable.length > 0 ? timetable.map((slot, i) => (
               <EventRow key={i} month="TOD" day={slot.startTime} title={slot.subjectId?.name || "Class"} sub={slot.batchId?.name || "Batch"} color="bg-indigo-50 text-indigo-600" />
            )) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                <Clock size={32} className="text-slate-200 mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Sessions Logged Today</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const { socket } = useSocket();
  const [profile, setProfile] = React.useState<any>(null);
  const [attendanceData, setAttendanceData] = React.useState<any>(null);
  const [resultsData, setResultsData] = React.useState<any>(null);
  const [schedule, setSchedule] = React.useState<any[]>([]);
  const [announcements, setAnnouncements] = React.useState<any[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [libraryTx, setLibraryTx] = React.useState<any[]>([]);
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [upcomingTests, setUpcomingTests] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [portalNotice, setPortalNotice] = React.useState<string | null>(null);

  const loadData = async () => {
    try {
      const profileRes = await fetchMyProfile().catch(() => ({ success: false, data: null }));
      const courseId = profileRes?.success
        ? profileRes.data?.batchId?.courseId?._id || profileRes.data?.batchId?.courseId || profileRes.data?.academicInfo?.courseId || null
        : null;

      const [attendanceRes, resultsRes, scheduleRes, annRes, unreadRes, libraryRes, assignmentsRes, testsRes] = await Promise.all([
        fetchMyAttendance().catch(() => ({ success: false, data: null })),
        fetchMyResults().catch(() => ({ success: false, data: null })),
        fetchMyTodaySchedule().catch(() => ({ success: false, data: [] })),
        fetchMyAnnouncements().catch(() => ({ success: false, data: [] })),
        fetchUnreadCount().catch(() => ({ success: false, data: { count: 0 } })),
        fetchMyLibraryTransactions({ limit: 3 }).catch(() => ({ success: false, data: [] })),
        fetchMyAssignments().catch(() => ({ success: false, data: [] })),
        getExams(courseId ? { courseId } : {}).catch(() => ({ success: false, data: [] }))
      ]);
      if (profileRes.success) {
        setProfile(profileRes.data);
        localStorage.setItem("student_profile", JSON.stringify({
          _id: profileRes.data._id,
          batchId: profileRes.data.academicInfo?.batchId || profileRes.data.batchId,
          courseId: profileRes.data.batchId?.courseId?._id || profileRes.data.batchId?.courseId || profileRes.data.academicInfo?.courseId || null
        }));
      }
      if (attendanceRes.success) setAttendanceData(attendanceRes.data);
      if (resultsRes.success) setResultsData(resultsRes.data);
      if (scheduleRes.success) setSchedule(scheduleRes.data);
      if (annRes.success) setAnnouncements(annRes.data);
      if (unreadRes.success) setUnreadCount(unreadRes.data.count);
      if (libraryRes?.success) setLibraryTx(libraryRes.data);
      if (assignmentsRes?.success) setAssignments(assignmentsRes.data);
      if (testsRes?.success) {
        const examRows = Array.isArray(testsRes.data) ? testsRes.data : [];
        setUpcomingTests(
          examRows.filter((exam: any) => {
            const status = String(exam?.status || exam?.derivedStatus || "").toUpperCase();
            return status === "SCHEDULED" || status === "PUBLISHED";
          })
        );
      }

    } catch (err) {
      console.error("Failed to load student dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
    setPortalNotice(localStorage.getItem('portal_notice'));
    if (localStorage.getItem('portal_notice')) {
      localStorage.removeItem('portal_notice');
    }

    if (socket) {
      socket.on("attendanceUpdated", loadData);
      socket.on("resultsPublished", loadData);
      socket.on("newMessage", loadData);
      socket.on("libraryUpdate", loadData);
      socket.on("notification", loadData);
      return () => {
        socket.off("attendanceUpdated", loadData);
        socket.off("resultsPublished", loadData);
        socket.off("newMessage", loadData);
        socket.off("libraryUpdate", loadData);
        socket.off("notification", loadData);
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
  const rollNumber = profile?.academicInfo?.rollNumber || profile?.studentId || profile?.uniqueStudentId || 'Not Assigned';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {portalNotice && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm font-semibold">
          {portalNotice}
        </div>
      )}

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
              <p className="text-sm font-bold text-slate-900">{rollNumber}</p>
            </div>
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg border border-slate-800">
              {profile?.personalInfo?.firstName?.[0]}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard 
          title="Attendance" 
          value={`${attendancePct}%`} 
          trend={attendancePct >= 75 ? "Safe" : "Low"} 
          trendUp={attendancePct >= 75} 
          subtitle="Overall Presence" 
          icon={<Clock size={20} />} 
          color="bg-indigo-50 text-indigo-600 border border-indigo-100" 
        />
        <KPICard 
          title="Current CGPA" 
          value={`${cgpa}`} 
          trend={cgpa >= 7 ? "Excellent" : "Average"} 
          trendUp={cgpa >= 7} 
          subtitle="Academic Standing" 
          icon={<Sparkles size={20} />} 
          color="bg-amber-50 text-amber-600 border border-amber-100" 
        />
        <KPICard 
          title="Performance" 
          value={`${lastPercent}%`} 
          trend="Latest Exam" 
          trendUp={lastPercent >= 40} 
          subtitle="Recent Result" 
          icon={<GradIcon size={20} />} 
          color="bg-purple-50 text-purple-600 border border-purple-100" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Announcements Banner */}
          {unreadCount > 0 && (
            <Card className="p-6 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-600/20 border-none overflow-hidden relative group">
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight">Active Announcements</h3>
                    <p className="text-xs text-indigo-100 font-medium">You have {unreadCount} unread announcement{unreadCount === 1 ? '' : 's'} from your batch or section.</p>
                  </div>
                </div>
                <Link 
                  href="/communication" 
                  className="px-6 py-3 bg-white text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg active:scale-95"
                >
                  Enter Hub
                </Link>
              </div>
            </Card>
          )}

          {/* Active Assignments Widget */}
          {assignments.length > 0 && (
            <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl animate-in zoom-in-95 duration-700 delay-100">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display">Active Assignments</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pending Coursework</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shadow-sm border border-indigo-100">
                  <Book size={20} className="text-indigo-600" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignments.map((assignment: any) => {
                  const dueDate = new Date(assignment.dueDate || new Date());
                  const diffDays = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  let status = "Active";
                  let statusClass = "bg-indigo-50 text-indigo-600 border-indigo-100";
                  let Icon = Book;

                  if (diffDays < 0) {
                    status = "Late";
                    statusClass = "bg-rose-50 text-rose-600 border-rose-100 shadow-sm shadow-rose-500/10";
                    Icon = AlertCircle;
                  } else if (diffDays <= 2) {
                    status = `Due in ${diffDays}d`;
                    statusClass = "bg-amber-50 text-amber-600 border-amber-100";
                    Icon = Clock;
                  }

                  return (
                    <div key={assignment._id} className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col group hover:bg-white hover:shadow-ambient hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${statusClass.split(' ')[0]}`} />
                      <div className="flex justify-between items-start mb-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider border ${statusClass}`}>
                          <Icon size={10} /> {status}
                        </span>
                        {assignment.teacherId && (
                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shadow-sm" title={assignment.teacherId.name}>
                            {assignment.teacherId.name?.[0] || 'T'}
                          </div>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight mb-1">{assignment.title}</h3>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 truncate">
                        {assignment.subjectId?.name || "General"}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-200/60">
                         <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                           <Calendar size={12} />
                           {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                         </div>
                         {assignment.fileUrl ? (
                         <a href={assignment.fileUrl.startsWith('http') ? assignment.fileUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api'}`.replace('/api', '') + '/' + assignment.fileUrl.replace(/\\/g, '/')} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 bg-indigo-50/50 px-2.5 py-1.5 rounded-lg active:scale-95">
                           View <ArrowUpRight size={12} />
                         </a>
                         ) : (
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">No file</span>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl animate-in zoom-in-95 duration-700 delay-150">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">Upcoming Tests</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Scheduled assessments for your course</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shadow-sm border border-emerald-100">
                <ClipboardCheck size={20} className="text-emerald-600" />
              </div>
            </div>

            {upcomingTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingTests.slice(0, 4).map((exam: any) => {
                  const examDate = exam.scheduleDate ? new Date(exam.scheduleDate) : null;
                  const examStatus = String(exam.status || exam.derivedStatus || "SCHEDULED").toUpperCase();
                  return (
                    <Link
                      key={exam._id}
                      href={`/exams/${exam._id}`}
                      className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col group hover:bg-white hover:shadow-ambient hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Test</p>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-indigo-600">{exam.name}</h3>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border bg-emerald-50 text-emerald-600 border-emerald-100">
                          {examStatus}
                        </span>
                      </div>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-4 truncate">
                        {exam.examType || 'INTERNAL'} • {exam.code || 'TEST'}
                      </p>
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-200/60">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">
                          <Calendar size={12} />
                          {examDate ? examDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : 'TBD'}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 group-hover:text-indigo-800">View Test</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
                No upcoming tests are scheduled yet.
              </div>
            )}
          </Card>

          {assignments.length === 0 && (
            <Card className="p-8 border border-dashed border-slate-200 bg-white shadow-sm rounded-3xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 font-display uppercase tracking-tight">Assignments</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No assignments yet</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shadow-sm border border-slate-100">
                  <Book size={20} className="text-slate-400" />
                </div>
              </div>
              <p className="text-sm text-slate-500">Your teacher has not posted any assignments for your batch yet.</p>
            </Card>
          )}

          <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-slate-900">Registered Subjects</h2>
              <Link href="/attendance" className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View All <ArrowUpRight size={14} />
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subjectWise.length > 0 ? subjectWise.map((sub: any, i: number) => {
                const isToday = sub.lastMarkedAt && 
                  new Date(sub.lastMarkedAt).toDateString() === new Date().toDateString();
                return (
                  <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-ambient transition-all duration-300">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                          <Book size={18} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-tight">{sub.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {isToday ? (
                              <span className="text-emerald-600 font-black">✓ Updated Today</span>
                            ) : (
                              `Last: ${sub.lastMarkedAt ? new Date(sub.lastMarkedAt).toLocaleDateString() : 'N/A'}`
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-xs font-black px-2 py-1 rounded-lg border",
                        sub.percentage >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100"
                      )}>
                        {sub.percentage}%
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={cn("h-full rounded-full transition-all duration-1000", sub.percentage >= 75 ? "bg-emerald-500" : "bg-rose-500")}
                          style={{ width: `${sub.percentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>{sub.present} Presence</span>
                        <span>{sub.total} Classes</span>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-slate-500 font-medium">
                  No subject-wise attendance has been published yet.
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900 font-display">Today's Schedule</h2>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
            </div>
            <div className="space-y-6">
              {schedule.length > 0 ? schedule.map((slot, i) => (
                <EventRow 
                  key={i} 
                  month="TOD" 
                  day={slot.startTime} 
                  title={slot.subjectId?.name || slot.subject || "Class"} 
                  sub={`${slot.teacherId?.name || 'Teacher'} • Room ${slot.room || slot.roomNo || 'TBD'}`} 
                  color={slot.isUpcoming ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"} 
                />
              )) : (
                <div className="py-12 text-center opacity-40">
                  <Clock size={32} className="mx-auto mb-4 text-slate-300" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No classes today</p>
                </div>
              )}
            </div>
            <Link 
              href="/timetable" 
              className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center"
            >
              View Full Timetable
            </Link>
          </Card>

          {/* Library Reminders Widget */}
          {libraryTx && libraryTx.length > 0 && (
            <Card className="p-8 border border-slate-100 bg-white shadow-ambient rounded-3xl overflow-hidden animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center shrink-0 border border-teal-100">
                  <Book size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 font-display">Library Details</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Active Issues</p>
                </div>
              </div>
              <div className="space-y-4">
                {libraryTx.map((tx) => {
                  const bookTitle = tx.bookId?.title || "Unknown Book";
                  const isOverdue = tx.status === "overdue";
                  const isReserved = tx.status === "reserved";
                  
                  const dueDateObj = tx.dueDate ? new Date(tx.dueDate) : null;
                  const todayObj = new Date();
                  const diffMs = dueDateObj ? dueDateObj.getTime() - todayObj.getTime() : 0;
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  
                  let statusText = "Issued";
                  let statusColor = "bg-indigo-50 text-indigo-600 border-indigo-100";
                  let icon = <Clock size={12} />;

                  if (isReserved) {
                    statusText = "Reserved";
                    statusColor = "bg-amber-50 text-amber-600 border-amber-100";
                    icon = <Clock size={12} />;
                  } else if (isOverdue) {
                    statusText = "Overdue";
                    statusColor = "bg-rose-50 text-rose-600 border-rose-100 animate-pulse shadow-sm shadow-rose-600/20";
                    icon = <AlertCircle size={12} />;
                  } else if (dueDateObj && diffDays <= 3) {
                    statusText = `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
                    statusColor = "bg-amber-50 text-amber-600 border-amber-100";
                    icon = <AlertCircle size={12} />;
                  }

                  return (
                    <div key={tx._id} className="p-5 border border-slate-100 rounded-2xl bg-slate-50 flex flex-col hover:bg-white hover:shadow-ambient hover:border-teal-100 transition-all">
                      <div className="mb-3">
                        <p className="text-sm font-bold text-slate-900 leading-tight mb-2">{bookTitle}</p>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                          <Calendar size={12} />
                          Due: {dueDateObj ? dueDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-slate-200 border-dashed">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${statusColor}`}>
                          {icon} {statusText}
                        </span>
                        {isOverdue && tx.fine > 0 && (
                          <span className="text-xs font-black text-rose-600 px-2 py-0.5">
                            Fine: ₹{tx.fine}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}

function SubjectMiniCard({ name, code, icon, color }: any) {
  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-ambient transition-all cursor-pointer">
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
         <span className={color}>{icon}</span>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{name}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{code}</p>
      </div>
    </div>
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

function SuperAdminDashboard() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400 text-center">
       <ShieldCheck size={48} className="mb-4 text-indigo-200" />
       <h2 className="text-xl font-bold text-slate-800">Platform Governance</h2>
       <p className="text-sm mt-2">Global institutional monitoring active. Multi-tenant controls enabled.</p>
    </div>
  );
}

function RiskRow({ name, id, risk, score, factors }: any) {
  const isCritical = risk === "CRITICAL";
  return (
    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100/50 transition-all group">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase transition-all ${isCritical ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
        {name.split(' ').map((n: string) => n[0]).join('')}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{name}</h4>
        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{id}</p>
      </div>
      <div className="hidden md:flex flex-wrap gap-2 flex-1">
        {factors.map((f: string) => (
          <span key={f} className="text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-200 whitespace-nowrap">{f}</span>
        ))}
      </div>
      <div className="text-right">
        <div className={`text-[10px] font-bold uppercase ${isCritical ? 'text-rose-500' : 'text-amber-500'}`}>{risk}</div>
        <div className="text-lg font-bold text-slate-900">{score}%</div>
      </div>
    </div>
  );
}
