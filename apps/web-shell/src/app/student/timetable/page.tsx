"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Calendar, ChevronRight, Clock, Download, Loader2, MapPin, User } from "lucide-react";
import TimetableGrid, { TimetableCellEntry } from "@/components/timetable/TimetableGrid";
import { fetchMyProfile, fetchMyTimetable } from "@/lib/api/student";
import { cn } from "@/lib/utils";
import { DAYS, TIME_SLOTS } from "@/constants/timeSlots";

const normalizeTimetableEntries = (data: any): TimetableCellEntry[] => {
  if (!data) return [];

  if (Array.isArray(data)) {
    return data.map((entry: any) => ({
      ...entry,
      day: entry.day || entry.dayOfWeek,
    }));
  }

  return Object.entries(data).flatMap(([day, groupedSlots]: any) => {
    const values = groupedSlots && typeof groupedSlots === "object" ? Object.values(groupedSlots) : [];
    return values.flat().map((entry: any) => ({
      ...entry,
      day: entry.day || day || entry.dayOfWeek,
    }));
  });
};

const resolveRoom = (entry: TimetableCellEntry & { roomNo?: string }) => entry.room || entry.roomNo || "TBD";

export default function StudentMyTimetablePage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [entries, setEntries] = useState<TimetableCellEntry[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  const bootstrap = async () => {
    try {
      setLoading(true);
      const [profileRes, timetableRes] = await Promise.all([
        fetchMyProfile().catch(() => ({ success: false, data: null })),
        fetchMyTimetable().catch(() => ({ success: false, data: [] })),
      ]);

      if (profileRes?.success) {
        setProfile(profileRes.data);
      }

      if (timetableRes?.success) {
        setEntries(normalizeTimetableEntries(timetableRes.data));
        setError(null);
      } else {
        setEntries([]);
        setError("Your timetable has not been set up yet. Please contact your admin.");
      }
    } catch {
      setEntries([]);
      setError("Your timetable has not been set up yet. Please contact your admin.");
    } finally {
      setLoading(false);
    }
  };

  const studentName = profile?.personalInfo?.name || `${profile?.personalInfo?.firstName || ""} ${profile?.personalInfo?.lastName || ""}`.trim() || "Student";
  const batchLabel = profile?.academicInfo?.batch || profile?.batchId?.name || "Not Assigned";
  const sectionLabel = profile?.academicInfo?.section || profile?.sectionId?.name || "Not Assigned";

  const title = useMemo(() => {
    return `Weekly Timetable${sectionLabel !== 'Not Assigned' ? ` • Section ${sectionLabel}` : ''}`;
  }, [sectionLabel]);

  const handleDownloadPdf = async () => {
    if (!entries.length || downloading) return;

    setDownloading(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const lookup = entries.reduce((acc: Record<string, Record<string, TimetableCellEntry>>, entry) => {
        if (!acc[entry.day]) acc[entry.day] = {};
        acc[entry.day][entry.startTime] = entry;
        return acc;
      }, {});

      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text("Student Weekly Timetable", 14, 18);
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text(`Student: ${studentName}`, 14, 26);
      doc.text(`Batch: ${batchLabel} | Section: ${sectionLabel}`, 14, 32);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

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
          const roomName = resolveRoom(entry as any);
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

  const emptyState = !loading && entries.length === 0;

  if (loading) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
            <ChevronRight size={10} />
            <span className="text-slate-900">My Timetable</span>
          </nav>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
          <p className="text-sm text-slate-500 mt-1">Read-only weekly schedule for your assigned batch and section.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch</p>
            <p className="text-sm font-bold text-slate-900">{batchLabel}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Section</p>
            <p className="text-sm font-bold text-slate-900">{sectionLabel}</p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading || entries.length === 0}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all",
              entries.length === 0
                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            {downloading ? "Generating PDF" : "Download Weekly PDF"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm font-semibold">
          {error}
        </div>
      ) : null}

      {emptyState ? (
        <div className="rounded-4xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <Calendar size={40} className="mx-auto text-slate-200 mb-4" />
          <h2 className="text-lg font-black text-slate-900">Your timetable has not been set up yet. Please contact your admin.</h2>
          <p className="mt-2 text-sm text-slate-500">Once classes are assigned, your weekly schedule will appear here automatically.</p>
        </div>
      ) : (
        <>
          <TimetableGrid
            entries={entries}
            readOnly
            renderBody={(entry) => (
              <div className="space-y-1.5">
                <p className="text-[11px] font-black text-slate-900 leading-tight">{entry.subjectId?.name || entry.subject || 'Subject'}</p>
                <p className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                  <User size={10} /> {entry.teacherId?.name || 'Teacher not assigned'}
                </p>
                <p className="text-[10px] font-semibold text-slate-600 flex items-center gap-1">
                  <MapPin size={10} /> Room {resolveRoom(entry as any)}
                </p>
              </div>
            )}
            renderMeta={(entry) => (
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <Clock size={10} /> {entry.startTime} - {entry.endTime}
              </span>
            )}
          />

          <div className="rounded-4xl border border-slate-100 bg-slate-900 px-6 py-6 text-white shadow-2xl shadow-slate-900/10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-lg font-black">Please be present 5 minutes before class.</h3>
              <p className="text-sm text-slate-300 mt-1">Attendance is marked by your teacher.</p>
            </div>
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={downloading || entries.length === 0}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                entries.length === 0
                  ? "bg-white/20 text-slate-300 cursor-not-allowed"
                  : "bg-white text-slate-900 hover:bg-indigo-50"
              )}
            >
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download Weekly PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
}