"use client";

import React, { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { CheckCircle2, Clock3, Lock, Loader2, CalendarDays, Eye } from "lucide-react";

type SessionState = "passed" | "upcoming" | "live";

const statusChoices = ["Present", "Absent", "Leave"];

export default function AttendancePage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [activeTab, setActiveTab] = useState<"today" | "history">("today");
  const [serverDate, setServerDate] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  const [selectedSession, setSelectedSession] = useState<any | null>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [records, setRecords] = useState<Record<string, "Present" | "Absent" | "Leave">>({});
  const [viewSession, setViewSession] = useState<any | null>(null);

  const loadToday = async () => {
    const scheduleRes = await api.get("/teacher/timetable/today");
    const schedule = Array.isArray(scheduleRes.data?.data) ? scheduleRes.data.data : [];
    setServerDate(String(scheduleRes.data?.meta?.serverDate || new Date().toISOString().split("T")[0]));

    const enriched = await Promise.all(
      schedule.map(async (session: any) => {
        const section = session.section || session.sectionId?.name || "General";
        let marked = false;
        
        // Only fetch attendance if subjectId exists
        try {
          const subjectId = session.subjectId?._id || session.subjectId;
          if (subjectId && subjectId !== 'undefined') {
            const attendanceRes = await api.get(
              `/teacher/attendance?batchId=${session.batchId?._id || session.batchId}&subjectId=${subjectId}&date=${scheduleRes.data?.meta?.serverDate}&lecture=${session.period}&section=${section}`
            );
            marked = Array.isArray(attendanceRes.data?.data) && attendanceRes.data.data.length > 0;
          }
        } catch (err) {
          console.warn(`Failed to load attendance for session:`, err);
        }
        
        return {
          ...session,
          attendanceMarked: marked,
          sessionState: (session.sessionState || "upcoming") as SessionState,
        };
      })
    );

    setSessions(enriched);
  };

  const loadHistory = async () => {
    const res = await api.get("/teacher/attendance/history");
    setHistory(Array.isArray(res.data?.data) ? res.data.data : []);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        await Promise.all([loadToday(), loadHistory()]);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Unable to load attendance data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openAttendancePanel = async (session: any) => {
    if (session.sessionState !== "live") return;
    setSelectedSession(session);
    setSuccess("");
    setError("");

    const batchId = session.batchId?._id || session.batchId;
    const subjectId = session.subjectId?._id || session.subjectId;
    const section = session.section || session.sectionId?.name || "General";

    try {
      const studentsRes = await api.get(`/teacher/students?batchId=${batchId}&section=${section}`);
      const list = Array.isArray(studentsRes.data?.data) ? studentsRes.data.data : [];
      const mapped = list.map((s: any) => ({
        _id: s._id,
        name: s.personalInfo?.name || `${s.personalInfo?.firstName || ""} ${s.personalInfo?.lastName || ""}`.trim(),
        rollNumber: s.academicInfo?.rollNumber || s.enrollmentId || s.studentId || s.uniqueStudentId,
      }));
      setRoster(mapped);

      const defaultRecords: Record<string, "Present" | "Absent" | "Leave"> = {};
      mapped.forEach((student: any) => {
        defaultRecords[student._id] = "Present";
      });
      setRecords(defaultRecords);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to load class roster");
    }
  };

  const submitAttendance = async () => {
    if (!selectedSession) return;
    
    const subjectId = selectedSession.subjectId?._id || selectedSession.subjectId;
    if (!subjectId || subjectId === 'undefined') {
      setError("Subject information is missing. Cannot mark attendance");
      return;
    }
    
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const payload = Object.entries(records).map(([studentId, status]) => ({ studentId, status }));
      await api.post("/teacher/attendance/mark", {
        batchId: selectedSession.batchId?._id || selectedSession.batchId,
        subjectId: subjectId,
        lecture: selectedSession.period,
        date: serverDate,
        section: selectedSession.section || selectedSession.sectionId?.name || "General",
        records: payload,
      });

      setSuccess("Attendance saved successfully");
      setSelectedSession(null);
      await Promise.all([loadToday(), loadHistory()]);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Unable to save attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const groupedSessions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    sessions.forEach((session) => {
      const key = `${session.startTime} - ${session.endTime}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(session);
    });
    return groups;
  }, [sessions]);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Attendance System</h1>
        <p className="text-xs text-slate-500 mt-1">Track today's classes and attendance sessions</p>
      </div>

      {error ? <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">{error}</div> : null}
      {success ? <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm">{success}</div> : null}

      <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab("today")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${activeTab === "today" ? "bg-slate-900 text-white" : "text-slate-500"}`}>Attendance Overview</button>
        <button onClick={() => setActiveTab("history")} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest ${activeTab === "history" ? "bg-slate-900 text-white" : "text-slate-500"}`}>Session History</button>
      </div>

      {activeTab === "today" ? (
        <div className="space-y-6">
          {Object.keys(groupedSessions).length === 0 ? (
            <div className="p-6 rounded-2xl border border-slate-200 bg-white text-slate-600">You have no classes scheduled for today</div>
          ) : (
            Object.entries(groupedSessions).map(([slot, slotSessions]) => (
              <div key={slot} className="space-y-3">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{slot}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {slotSessions.map((session: any) => {
                    const disabled = session.sessionState !== "live";
                    const marked = Boolean(session.attendanceMarked);
                    return (
                      <div key={session._id} className="relative p-4 bg-white border border-slate-200 rounded-2xl">
                        <p className="text-sm font-black text-slate-900">{session.subjectId?.name || session.subject || "Subject"}</p>
                        <p className="text-xs text-slate-500 mt-1">{session.batchId?.name || "Batch"} • Section {session.section || session.sectionId?.name || "General"} • Room {session.room || "N/A"}</p>

                        <div className="mt-3 flex items-center justify-between">
                          {marked ? (
                            <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14} /> Attendance Marked</span>
                          ) : null}
                          <button
                            disabled={disabled && !marked}
                            onClick={() => (marked ? setViewSession(session) : openAttendancePanel(session))}
                            className="px-3 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50"
                          >
                            {marked ? "View Attendance" : "Mark Attendance"}
                          </button>
                        </div>

                        {session.sessionState === "passed" && !marked ? (
                          <div className="absolute inset-0 bg-slate-100/80 rounded-2xl flex items-center justify-center text-slate-700 text-xs font-black uppercase tracking-widest gap-2"><Lock size={14} /> Session Passed</div>
                        ) : null}
                        {session.sessionState === "upcoming" && !marked ? (
                          <div className="absolute inset-0 bg-slate-100/70 rounded-2xl flex items-center justify-center text-slate-700 text-xs font-black uppercase tracking-widest gap-2"><Clock3 size={14} /> Upcoming</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="p-6 rounded-2xl border border-slate-200 bg-white text-slate-600">No attendance sessions found</div>
          ) : history.map((session: any) => (
            <div key={session._id} className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-900">{new Date(session.date).toLocaleDateString()} • {session.subject?.name || "Subject"}</p>
                <p className="text-xs text-slate-500 mt-1">{session.batch?.name || "Batch"} • Section {session.section || "General"}</p>
                <p className="text-xs text-slate-500 mt-1">Present: {session.totalPresent} • Absent: {session.totalAbsent}</p>
              </div>
              <button onClick={() => setViewSession(session)} className="px-3 py-2 rounded-xl border border-slate-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Eye size={12} /> View Details</button>
            </div>
          ))}
        </div>
      )}

      {selectedSession ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Mark Attendance</h3>
              <button onClick={() => setSelectedSession(null)} className="text-slate-500">Close</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto pr-1">
              {roster.map((student: any) => (
                <div key={student._id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.rollNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    {statusChoices.map((choice) => (
                      <button
                        key={choice}
                        onClick={() => setRecords((prev) => ({ ...prev, [student._id]: choice as any }))}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${records[student._id] === choice ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setSelectedSession(null)} className="px-4 py-2 rounded-xl border border-slate-200">Cancel</button>
              <button onClick={submitAttendance} disabled={submitting} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit Attendance"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewSession ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Attendance Details</h3>
              <button onClick={() => setViewSession(null)} className="text-slate-500">Close</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto pr-1">
              {(viewSession.records || []).map((record: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-slate-900">{record.studentId?.personalInfo?.name || record.studentId?.personalInfo?.firstName || "Student"}</p>
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700">{record.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
