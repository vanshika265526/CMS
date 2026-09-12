"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Loader2, X, Download } from "lucide-react";
import TimetableGrid, { TimetableCellEntry } from "@/components/timetable/TimetableGrid";
import { fetchTimetableByTeacher } from "@/lib/api/timetable";

export default function TeacherMyTimetablePage() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<TimetableCellEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<TimetableCellEntry | null>(null);

  const teacherId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return String(user?.id || user?._id || "");
  }, []);

  useEffect(() => {
    if (!teacherId) {
      setLoading(false);
      setError("Unable to resolve teacher profile.");
      return;
    }
    void loadTimetable(teacherId);
  }, [teacherId]);

  const loadTimetable = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetchTimetableByTeacher(id);
      const normalized = (response?.data || []).map((entry: any) => ({
        ...entry,
        day: entry.day || entry.dayOfWeek,
      }));
      setEntries(normalized);
      setError(null);
    } catch (err: any) {
      setEntries([]);
      setError(err?.response?.data?.message || "Failed to load teacher timetable");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  const downloadTimetable = () => {
    if (entries.length === 0) return;
    
    // Create CSV content
    const headers = ['Day', 'Time', 'Subject', 'Batch', 'Section', 'Room'];
    const rows = entries.map(e => [
      e.day || '',
      `${e.startTime} - ${e.endTime}`,
      e.subject || '',
      e.batchId?.name || '',
      e.sectionId?.name || '',
      e.room || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Timetable_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Timetable</h1>
          <p className="text-sm font-medium text-slate-500 mt-2">Weekly teaching schedule across all assigned sections.</p>
        </div>
        <button
          onClick={downloadTimetable}
          disabled={entries.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all font-medium text-sm"
        >
          <Download size={16} />
          Download CSV
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-semibold">{error}</div>
      ) : (
        <TimetableGrid
          entries={entries}
          readOnly
          onCellClick={setSelectedEntry}
          renderBody={(entry) => (
            <>
              <p className="text-[11px] font-black text-slate-900 leading-tight">{entry.subject}</p>
              <p className="text-[10px] font-bold text-slate-600">{entry.batchId?.name || "Batch"} • {entry.sectionId?.name || "Section"}</p>
            </>
          )}
        />
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-100 shadow-2xl p-6" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-900">Class Detail</h2>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mt-1">Read-only view</p>
              </div>
              <button
                className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-300"
                onClick={() => setSelectedEntry(null)}
              >
                <X size={14} className="mx-auto" />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <DetailRow label="Subject" value={selectedEntry.subject} />
              <DetailRow label="Batch" value={selectedEntry.batchId?.name || "-"} />
              <DetailRow label="Section" value={selectedEntry.sectionId?.name || "-"} />
              <DetailRow label="Day" value={selectedEntry.day} />
              <DetailRow label="Time" value={`${selectedEntry.startTime} - ${selectedEntry.endTime}`} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}
