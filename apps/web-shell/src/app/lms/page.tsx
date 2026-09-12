"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  ChevronRight,
  Loader2,
  FileText,
  Download,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { fetchMyMaterials } from "@/lib/api/student";
import { fetchAssignments, fetchMySubmissions } from "@/lib/api/assignments";

const TYPE_STYLES: Record<string, string> = {
  Material: "bg-indigo-50 text-indigo-600 border-indigo-100",
  Reference: "bg-sky-50 text-sky-600 border-sky-100",
  Assignment: "bg-amber-50 text-amber-600 border-amber-100",
};

export default function LmsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [tab, setTab] = useState<"materials" | "assignments">("materials");
  const [subject, setSubject] = useState("ALL");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [matRes, asgRes, subRes] = await Promise.all([
          fetchMyMaterials().catch(() => ({ success: false, data: [] })),
          fetchAssignments().catch(() => ({ success: false, data: [] })),
          fetchMySubmissions().catch(() => ({ success: false, data: [] })),
        ]);
        if (matRes.success) setMaterials(matRes.data || []);
        if (asgRes.success) setAssignments(asgRes.data || []);
        if (subRes.success) setSubmissions(subRes.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load your course content");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const subjects = useMemo(() => {
    const names = new Set<string>();
    materials.forEach((m) => {
      const name = m.subjectId?.name || m.subject?.name;
      if (name) names.add(name);
    });
    return ["ALL", ...Array.from(names).sort()];
  }, [materials]);

  const visibleMaterials = useMemo(
    () =>
      subject === "ALL"
        ? materials
        : materials.filter((m) => (m.subjectId?.name || m.subject?.name) === subject),
    [materials, subject]
  );

  const submissionByAssignment = useMemo(
    () => new Map(submissions.map((s: any) => [String(s.assignmentId?._id || s.assignmentId), s])),
    [submissions]
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Academics <ChevronRight size={10} /> <span className="text-slate-900">Learning</span>
        </nav>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Learning</h1>
        <p className="text-sm text-slate-500 mt-1">
          Course material, reference reading and assignments shared by your faculty.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex gap-2">
          {[
            { id: "materials", label: `Materials (${materials.length})` },
            { id: "assignments", label: `Assignments (${assignments.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                tab === t.id
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "materials" && subjects.length > 1 && (
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400 md:ml-auto"
          >
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All subjects" : s}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            Loading your course content
          </p>
        </div>
      ) : tab === "materials" ? (
        visibleMaterials.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {visibleMaterials.map((m) => (
              <div
                key={m._id}
                className="bg-white border border-slate-200 rounded-3xl p-5 flex flex-col justify-between hover:border-indigo-300 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center">
                      <FileText size={18} />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                        TYPE_STYLES[m.type] || "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {m.type}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 leading-snug">{m.title}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {m.subjectId?.name || m.subject?.name || "General"}
                  </p>
                  {m.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(m.createdAt).toLocaleDateString("en-IN")}
                  </span>
                  <a
                    href={m.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800"
                  >
                    <Download size={11} /> Open
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<GraduationCap size={28} />}
            title="No materials yet"
            body="Your faculty have not shared any course material for this term. Anything they upload will appear here."
          />
        )
      ) : assignments.length ? (
        <div className="space-y-3">
          {assignments.map((a) => {
            const submission = submissionByAssignment.get(String(a._id));
            const due = a.dueDate ? new Date(a.dueDate) : null;
            const overdue = due && due < new Date() && !submission;

            return (
              <div key={a._id} className="bg-white border border-slate-200 rounded-3xl p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <p className="font-bold text-slate-900">{a.title}</p>
                      {submission ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-emerald-50 text-emerald-600 border-emerald-100 flex items-center gap-1">
                          <CheckCircle2 size={9} />
                          {submission.marks !== undefined && submission.marks !== null
                            ? `Graded · ${submission.marks}`
                            : "Submitted"}
                        </span>
                      ) : overdue ? (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-rose-50 text-rose-600 border-rose-100">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-amber-50 text-amber-600 border-amber-100">
                          Pending
                        </span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">{a.description}</p>
                    )}
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                      <Clock size={10} />
                      {due ? `Due ${due.toLocaleDateString("en-IN")}` : "No due date"}
                      {a.subjectId?.name ? ` · ${a.subjectId.name}` : ""}
                    </p>
                  </div>

                  <a
                    href={`/assignments`}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600 shrink-0 text-center"
                  >
                    {submission ? "View" : "Submit"}
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="No assignments"
          body="You have no assignments right now. New ones will show up here with their due dates."
        />
      )}
    </div>
  );
}

function EmptyState({ icon, title, body }: any) {
  return (
    <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
      <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
        {icon}
      </div>
      <h2 className="text-lg font-bold text-slate-900 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">{body}</p>
    </div>
  );
}
