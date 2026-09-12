'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, Flame, Info, Loader2, ChevronDown, Search, Check } from 'lucide-react';
import { getAttendanceStats } from '@/lib/api/attendance';
import { getBatches } from '@/lib/api/academics';
import { cn } from '@/lib/utils';

interface ShortageRecord {
  studentId: string;
  name: string;
  uniqueId: string;
  totalClasses: number;
  presentCount: number;
  percentage: number;
  isShortage: boolean;
  classesNeededToRecover: number;
  riskLevel: 'critical' | 'high' | 'medium';
}

const riskConfig = {
  critical: { label: 'CRITICAL', bg: 'bg-rose-50', border: 'border-rose-200', badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-600 shadow-rose-600/20', icon: <Flame size={16} className="text-rose-600" /> },
  high:     { label: 'HIGH RISK', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500 shadow-amber-500/20', icon: <AlertTriangle size={16} className="text-amber-600" /> },
  medium:   { label: 'MEDIUM', bg: 'bg-indigo-50', border: 'border-indigo-200', badge: 'bg-indigo-100 text-indigo-700', bar: 'bg-indigo-600 shadow-indigo-600/20', icon: <TrendingDown size={16} className="text-indigo-600" /> },
};

export default function ShortageAlertsPanel() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<ShortageRecord[]>([]);

  useEffect(() => {
    async function fetchBatches() {
      try {
        const res = await getBatches();
        setBatches(Array.isArray(res) ? res : (res.data || []));
      } catch (err) {
        console.error("Failed to load batches");
      }
    }
    fetchBatches();
  }, []);

  useEffect(() => {
    if (!selectedBatch) {
      setAlerts([]);
      return;
    }
    async function fetchStats() {
      setLoading(true);
      try {
        const res = await getAttendanceStats(selectedBatch);
        if (res.success) {
          const raw = res.data || [];
          const processed = raw
            .filter((s: any) => s.percentage < 75)
            .map((s: any) => {
              const P = s.presentCount;
              const T = s.totalClasses;
              // X = (0.75T - P) / 0.25 => 3T - 4P
              const needed = Math.max(0, Math.ceil(3 * T - 4 * P));
              
              let risk: 'critical' | 'high' | 'medium' = 'medium';
              if (s.percentage < 50) risk = 'critical';
              else if (s.percentage < 65) risk = 'high';

              return {
                ...s,
                classesNeededToRecover: needed,
                riskLevel: risk
              };
            })
            .sort((a: any, b: any) => a.percentage - b.percentage);
          setAlerts(processed);
        }
      } catch (err) {
        console.error("Failed to fetch statistics");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [selectedBatch]);

  const critical = alerts.filter(a => a.riskLevel === 'critical').length;
  const high = alerts.filter(a => a.riskLevel === 'high').length;

  return (
    <div className="space-y-8">
      {/* Batch Selection */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="max-w-xs w-full space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Matrix Analysis Target</label>
          <div className="relative group">
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all"
            >
              <option value="">Choose Batch...</option>
              {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {selectedBatch && !loading && (
          <div className="flex gap-4">
            <StatPill label="Critical" count={critical} color="text-rose-600" bg="bg-rose-50" />
            <StatPill label="High Risk" count={high} color="text-amber-600" bg="bg-amber-50" />
            <StatPill label="Medium" count={alerts.length - critical - high} color="text-indigo-600" bg="bg-indigo-50" />
          </div>
        )}
      </div>

      {/* AI Intelligence Note */}
      <div className="flex items-start gap-4 p-5 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-600/20 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
        <Info className="w-5 h-5 text-indigo-200 mt-1 shrink-0" />
        <div className="relative z-10 flex-1">
          <h4 className="text-sm font-black uppercase tracking-widest mb-1">AI Predictive Diagnostics</h4>
          <p className="text-xs text-indigo-50 leading-relaxed font-medium">
            Detection algorithm flags any node falling below the 75% institutional benchmark. the &quot;Recovery Vector&quot; calculates exactly how many consecutive sessions a student must attend to stabilize their presence matrix.
          </p>
        </div>
      </div>

      {/* Alert List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">crunching data arrays...</p>
          </div>
        ) : !selectedBatch ? (
          <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50">
             <Search className="w-16 h-16 text-slate-200 mx-auto mb-6" />
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Selection Required</p>
             <p className="text-slate-500 mt-2 text-sm font-medium">Select a batch above to initialize the AI Shortage Analysis.</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="py-24 text-center border border-slate-100 rounded-[2.5rem] bg-emerald-50/50">
             <Check className="w-16 h-16 text-emerald-300 mx-auto mb-6" />
             <p className="text-sm font-bold text-emerald-600 uppercase tracking-widest">Clean Matrix</p>
             <p className="text-emerald-500 mt-2 text-sm font-medium">Zero shortage alerts detected for the selected batch. Excellence achieved.</p>
          </div>
        ) : (
          alerts.map((alert, idx) => {
            const risk = riskConfig[alert.riskLevel];
            return (
              <motion.div
                key={alert.studentId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "border rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-md",
                  risk.bg, risk.border
                )}
              >
                <div className="flex items-center gap-5">
                   <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner", risk.badge)}>
                      {risk.icon}
                   </div>
                   <div>
                      <div className="flex items-center gap-3 mb-1">
                         <h3 className="text-lg font-black text-slate-900 leading-tight">{alert.name}</h3>
                         <span className={cn("text-[9px] font-black px-2 py-1 rounded-lg tracking-widest", risk.badge)}>
                            {risk.label}
                         </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-80">ID# {alert.uniqueId} · System Node</p>
                   </div>
                </div>

                <div className="flex-1 max-w-sm">
                   <div className="flex justify-between items-end mb-2">
                      <span className="text-2xl font-black text-slate-900 leading-none">{alert.percentage}%</span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{alert.presentCount} / {alert.totalClasses} SESSIONS</span>
                   </div>
                   <div className="h-2 bg-white/60 rounded-full overflow-hidden shadow-inner">
                      <motion.div
                        className={cn("h-full rounded-full transition-all", risk.bar)}
                        initial={{ width: 0 }}
                        animate={{ width: `${alert.percentage}%` }}
                        transition={{ delay: idx * 0.05 + 0.2, duration: 1 }}
                      />
                   </div>
                   <div className="flex items-center gap-1.5 mt-3 text-slate-500">
                      <TrendingDown size={14} className={cn(risk.label === 'CRITICAL' ? "text-rose-500" : "text-amber-500")} />
                      <p className="text-[10px] font-bold uppercase tracking-wider">
                        Needs <span className="font-black text-slate-900">{alert.classesNeededToRecover}</span> consecutive sessions to hit 75%
                      </p>
                   </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatPill({ label, count, color, bg }: any) {
  return (
    <div className={cn("px-5 py-2.5 rounded-2xl border flex items-center gap-3 shadow-sm", bg, color.replace('text', 'border'))}>
       <span className={cn("text-2xl font-black", color)}>{count}</span>
       <span className="text-[9px] font-black uppercase tracking-widest opacity-60 leading-tight">{label}</span>
    </div>
  );
}
