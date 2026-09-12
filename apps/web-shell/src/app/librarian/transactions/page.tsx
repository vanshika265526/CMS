"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  IndianRupee,
  Calendar,
  User,
} from "lucide-react";
import { fetchTransactions, returnBook, approveReservation } from "@/lib/api/library";

type TxStatus = "all" | "issued" | "returned" | "overdue" | "reserved";

const STATUS_TABS: { key: TxStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "reserved", label: "Reserved" },
  { key: "issued", label: "Issued" },
  { key: "overdue", label: "Overdue" },
  { key: "returned", label: "Returned" },
];

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  issued: {
    label: "Issued",
    cls: "bg-indigo-50 text-indigo-600 border-indigo-100",
    icon: <ArrowLeftRight size={12} />,
  },
  returned: {
    label: "Returned",
    cls: "bg-emerald-50 text-emerald-600 border-emerald-100",
    icon: <CheckCircle2 size={12} />,
  },
  overdue: {
    label: "Overdue",
    cls: "bg-rose-50 text-rose-600 border-rose-100",
    icon: <AlertCircle size={12} />,
  },
  reserved: {
    label: "Reserved",
    cls: "bg-amber-50 text-amber-600 border-amber-100",
    icon: <Clock size={12} />,
  },
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<TxStatus>("all");
  const [search, setSearch] = useState("");
  const [returningId, setReturningId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchTransactions({
        status: activeStatus === "all" ? undefined : activeStatus,
      });
      if (res.success) setTransactions(res.data);
    } catch {
      showToast("Failed to load transactions", "error");
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReturn = async (txId: string) => {
    if (!confirm("Mark this book as returned?")) return;
    setReturningId(txId);
    try {
      const res = await returnBook(txId);
      showToast("Book returned successfully" + (res.data?.fine > 0 ? ` — Fine: ₹${res.data.fine}` : ""));
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to process return", "error");
    } finally {
      setReturningId(null);
    }
  };

  const [approvingId, setApprovingId] = useState<string | null>(null);
  const handleApprove = async (txId: string) => {
    if (!confirm("Approve this reservation and physically issue the book?")) return;
    setApprovingId(txId);
    try {
      const res = await approveReservation(txId);
      showToast("Reservation approved. Book officially issued!");
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Failed to approve reservation", "error");
    } finally {
      setApprovingId(null);
    }
  };

  const filtered = transactions.filter((tx) => {
    if (!search) return true;
    const studentName =
      `${tx.studentId?.personalInfo?.firstName || ""} ${tx.studentId?.personalInfo?.lastName || ""}`.toLowerCase();
    const bookTitle = (tx.bookId?.title || "").toLowerCase();
    const roll = (tx.studentId?.academicInfo?.rollNumber || "").toLowerCase();
    const q = search.toLowerCase();
    return studentName.includes(q) || bookTitle.includes(q) || roll.includes(q);
  });

  const counts = {
    all: transactions.length,
    reserved: transactions.filter((t) => t.status === "reserved").length,
    issued: transactions.filter((t) => t.status === "issued").length,
    overdue: transactions.filter((t) => t.status === "overdue").length,
    returned: transactions.filter((t) => t.status === "returned").length,
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl font-semibold text-sm animate-in slide-in-from-top-4 ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track all book issues, returns, and overdue fines.
          </p>
        </div>

        {/* Summary Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-xl">
            <ArrowLeftRight size={14} className="text-indigo-600" />
            <span className="text-xs font-black text-indigo-600">{counts.issued} Issued</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl">
            <AlertCircle size={14} className="text-rose-600" />
            <span className="text-xs font-black text-rose-600">{counts.overdue} Overdue</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs + Search */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center bg-slate-50 rounded-xl p-1 border border-slate-100">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeStatus === tab.key
                  ? "bg-teal-600 text-white shadow-md shadow-teal-600/20"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeStatus === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by student name, roll, or book title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600/50 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
            Loading transactions...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-32 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
          <ArrowLeftRight size={48} className="text-slate-200 mx-auto mb-4" />
          <p className="text-lg font-bold text-slate-400 uppercase tracking-widest">
            No transactions found
          </p>
          <p className="text-sm text-slate-300 mt-2">
            {search ? "Try adjusting your search." : "Issue a book to see transactions here."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="col-span-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Book</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Student</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Issue Date</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Due / Return</p>
            </div>
            <div className="col-span-1">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Fine</p>
            </div>
            <div className="col-span-2 text-right">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status / Action</p>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-50">
            {filtered.map((tx) => {
              const cfg = statusConfig[tx.status] || statusConfig.issued;
              const studentName = tx.studentId
                ? `${tx.studentId.personalInfo?.firstName || ""} ${tx.studentId.personalInfo?.lastName || ""}`.trim()
                : "Unknown";
              const roll = tx.studentId?.academicInfo?.rollNumber || "—";
              const bookTitle = tx.bookId?.title || "Unknown Book";
              const bookAuthor = tx.bookId?.author || "";
              const issueDate = tx.issueDate
                ? new Date(tx.issueDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—";
              const dueOrReturn = tx.status === "returned"
                ? tx.returnDate
                  ? new Date(tx.returnDate).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })
                  : "—"
                : tx.dueDate
                ? new Date(tx.dueDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })
                : "—";

              const isOverdue = tx.status === "overdue";
              const isActive = tx.status === "issued" || isOverdue;
              const isReserved = tx.status === "reserved";

              return (
                <div
                  key={tx._id}
                  className={`grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-slate-50 transition-colors ${
                    isOverdue ? "bg-rose-50/30" : ""
                  }`}
                >
                  {/* Book */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center shrink-0 border border-teal-100">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{bookTitle}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{bookAuthor}</p>
                    </div>
                  </div>

                  {/* Student */}
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs">
                      {studentName[0] || "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{studentName}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{roll}</p>
                    </div>
                  </div>

                  {/* Issue Date */}
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-300 shrink-0" />
                      <span className="text-xs font-medium text-slate-600">{issueDate}</span>
                    </div>
                  </div>

                  {/* Due / Return Date */}
                  <div className="col-span-2">
                    <div className={`flex items-center gap-1.5 ${isOverdue ? "text-rose-600" : "text-slate-600"}`}>
                      <Clock size={12} className="shrink-0" />
                      <span className="text-xs font-medium">{dueOrReturn}</span>
                    </div>
                    {tx.status === "returned" && (
                      <p className="text-[10px] text-slate-400 ml-4">Returned</p>
                    )}
                  </div>

                  {/* Fine */}
                  <div className="col-span-1">
                    {tx.fine > 0 ? (
                      <div className="flex items-center gap-1 text-rose-600">
                        <IndianRupee size={12} />
                        <span className="font-black text-sm">{tx.fine}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 font-bold">—</span>
                    )}
                  </div>

                  {/* Action */}
                  <div className="col-span-2 flex justify-end items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.cls}`}
                    >
                      {cfg.icon} {cfg.label}
                    </span>
                    {isReserved && (
                      <button
                        onClick={() => handleApprove(tx._id)}
                        disabled={approvingId === tx._id}
                        title="Approve & Issue"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-lg shadow-md shadow-amber-500/20 font-bold text-xs transition-all disabled:opacity-50"
                      >
                        {approvingId === tx._id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={12} /> Approve
                          </>
                        )}
                      </button>
                    )}
                    {isActive && (
                      <button
                        onClick={() => handleReturn(tx._id)}
                        disabled={returningId === tx._id}
                        title="Mark as Returned"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white hover:bg-teal-700 rounded-lg shadow-md shadow-teal-600/20 font-bold text-xs transition-all disabled:opacity-50"
                      >
                        {returningId === tx._id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <RotateCcw size={12} /> Return
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {filtered.length} record{filtered.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-slate-400">
              Fine rate: <span className="font-bold text-slate-600">₹5 / overdue day</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
