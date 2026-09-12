"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles, ChevronRight, Loader2, Send, AlertTriangle, User } from "lucide-react";
import { fetchAssistantContext, askAssistant } from "@/lib/api/assistant";

const SUGGESTIONS = [
  "How is my attendance looking?",
  "Do I have any fees pending?",
  "When are my next exams?",
  "What was my last result?",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: "llm" | "rules";
}

export default function AiAssistantPage() {
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAssistantContext();
        if (res.success) setContext(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load your record");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || thinking) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setThinking(true);
    setError("");

    try {
      const res = await askAssistant(trimmed, history);
      if (res.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.data.answer, source: res.data.source },
        ]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "The assistant could not answer just now.");
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <nav className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          Intelligence <ChevronRight size={10} />{" "}
          <span className="text-slate-900">AI Assistant</span>
        </nav>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Campus Assistant</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ask about your attendance, fees, exams, results or hostel. Answers come straight from your
          own records.
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl flex flex-col h-[600px]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && !thinking && (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-5">
                  <Sparkles size={28} />
                </div>
                <h2 className="text-lg font-bold text-slate-900 mb-2">
                  Ask me about your semester
                </h2>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                  I can only read your records — I can&apos;t change anything on your behalf.
                </p>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Sparkles size={14} />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    m.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-50 border border-slate-100 text-slate-700"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  {m.source === "rules" && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-2">
                      Answered directly from your records
                    </p>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                    <User size={14} />
                  </div>
                )}
              </div>
            ))}

            {thinking && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles size={14} />
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-indigo-600" />
                  <span className="text-sm text-slate-500 font-semibold">Checking your records…</span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-slate-100 p-4 flex items-center gap-2"
          >
            <input
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400"
              placeholder="Ask about attendance, fees, exams…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              className="px-4 py-3 rounded-2xl bg-slate-900 text-white disabled:opacity-50 shrink-0"
            >
              <Send size={16} />
            </button>
          </form>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 h-fit">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-5">
            Your Record
          </h3>

          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin text-indigo-600" size={20} />
            </div>
          ) : context ? (
            <div className="space-y-4">
              <Fact label="Name" value={context.name} />
              {context.rollNumber && <Fact label="Roll Number" value={context.rollNumber} />}
              {context.department && <Fact label="Department" value={context.department} />}
              {context.attendance && (
                <Fact
                  label="Attendance"
                  value={`${context.attendance.rate}%`}
                  alert={context.attendance.rate < 75}
                  hint={`${context.attendance.present}/${context.attendance.total} lectures`}
                />
              )}
              {context.fees && (
                <Fact
                  label="Fees Outstanding"
                  value={`₹${context.fees.outstanding.toLocaleString("en-IN")}`}
                  alert={context.fees.overdueCount > 0}
                  hint={context.fees.nextDueDate ? `Next due ${context.fees.nextDueDate}` : undefined}
                />
              )}
              {context.latestResult && (
                <Fact
                  label="Latest Result"
                  value={`${context.latestResult.percentage.toFixed(1)}%`}
                  hint={`CGPA ${context.latestResult.cgpa}`}
                  alert={context.latestResult.status === "FAIL"}
                />
              )}
              {context.hostel && (
                <Fact
                  label="Hostel"
                  value={`${context.hostel.room} · Bed ${context.hostel.bed}`}
                  hint={context.hostel.hostel}
                />
              )}
              {context.upcomingExams?.length > 0 && (
                <Fact
                  label="Next Exam"
                  value={context.upcomingExams[0].name}
                  hint={context.upcomingExams[0].date}
                />
              )}

              <p className="text-[10px] font-bold text-slate-400 leading-relaxed pt-4 border-t border-slate-100">
                {context.llmEnabled
                  ? "Answers are generated from the facts above and nothing else."
                  : "Conversational mode is not configured, so answers are read directly from these records."}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-semibold">
              No student record is linked to this account.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, hint, alert }: any) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-sm font-bold ${alert ? "text-rose-600" : "text-slate-900"}`}>{value}</p>
      {hint && <p className="text-[10px] font-bold text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
