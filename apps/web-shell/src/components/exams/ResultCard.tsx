"use client";

import React from "react";
import Card from "@/components/ui/Card";
import { Award, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  result: any;
}

const ResultCard: React.FC<ResultCardProps> = ({ result }) => {
  const isPass = result.status === "PASS";

  return (
    <Card className="p-8 border-none bg-white shadow-ambient rounded-4xl overflow-hidden group hover:shadow-xl transition-all duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
        <div className="flex gap-4 items-center">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform", 
            result.type === 'ASSIGNMENT' ? 'bg-amber-50 text-amber-600 border border-amber-100' : (isPass ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'))}>
            <Award size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 font-display tracking-tight flex items-center gap-2">
              {result.type === 'ASSIGNMENT' ? (result.assignmentId?.title || "Assignment Submission") : (result.examId?.name || "Term Examination")}
              <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter", 
                result.type === 'ASSIGNMENT' ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700")}>
                {result.type === 'ASSIGNMENT' ? "Coursework" : "Official"}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-0.5">
              {result.type === 'ASSIGNMENT' ? 'Internal Assessment' : 'Academic Session 2024-25'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={cn("px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase border shadow-sm",
            isPass ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
          )}>
            {result.status}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <StatItem label="Score" value={`${result.subjects[0]?.marks || 0}/${result.subjects[0]?.maxMarks || 0}`} sub="Marks Obtained" color="text-slate-900" />
        <StatItem label="Type" value={result.type || 'EXAM'} sub="Assessment Category" color="text-indigo-600" />
        <StatItem label="CGPA Equivalent" value={result.cgpa?.toFixed(2) || 'N/A'} sub="Grade Point" color="text-amber-600" />
        <StatItem label="Outcome" value={result.status} sub="Final Result" color="text-emerald-600" />
      </div>

      <div className="overflow-hidden border border-slate-100 rounded-2xl bg-slate-50/30">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject Details</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Marks</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Grade</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {result.subjects.map((subject: any, idx: number) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-all hover:translate-x-1 duration-200">
                <td className="px-6 py-4">
                  <p className="text-sm font-bold text-slate-900">{subject.subjectName}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{subject.subjectId?.code || "SUB-001"}</p>
                </td>
                <td className="px-6 py-4 text-center">
                  <p className="text-sm font-black text-slate-700">{subject.marks} <span className="text-slate-300 font-medium">/ {subject.maxMarks}</span></p>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-black text-indigo-600">{subject.grade}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5 font-black text-[10px] tracking-widest uppercase">
                    {subject.status === 'PASS' ? (
                      <><CheckCircle2 size={14} className="text-emerald-500" /> <span className="text-emerald-600">Qualified</span></>
                    ) : (
                      <><XCircle size={14} className="text-rose-500" /> <span className="text-rose-600">Failed</span></>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

function StatItem({ label, value, sub, color }: any) {
  return (
    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-sm transition-all">
      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium mt-0.5">{sub}</p>
    </div>
  );
}

export default ResultCard;

