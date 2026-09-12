"use client";

import React from 'react';
import Card from '@/components/ui/Card';

interface AttendanceLogTableProps {
  filteredAttendance: any[];
  filterSubject: string;
  setFilterSubject: (val: string) => void;
  subjects: string[];
}

export default function AttendanceLogTable({ 
  filteredAttendance, 
  filterSubject, 
  setFilterSubject, 
  subjects 
}: AttendanceLogTableProps) {
  return (
    <Card className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-900">Attendance Log — {filterSubject}</h3>
        <select 
          value={filterSubject}
          onChange={(e) => setFilterSubject(e.target.value)}
          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="All Subjects">All Subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      
      <div className="overflow-x-auto text-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-widest">Date & Time</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-widest">Subject</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-widest text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 italic">
            {filteredAttendance.map((record, idx) => (
              <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                <td className="px-6 py-4">
                  <p className="font-bold text-slate-900">{new Date(record.date).toLocaleDateString()}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                    {record.createdAt ? new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '09:00 AM'}
                  </p>
                </td>
                <td className="px-6 py-4 font-bold text-slate-700">
                  {record.subject?.name || 'Unknown Subject'}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                    record.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    record.status === 'Leave' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-rose-50 text-rose-600 border-rose-100'
                  }`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredAttendance.length === 0 && (
          <div className="p-12 text-center text-slate-400 font-bold italic">
            No matching attendance records found.
          </div>
        )}
      </div>
    </Card>
  );
}
