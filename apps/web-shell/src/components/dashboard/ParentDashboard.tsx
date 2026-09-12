"use client";

import React from "react";
import Link from "next/link";
import { 
  Clock, 
  TrendingUp, 
  GraduationCap as GradIcon,
  CreditCard,
  Calendar,
  ArrowUpRight,
  Award,
  Baby
} from "lucide-react";
import Card from "@/components/ui/Card";
import { useSocket } from "@/components/providers/SocketProvider";
import { fetchMyStudentProfile, fetchMyStudentAttendance, fetchMyStudentResults, fetchMyStudentTimetable, fetchMyStudentFees } from "@/lib/api/parent";
import { cn } from "@/lib/utils";

export default function ParentDashboard() {
  const { socket } = useSocket();
  const [parentData, setParentData] = React.useState<any>(null);
  const [children, setChildren] = React.useState<any[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = React.useState(0);
  const [childSchedule, setChildSchedule] = React.useState<any[]>([]);
  const [fees, setFees] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  const loadData = async () => {
    try {
      const results = await Promise.allSettled([
        fetchMyStudentProfile(),
        fetchMyStudentAttendance(),
        fetchMyStudentResults(),
        fetchMyStudentTimetable(),
        fetchMyStudentFees()
      ]);

      const [profileRes, attendanceRes, resultsRes, timetableRes, feesRes] = results.map(r => 
        r.status === 'fulfilled' ? r.value : { success: false, data: [] }
      );

      if (profileRes.success) setParentData(profileRes.data);
      if (profileRes.success) {
        const student = profileRes.data;
        localStorage.setItem("children_profiles", JSON.stringify([{
          _id: student._id,
          batchId: student.academicInfo?.batchId || student.batchId 
        }]));
        
        setChildren([{ 
          student: student, 
          attendance: attendanceRes.data.records, 
          results: resultsRes.data.results || [],
          stats: { 
            attendancePct: attendanceRes.data.percentage,
            cgpa: resultsRes.data.overallCgpa 
          }
        }]);
      }
      if (timetableRes.success) {
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

  React.useEffect(() => {
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
  const attPct = currentChild?.stats?.attendancePct || 0;
  const childCgpa = currentChild?.stats?.cgpa || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Parent Portal — {parentData?.personalInfo?.firstName} {parentData?.personalInfo?.lastName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Monitoring academic journey</p>
        </div>
      </div>

      {currentChild ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard title="Attendance" value={`${attPct}%`} trend={attPct > 75 ? "Consistent" : "Low"} trendUp={attPct > 75} subtitle="Current Semester" icon={<Clock size={20} />} color="bg-indigo-50 text-indigo-600" />
            <KPICard title="Avg Performance" value={`${childCgpa}`} trend={childCgpa > 7 ? "+0.4" : "-0.2"} trendUp={childCgpa > 7} subtitle="Current CGPA" icon={<TrendingUp size={20} />} color="bg-emerald-50 text-emerald-600" />
            <KPICard title="Financial Status" value={`₹${fees?.summary?.balance || 0}`} trend={fees?.summary?.balance <= 0 ? "All Clear" : "Pending"} trendUp={fees?.summary?.balance <= 0} subtitle="Pending Dues" icon={<CreditCard size={20} />} color="bg-amber-50 text-amber-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="p-8 border border-slate-100 bg-white rounded-3xl shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold text-slate-900">Recent Attendance</h3>
                <Link href="/attendance" className="text-xs font-bold text-indigo-600 flex items-center gap-1">View Full Report <ArrowUpRight size={14} /></Link>
              </div>
              <div className="space-y-4">
                {attendance.length > 0 ? attendance.slice(0, 4).map((record: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Calendar size={14} className="text-slate-400" />
                      <div>
                        <p className="text-sm font-bold text-slate-900">{record.subject?.name || "Class"}</p>
                        <p className="text-[10px] text-slate-400 uppercase">{new Date(record.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${record.status === 'Present' ? 'text-emerald-600' : 'text-rose-600'}`}>{record.status}</span>
                  </div>
                )) : <p className="text-center py-8 text-slate-400">No recent records.</p>}
              </div>
            </Card>

            <Card className="p-8 border border-slate-100 bg-white rounded-3xl shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-8">Academic Progress</h3>
              <div className="space-y-6">
                {results.length > 0 ? results.slice(0, 3).map((res: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xs">RES</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 truncate">{res.type === 'ASSIGNMENT' ? res.assignmentId?.title : res.examId?.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase">{res.status} | {res.percentage}%</p>
                    </div>
                  </div>
                )) : <div className="text-center py-12"><Award size={32} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400">No results published.</p></div>}
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-24 text-center bg-white border border-dashed rounded-[2rem]">
           <Baby size={48} className="mx-auto text-slate-200 mb-4" />
           <p className="text-lg font-bold text-slate-400">No Children Linked</p>
        </Card>
      )}
    </div>
  );
}

function KPICard({ title, value, trend, trendUp, subtitle, icon, color }: any) {
  return (
    <Card className="p-6 border border-slate-100 bg-white shadow-sm rounded-3xl">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center`}>{icon}</div>
        <div className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{trend}</div>
      </div>
      <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">{title}</h3>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-slate-900">{value}</span>
      </div>
    </Card>
  );
}
