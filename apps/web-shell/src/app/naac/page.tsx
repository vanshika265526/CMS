"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ChevronRight, Loader2, AlertTriangle, FileText, Lock } from "lucide-react";
import { fetchNaacDocuments, fetchNaacStats } from "@/lib/api/admin";

const CRITERIA = [
  { id: 1, title: "Curricular Aspects" },
  { id: 2, title: "Teaching-Learning & Evaluation" },
  { id: 3, title: "Research, Innovations & Extension" },
  { id: 4, title: "Infrastructure & Learning Resources" },
  { id: 5, title: "Student Support & Progression" },
  { id: 6, title: "Governance, Leadership & Management" },
  { id: 7, title: "Institutional Values & Best Practices" },
];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-50 text-slate-500 border-slate-200",
  REVIEW: "bg-amber-50 text-amber-600 border-amber-100",
  APPROVED: "bg-emerald-50 text-emerald-600 border-emerald-100",
};

export default function NaacPage() {
  const [loading, setLoading] = useState(true);
  const [restricted, setRestricted] = useState(false);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [docRes, statRes] = await Promise.all([fetchNaacDocuments(), fetchNaacStats()]);
        if (docRes.success) setDocuments(docRes.data || []);
        if (statRes.success) setStats(statRes.data || []);
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 403 || status === 401) {
          setRestricted(true);
        } else {
          setError(err?.response?.data?.message || "Failed to load accreditation data");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const summary = useMemo(() => {
    const approved = documents.filter((d) => d.status === "APPROVED").length;
    const review = documents.filter((d) => d.status === "REVIEW").length;
    const covered = new Set(documents.map((d) => String(d.criterion))).size;
    return { total: documents.length, approved, review, covered };
  }, [documents]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Governance <ChevronRight size={10} />{" "}
            <span className="text-slate-900">Accreditation</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            NAAC Accreditation
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Criterion-wise evidence coverage for the institutional self-study report.
          </p>
        </div>

        {!restricted && (
          <Link
            href="/admin/naac"
            className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-900/10 flex items-center gap-2"
          >
            <ShieldCheck size={14} /> Open Quality Vault
          </Link>
        )}
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="h-72 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            Verifying evidence trail
          </p>
        </div>
      ) : restricted ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
          <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Restricted to the IQAC</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Accreditation evidence is managed by the Internal Quality Assurance Cell. Contact the
            IQAC coordinator if you need to contribute documentation for a criterion.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Evidence Files" value={summary.total} />
            <StatCard label="Approved" value={summary.approved} />
            <StatCard label="Under Review" value={summary.review} />
            <StatCard label="Criteria Covered" value={`${summary.covered}/7`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {CRITERIA.map((c) => {
              const count =
                stats.find((s: any) => String(s._id) === String(c.id))?.count ??
                documents.filter((d) => String(d.criterion) === String(c.id)).length;
              return (
                <div key={c.id} className="bg-white border border-slate-200 rounded-3xl p-5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">
                    Criterion {c.id}
                  </p>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-4 min-h-8 leading-snug">
                    {c.title}
                  </h3>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${count > 0 ? "bg-indigo-600" : "bg-slate-200"}`}
                      style={{ width: `${Math.min(count * 20, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                    {count} file{count === 1 ? "" : "s"}
                  </p>
                </div>
              );
            })}
          </div>

          <section>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
              Recent Evidence
            </h2>
            {documents.length ? (
              <div className="bg-white border border-slate-200 rounded-3xl divide-y divide-slate-100">
                {documents.slice(0, 12).map((d) => (
                  <div key={d._id} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{d.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Criterion {d.criterion} · {d.academicYear}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${
                          STATUS_STYLES[d.status] || STATUS_STYLES.DRAFT
                        }`}
                      >
                        {d.status || "DRAFT"}
                      </span>
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <ShieldCheck size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">No evidence uploaded yet</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  Start building the self-study report by uploading criterion evidence in the
                  Quality Vault.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}
