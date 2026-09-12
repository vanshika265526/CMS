"use client";
import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  Calendar, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Filter,
  Download,
  MapPin,
  User,
  BookOpen
} from 'lucide-react';
import { fetchMyTimetable as fetchStudentTimetable, fetchMyProfile as fetchStudentProfile } from '@/lib/api/student';
import { fetchMyStudentTimetable as fetchParentTimetable, fetchMyStudentProfile as fetchParentProfile } from '@/lib/api/parent';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  { start: '09:00', label: '09:00 - 10:00' },
  { start: '10:00', label: '10:00 - 11:00' },
  { start: '11:00', label: '11:00 - 12:00' },
  { start: '12:00', label: '12:00 - 01:00' },
  { start: '13:00', label: '01:00 - 02:00' },
  { start: '14:00', label: '02:00 - 03:00' },
  { start: '15:00', label: '03:00 - 04:00' },
  { start: '16:00', label: '04:00 - 05:00' },
];

export default function TimetablePortal() {
  const [timetable, setTimetable] = useState<Record<string, Record<string, any[]>>>({});
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [activeDay, setActiveDay] = useState(days[new Date().getDay() - 1] || 'Monday');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    setRole(userData.role);

    async function loadData() {
      try {
        let res;
        let profileRes;
        if (userData.role === 'STUDENT') {
          res = await fetchStudentTimetable();
          profileRes = await fetchStudentProfile();
        } else if (userData.role === 'PARENT') {
          res = await fetchParentTimetable();
          profileRes = await fetchParentProfile();
        }
        
        if (res?.success) {
          setTimetable(res.data);
        }
        if (profileRes?.success) {
          setProfile(profileRes.data);
        }
      } catch (err) {
        console.error("Failed to load timetable", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Syncing Schedule...</p>
        </div>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    if (!Object.keys(timetable).length || downloading) return;

    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      
      const studentName = profile?.personalInfo?.name || `${profile?.personalInfo?.firstName || ""} ${profile?.personalInfo?.lastName || ""}`.trim() || "Student";
      const batchLabel = profile?.academicInfo?.batch || profile?.batchId?.name || "Not Assigned";
      const sectionLabel = profile?.academicInfo?.section || profile?.sectionId?.name || "Not Assigned";

      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text("Student Weekly Timetable", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Student: ${studentName}`, 14, 26);
      doc.text(`Batch: ${batchLabel} | Section: ${sectionLabel}`, 14, 32);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

      const lookup = Object.entries(timetable).reduce((acc: Record<string, Record<string, any>>, [day, grouped]) => {
        acc[day] = {};
        Object.values(grouped).flat().forEach((entry: any) => {
          acc[day][entry.startTime] = entry;
        });
        return acc;
      }, {});

      const rows = TIME_SLOTS.map((slot) => {
        const row: string[] = [slot.label];
        DAYS.forEach((day) => {
          const entry = lookup[day]?.[slot.start];
          if (!entry) {
            row.push("-");
            return;
          }
          const subjectName = entry.subjectId?.name || entry.subject || "Subject";
          const teacherName = entry.teacherId?.name || "Teacher";
          const roomName = entry.room || entry.roomNo || "TBD";
          row.push(`${subjectName}\n${teacherName}\nRoom ${roomName}`);
        });
        return row;
      });

      autoTable(doc, {
        head: [["Time", ...DAYS]],
        body: rows,
        startY: 44,
        theme: "grid",
        styles: { fontSize: 7, cellPadding: 2, valign: "middle", textColor: [51, 65, 85] },
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 28 },
        },
      });

      const fileName = `${studentName.replace(/\s+/g, "_")}_Weekly_Timetable.pdf`;
      doc.save(fileName);
    } finally {
      setDownloading(false);
    }
  };

  // Flatten the grouped slots for the current selected day
  const currentDayGrouped = timetable[activeDay] || {};
  const currentDaySlots = Object.values(currentDayGrouped)
    .flat()
    .sort((a, b) => (a as any).period - (b as any).period);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Strategic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Portal</Link>
            <ChevronRight size={10} className="text-slate-300" />
            <span className="text-slate-900">Academic Schedule</span>
          </nav>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">
            Weekly <span className="text-indigo-600">Timetable</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-4 max-w-md leading-relaxed">
            Real-time synchronization with institutional batch allocations and faculty availability.
          </p>
        </div>

        <div className="flex bg-white p-2 rounded-[1.5rem] shadow-sm border border-slate-200">
          {days.map((day) => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                activeDay === day 
                  ? "bg-slate-900 text-white shadow-lg" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              )}
            >
              {day.substring(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="grid grid-cols-1 gap-4">
        {currentDaySlots.length > 0 ? currentDaySlots.map((slot, idx) => (
          <div 
            key={idx} 
            className="group relative bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:scale-[1.01] transition-all duration-500 overflow-hidden"
          >
            {/* Aesthetic Accent */}
            <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600 opacity-20 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center justify-center w-24 h-24 bg-slate-50 rounded-3xl border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-500">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Period</span>
                  <span className="text-3xl font-black">{slot.period}</span>
                </div>
                
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100">
                      {slot.startTime} — {slot.endTime}
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <MapPin size={12} className="text-indigo-400" /> {slot.room || 'Gallery 4'}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                    {slot.subjectId?.name || 'Class Session'}
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                    <User size={12} className="text-slate-300" /> {slot.teacherId?.name || 'Faculty Assigned'}
                  </p>
                </div>
              </div>

              <div className="hidden lg:flex flex-col items-end gap-2 pr-4">
                 <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white" />
                    ))}
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 border-2 border-white">
                      +42
                    </div>
                 </div>
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Batch Attendance</p>
              </div>
            </div>
          </div>
        )) : (
          <div className="py-32 bg-white rounded-[3rem] border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Clock size={40} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">No Sessions Logged</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-xs px-6">
              Enjoy your academic break. No educational operations scheduled for {activeDay}.
            </p>
          </div>
        )}
      </div>

      {/* Strategic Footer Card */}
      <Card className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
         <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
         <div className="relative z-10">
           <h3 className="text-xl font-black uppercase tracking-tight mb-2">Governance Protocol</h3>
           <p className="text-xs text-slate-400 max-w-md leading-relaxed">
             Students are advised to be present 5 minutes before the session starts. Attendance logs are synchronized in real-time with the faculty portal.
           </p>
         </div>
         <button 
           onClick={handleDownloadPdf}
           disabled={downloading || !Object.keys(timetable).length}
           className="relative z-10 px-8 py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
         >
           <Download size={14} />
           {downloading ? 'Generating...' : 'Download Weekly PDF'}
         </button>
      </Card>
    </div>
  );
}
