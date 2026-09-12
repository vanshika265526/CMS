"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  Loader2,
  AlertTriangle,
  TrendingUp,
  Users,
  Wallet,
  GraduationCap,
} from "lucide-react";
import {
  fetchAnalyticsOverview,
  fetchEnrollmentTrend,
  fetchAttendanceTrend,
  fetchDepartmentPerformance,
  fetchAtRiskStudents,
  fetchGradeDistribution,
} from "@/lib/api/analytics";

const RISK_STYLES: Record<string, string> = {
  CRITICAL: "bg-rose-50 text-rose-600 border-rose-100",
  HIGH: "bg-orange-50 text-orange-600 border-orange-100",
  MODERATE: "bg-amber-50 text-amber-600 border-amber-100",
  LOW: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<any>(null);
  const [enrollment, setEnrollment] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [riskThreshold, setRiskThreshold] = useState(30);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [ov, en, at, dp, ar, gd] = await Promise.all([
          fetchAnalyticsOverview(),
          fetchEnrollmentTrend(12),
          fetchAttendanceTrend(30),
          fetchDepartmentPerformance(),
          fetchAtRiskStudents(riskThreshold),
          fetchGradeDistribution(),
        ]);
        if (ov.success) setOverview(ov.data);
        if (en.success) setEnrollment(en.data);
        if (at.success) setAttendance(at.data);
        if (dp.success) setDepartments(dp.data);
        if (ar.success) setAtRisk(ar.data);
        if (gd.success) setGrades(gd.data);
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            "Unable to load analytics. Institutional analytics are restricted to administrators."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [riskThreshold]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Insights <ChevronRight size={10} /> <span className="text-slate-900">Campus IQ</span>
        </nav>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Campus IQ</h1>
        <p className="text-sm text-slate-500 mt-1">
          Live institutional analytics across enrollment, attendance, results and collections.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            Aggregating institutional data
          </p>
        </div>
      ) : (
        overview && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                icon={<Users size={16} />}
                label="Active Students"
                value={overview.students.toLocaleString("en-IN")}
                hint={`${overview.faculty} faculty · ${overview.departments} departments`}
              />
              <KpiCard
                icon={<TrendingUp size={16} />}
                label="Attendance"
                value={`${overview.attendanceRate}%`}
                hint={`${overview.studentsBelowAttendanceThreshold} below 75%`}
                alert={overview.attendanceRate < 75}
              />
              <KpiCard
                icon={<GraduationCap size={16} />}
                label="Pass Rate"
                value={`${overview.passRate}%`}
                hint={`Avg CGPA ${overview.avgCgpa} · ${overview.resultsPublished} results`}
              />
              <KpiCard
                icon={<Wallet size={16} />}
                label="Fee Collection"
                value={`${overview.collectionRate}%`}
                hint={`₹${Math.round(overview.feesOutstanding).toLocaleString("en-IN")} outstanding`}
                alert={overview.collectionRate < 60}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Panel title="Attendance (last 30 days)">
                {attendance.length ? (
                  <LineChart
                    data={attendance.map((d) => ({ label: d.date, value: d.rate }))}
                    threshold={75}
                    suffix="%"
                  />
                ) : (
                  <NoData text="No attendance recorded in this window." />
                )}
              </Panel>

              <Panel title="Enrollment (last 12 months)">
                {enrollment.some((e) => e.count > 0) ? (
                  <BarChart data={enrollment.map((e) => ({ label: e.label, value: e.count }))} />
                ) : (
                  <NoData text="No enrollments recorded in this window." />
                )}
              </Panel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Panel title="Department Performance">
                {departments.length ? (
                  <div className="space-y-4">
                    {departments.map((d) => (
                      <div key={String(d.departmentId)}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-bold text-slate-900 truncate">{d.name}</span>
                          <span className="text-xs font-black text-slate-500 shrink-0 ml-3">
                            {d.avgPercentage}% · {d.students} students
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-600"
                            style={{ width: `${Math.min(d.avgPercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <NoData text="No department data available yet." />
                )}
              </Panel>

              <Panel title="Grade Distribution">
                {grades.length ? (
                  <BarChart
                    data={grades.map((g) => ({ label: g.grade, value: g.count }))}
                    color="#0f172a"
                  />
                ) : (
                  <NoData text="No results have been published yet." />
                )}
              </Panel>
            </div>

            <section>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Early Warning System
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Students scored on attendance, exam results and fee status. Every score is
                    explained by the signals listed against it.
                  </p>
                </div>
                <select
                  value={riskThreshold}
                  onChange={(e) => setRiskThreshold(Number(e.target.value))}
                  className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
                >
                  <option value={25}>Score 25+ (moderate and above)</option>
                  <option value={45}>Score 45+ (high and above)</option>
                  <option value={70}>Score 70+ (critical only)</option>
                </select>
              </div>

              {atRisk.length ? (
                <div className="space-y-3">
                  {atRisk.map((s) => (
                    <div
                      key={String(s.studentId)}
                      className="bg-white border border-slate-200 rounded-3xl p-5"
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-slate-900">{s.name}</p>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${RISK_STYLES[s.riskLevel]}`}
                            >
                              {s.riskLevel}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                            {s.rollNumber} · {s.department} · Semester {s.semester ?? "—"}
                          </p>
                          <ul className="space-y-1">
                            {s.reasons.map((r: string, i: number) => (
                              <li
                                key={i}
                                className="text-xs text-slate-600 flex items-start gap-2 font-medium"
                              >
                                <span className="text-rose-400 mt-0.5">•</span>
                                {r}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Risk Score
                          </p>
                          <p className="text-3xl font-black text-slate-900">{s.riskScore}</p>
                          <p className="text-[10px] font-bold text-slate-400">
                            Attendance {s.attendanceRate ?? "—"}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                  <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <BarChart3 size={28} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    No students above this risk threshold
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Either the cohort is tracking well, or attendance and results have not been
                    recorded yet this term.
                  </p>
                </div>
              )}
            </section>
          </>
        )
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, hint, alert }: any) {
  return (
    <div className={`bg-white border rounded-3xl p-5 ${alert ? "border-rose-200" : "border-slate-200"}`}>
      <div className="flex items-center gap-2 mb-3 text-slate-400">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-3xl font-black ${alert ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
      <p className="text-[10px] font-bold text-slate-400 mt-1">{hint}</p>
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">{title}</h3>
      {children}
    </div>
  );
}

function NoData({ text }: { text: string }) {
  return (
    <div className="h-48 flex items-center justify-center">
      <p className="text-xs text-slate-400 font-semibold text-center max-w-xs">{text}</p>
    </div>
  );
}

/** Minimal inline SVG line chart — avoids pulling in a charting dependency. */
function LineChart({
  data,
  threshold,
  suffix = "",
}: {
  data: { label: string; value: number }[];
  threshold?: number;
  suffix?: string;
}) {
  const width = 640;
  const height = 200;
  const padding = { top: 12, right: 12, bottom: 24, left: 36 };

  const { points, max, min, path } = useMemo(() => {
    const values = data.map((d) => d.value);
    const rawMax = Math.max(...values, threshold ?? 0);
    const rawMin = Math.min(...values, 0);
    const max = Math.ceil(rawMax / 10) * 10 || 100;
    const min = Math.floor(rawMin / 10) * 10;
    const span = max - min || 1;

    const innerW = width - padding.left - padding.right;
    const innerH = height - padding.top - padding.bottom;

    const points = data.map((d, i) => ({
      x: padding.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: padding.top + innerH - ((d.value - min) / span) * innerH,
      ...d,
    }));

    const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    return { points, max, min, path };
  }, [data, threshold]);

  const thresholdY =
    threshold !== undefined
      ? padding.top +
        (height - padding.top - padding.bottom) -
        ((threshold - min) / (max - min || 1)) * (height - padding.top - padding.bottom)
      : null;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[420px] h-52">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padding.top + t * (height - padding.top - padding.bottom);
          const value = Math.round(max - t * (max - min));
          return (
            <g key={t}>
              <line
                x1={padding.left}
                x2={width - padding.right}
                y1={y}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
              <text x={4} y={y + 3} fontSize={9} fill="#94a3b8" fontWeight={700}>
                {value}
                {suffix}
              </text>
            </g>
          );
        })}

        {thresholdY !== null && (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={thresholdY}
            y2={thresholdY}
            stroke="#f43f5e"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}

        <path d={path} fill="none" stroke="#4f46e5" strokeWidth={2.5} strokeLinejoin="round" />

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="#4f46e5">
            <title>{`${p.label}: ${p.value}${suffix}`}</title>
          </circle>
        ))}

        {points
          .filter((_, i) => i % Math.ceil(points.length / 6) === 0)
          .map((p, i) => (
            <text
              key={i}
              x={p.x}
              y={height - 6}
              fontSize={8}
              fill="#94a3b8"
              fontWeight={700}
              textAnchor="middle"
            >
              {p.label.slice(5)}
            </text>
          ))}
      </svg>
    </div>
  );
}

/** Minimal inline SVG bar chart. */
function BarChart({
  data,
  color = "#4f46e5",
}: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2 h-48 min-w-[420px]">
        {data.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full group">
            <span className="text-[10px] font-black text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity">
              {d.value}
            </span>
            <div
              className="w-full rounded-t-lg transition-all"
              style={{
                height: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 1)}%`,
                backgroundColor: d.value > 0 ? color : "#e2e8f0",
              }}
              title={`${d.label}: ${d.value}`}
            />
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider truncate w-full text-center">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
