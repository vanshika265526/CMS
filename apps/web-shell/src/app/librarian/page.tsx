"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ArrowUpRight,
  AlertTriangle,
  Library,
  Clock,
  TrendingUp,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { fetchLibraryStats } from "@/lib/api/library";

export default function LibrarianDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));

    const load = async () => {
      try {
        const res = await fetchLibraryStats();
        if (res.success) setStats(res.data);
      } catch (err) {
        console.error("Failed to load library stats", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: "Total Titles",
      value: stats?.totalTitles ?? 0,
      sub: `${stats?.totalCopies ?? 0} total copies`,
      icon: <Library size={22} />,
      color: "bg-teal-50 text-teal-600 border-teal-100",
      trend: "Inventory",
      trendUp: true,
    },
    {
      label: "Issued Books",
      value: stats?.issued ?? 0,
      sub: "Currently checked out",
      icon: <ArrowUpRight size={22} />,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      trend: "Active",
      trendUp: true,
    },
    {
      label: "Overdue",
      value: stats?.overdue ?? 0,
      sub: "Past due date",
      icon: <AlertTriangle size={22} />,
      color:
        (stats?.overdue ?? 0) > 0
          ? "bg-rose-50 text-rose-600 border-rose-100"
          : "bg-emerald-50 text-emerald-600 border-emerald-100",
      trend: (stats?.overdue ?? 0) > 0 ? "Action needed" : "All clear",
      trendUp: (stats?.overdue ?? 0) === 0,
    },
    {
      label: "Return Rate",
      value:
        stats?.issued > 0 || stats?.overdue > 0
          ? `${Math.round(((stats?.totalTitles || 1) / ((stats?.issued || 0) + (stats?.overdue || 0) + 1)) * 100)}%`
          : "100%",
      sub: "Books returned on time",
      icon: <TrendingUp size={22} />,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      trend: "Performance",
      trendUp: true,
    },
  ];

  const recent = stats?.recentTransactions || [];

  const statusConfig: Record<string, { label: string; cls: string }> = {
    issued: { label: "Issued", cls: "bg-indigo-50 text-indigo-600 border-indigo-100" },
    returned: { label: "Returned", cls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    overdue: { label: "Overdue", cls: "bg-rose-50 text-rose-600 border-rose-100" },
    reserved: { label: "Reserved", cls: "bg-amber-50 text-amber-600 border-amber-100" },
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Library Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, <span className="font-semibold text-teal-600">{user?.name}</span> — here's today's library overview.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/librarian/books"
            className="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2"
          >
            <BookOpen size={14} /> Manage Books
          </Link>
          <Link
            href="/librarian/transactions"
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center gap-2"
          >
            <ArrowUpRight size={14} /> Transactions
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm group hover:shadow-md transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-12 h-12 ${kpi.color} rounded-2xl flex items-center justify-center border transition-all group-hover:scale-110`}
              >
                {kpi.icon}
              </div>
              <span
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  kpi.trendUp
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-rose-50 text-rose-600 border-rose-100"
                }`}
              >
                {kpi.trend}
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
              {kpi.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-900">{kpi.value}</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
            Quick Actions
          </h2>

          <Link
            href="/librarian/books"
            className="group flex items-center justify-between p-5 bg-teal-600 text-white rounded-2xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <div>
                <p className="font-bold text-sm">Issue a Book</p>
                <p className="text-teal-100 text-[10px] font-medium">
                  Search student & select title
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="opacity-60 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/librarian/transactions"
            className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-slate-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <RotateCcw size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">Return a Book</p>
                <p className="text-slate-400 text-[10px] font-medium">Mark return & compute fine</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/librarian/books"
            className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-md hover:border-slate-200 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <Library size={20} />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-900">Add New Book</p>
                <p className="text-slate-400 text-[10px] font-medium">Expand the inventory</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-300 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent Activity</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                Last 5 transactions
              </p>
            </div>
            <Link
              href="/librarian/transactions"
              className="flex items-center gap-1 text-xs font-bold text-teal-600 hover:text-teal-700 transition-colors"
            >
              View All <ChevronRight size={14} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="py-16 text-center">
              <Clock size={40} className="mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                No recent activity
              </p>
              <p className="text-xs text-slate-300 mt-2">
                Issue a book to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map((tx: any, i: number) => {
                const cfg = statusConfig[tx.status] || statusConfig.issued;
                const studentName = tx.studentId
                  ? `${tx.studentId.personalInfo?.firstName || ""} ${tx.studentId.personalInfo?.lastName || ""}`.trim()
                  : "Unknown Student";
                const bookTitle = tx.bookId?.title || "Unknown Book";

                return (
                  <div
                    key={tx._id || i}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="w-10 h-10 bg-white rounded-xl border border-slate-100 flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{bookTitle}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                        {studentName}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(tx.issueDate || tx.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
