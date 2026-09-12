"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  LifeBuoy,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Send,
  AlertTriangle,
  Check,
  Search,
  Clock,
} from "lucide-react";
import {
  fetchTickets,
  fetchTicketById,
  fetchSupportStats,
  createTicket,
  replyToTicket,
  updateTicket,
} from "@/lib/api/support";

const STAFF_ROLES = ["SUPER_ADMIN", "COLLEGE_ADMIN", "ADMIN", "SUPPORT"];

const CATEGORIES = [
  "ACADEMIC",
  "HOSTEL",
  "FEES",
  "TECHNICAL",
  "LIBRARY",
  "EXAMINATION",
  "OTHER",
];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const STATUS_STYLES: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-600 border-amber-100",
  IN_PROGRESS: "bg-indigo-50 text-indigo-600 border-indigo-100",
  RESOLVED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-500 border-slate-200",
  MEDIUM: "bg-sky-50 text-sky-600 border-sky-100",
  HIGH: "bg-orange-50 text-orange-600 border-orange-100",
  URGENT: "bg-rose-50 text-rose-600 border-rose-100",
};

const FAQS = [
  {
    q: "How do I check my attendance shortage?",
    a: "Open the Attendance page from the sidebar. Your subject-wise percentage is shown against the 75% requirement, and anything below it is highlighted in red.",
  },
  {
    q: "My fee payment is not reflecting.",
    a: "Bank settlements can take up to 48 hours to reconcile. If it has been longer, raise a ticket under the Fees category with your transaction reference and we will trace it.",
  },
  {
    q: "How do I download my hall ticket?",
    a: "Hall tickets appear on the Exams page once results and seating are published. If the exam is listed but the ticket is missing, raise a ticket under Examination.",
  },
  {
    q: "I forgot my portal password.",
    a: "Use the Forgot Password link on the login screen. If your registered email is out of date, raise a ticket under Technical and the admin office will reset it for you.",
  },
  {
    q: "How do I apply for a hostel room?",
    a: "Hostel allocation is handled by the hostel office. Once allocated, your room and bed appear on the Hostel page. Raise a ticket under Hostel to follow up on an application.",
  },
];

export default function SupportPage() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [active, setActive] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [filters, setFilters] = useState({ status: "", category: "", search: "" });

  const isStaff = STAFF_ROLES.includes(role.toUpperCase());

  const notify = (type: "error" | "success", text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketRes, statsRes] = await Promise.all([
        fetchTickets({
          status: filters.status || undefined,
          category: filters.category || undefined,
          search: filters.search || undefined,
        }),
        fetchSupportStats(),
      ]);
      if (ticketRes.success) setTickets(ticketRes.data);
      if (statsRes.success) setStats(statsRes.data);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setRole(JSON.parse(localStorage.getItem("user") || "{}").role || "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openTicket = async (id: string) => {
    try {
      const res = await fetchTicketById(id);
      if (res.success) setActive(res.data);
    } catch (err: any) {
      notify("error", err?.response?.data?.message || "Failed to open ticket");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
            Help <ChevronRight size={10} /> <span className="text-slate-900">Support</span>
          </nav>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Help &amp; Support</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isStaff
              ? "Triage, assign and resolve tickets raised across the campus."
              : "Raise a ticket and track it to resolution."}
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-900/10 flex items-center gap-2"
        >
          <Plus size={14} /> New Ticket
        </button>
      </header>

      {feedback && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold flex items-center gap-2 ${
            feedback.type === "error"
              ? "border-rose-100 bg-rose-50 text-rose-700"
              : "border-emerald-100 bg-emerald-50 text-emerald-700"
          }`}
        >
          {feedback.type === "error" ? <AlertTriangle size={16} /> : <Check size={16} />}
          {feedback.text}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Open" value={stats.open} />
          <StatCard label="In Progress" value={stats.inProgress} />
          <StatCard label="Resolved" value={stats.resolved} />
          <StatCard label="SLA Breached" value={stats.slaBreached} alert={stats.slaBreached > 0} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-400"
            placeholder="Search by subject or ticket number..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
          value={filters.category}
          onChange={(e) => setFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
            Loading tickets
          </p>
        </div>
      ) : tickets.length ? (
        <div className="space-y-3">
          {tickets.map((t) => {
            const breached =
              ["OPEN", "IN_PROGRESS"].includes(t.status) && new Date(t.slaDueAt) < new Date();
            return (
              <button
                key={t._id}
                onClick={() => openTicket(t._id)}
                className="w-full text-left bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-300 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {t.ticketNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${STATUS_STYLES[t.status]}`}
                      >
                        {t.status.replace("_", " ")}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${PRIORITY_STYLES[t.priority]}`}
                      >
                        {t.priority}
                      </span>
                      {breached && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border bg-rose-50 text-rose-600 border-rose-100 flex items-center gap-1">
                          <Clock size={9} /> SLA breached
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-slate-900 truncate">{t.subject}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.category} · raised {new Date(t.createdAt).toLocaleDateString("en-IN")}
                      {isStaff && t.raisedBy?.name ? ` · by ${t.raisedBy.name}` : ""}
                      {t.replies?.length ? ` · ${t.replies.length} repl${t.replies.length === 1 ? "y" : "ies"}` : ""}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <LifeBuoy size={28} />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">No tickets here</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            {filters.search || filters.status || filters.category
              ? "No tickets matched your filters. Try clearing them."
              : "When you raise a support request it will appear here with its full history."}
          </p>
        </div>
      )}

      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
          Knowledge Base
        </h2>
        <div className="space-y-2">
          {FAQS.map((faq) => (
            <details
              key={faq.q}
              className="bg-white border border-slate-200 rounded-2xl px-5 py-4 group"
            >
              <summary className="cursor-pointer text-sm font-bold text-slate-900 list-none flex items-center justify-between gap-4">
                {faq.q}
                <ChevronRight
                  size={16}
                  className="text-slate-300 group-open:rotate-90 transition-transform shrink-0"
                />
              </summary>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {showCreate && (
        <CreateTicketModal
          onClose={() => setShowCreate(false)}
          onSaved={async () => {
            setShowCreate(false);
            notify("success", "Ticket raised. We will get back to you shortly.");
            await load();
          }}
          onError={(m: string) => notify("error", m)}
        />
      )}

      {active && (
        <TicketDetail
          ticket={active}
          isStaff={isStaff}
          onClose={() => setActive(null)}
          onChanged={async (updated: any) => {
            setActive(updated);
            await load();
          }}
          onError={(m: string) => notify("error", m)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, alert }: any) {
  return (
    <div className={`bg-white border rounded-3xl p-5 ${alert ? "border-rose-200" : "border-slate-200"}`}>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
      <p className={`text-3xl font-black ${alert ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function CreateTicketModal({ onClose, onSaved, onError }: any) {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "ACADEMIC",
    priority: "MEDIUM",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createTicket(form);
      onSaved();
    } catch (err: any) {
      onError(err?.response?.data?.message || "Failed to raise ticket");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="Raise a Ticket" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className={labelClass}>Subject</label>
          <input
            className={inputClass}
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            <select
              className={inputClass}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Priority</label>
            <select
              className={inputClass}
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelClass}>Describe the issue</label>
          <textarea
            className={`${inputClass} min-h-32`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            required
          />
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-60 flex items-center gap-2"
          >
            {saving && <Loader2 size={14} className="animate-spin" />} Submit Ticket
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function TicketDetail({ ticket, isStaff, onClose, onChanged, onError }: any) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await replyToTicket(ticket._id, message.trim());
      setMessage("");
      if (res.success) onChanged(res.data);
    } catch (err: any) {
      onError(err?.response?.data?.message || "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const changeStatus = async (status: string) => {
    try {
      const res = await updateTicket(ticket._id, { status });
      if (res.success) onChanged(res.data);
    } catch (err: any) {
      onError(err?.response?.data?.message || "Failed to update ticket");
    }
  };

  return (
    <Dialog title={ticket.ticketNumber} onClose={onClose}>
      <div className="space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${STATUS_STYLES[ticket.status]}`}
            >
              {ticket.status.replace("_", " ")}
            </span>
            <span
              className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${PRIORITY_STYLES[ticket.priority]}`}
            >
              {ticket.priority}
            </span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {ticket.category}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-900">{ticket.subject}</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-3">
            Raised {new Date(ticket.createdAt).toLocaleString("en-IN")} · SLA due{" "}
            {new Date(ticket.slaDueAt).toLocaleString("en-IN")}
          </p>
        </div>

        {isStaff && (
          <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100">
            {STATUSES.filter((s) => s !== ticket.status).map((s) => (
              <button
                key={s}
                onClick={() => changeStatus(s)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:border-indigo-300 hover:text-indigo-600"
              >
                Mark {s.replace("_", " ")}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3 max-h-72 overflow-y-auto">
          {ticket.replies?.length ? (
            ticket.replies.map((r: any, i: number) => (
              <div
                key={i}
                className={`rounded-2xl p-4 ${
                  r.isStaffReply
                    ? "bg-indigo-50 border border-indigo-100"
                    : "bg-slate-50 border border-slate-100"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {r.authorName} {r.isStaffReply && "· Support"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {new Date(r.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{r.message}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 font-semibold text-center py-4">
              No replies yet.
            </p>
          )}
        </div>

        {ticket.status !== "CLOSED" && (
          <form onSubmit={send} className="flex items-end gap-2 pt-2 border-t border-slate-100">
            <textarea
              className={`${inputClass} min-h-20 flex-1`}
              placeholder="Type your reply..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              type="submit"
              disabled={sending || !message.trim()}
              className="px-4 py-3 rounded-2xl bg-slate-900 text-white disabled:opacity-50 shrink-0"
            >
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        )}
      </div>
    </Dialog>
  );
}

const inputClass =
  "w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400";
const labelClass = "block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2";

function Dialog({ title, onClose, children }: any) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-100 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-widest">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center"
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
