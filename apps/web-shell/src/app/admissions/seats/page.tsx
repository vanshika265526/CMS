// FILE: apps/web-shell/src/app/admissions/seats/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSeats, configureSeats } from "@/lib/api/admissions";
import { fetchCourses } from "@/lib/api/admin";
import SeatMatrix from "@/components/admissions/SeatMatrix";
import { ChevronRight, Settings, Loader2, X, Search, RefreshCw, SlidersHorizontal, CircleCheckBig, CircleDashed } from "lucide-react";
import Card from "@/components/ui/Card";

export default function SeatsPage() {
  const [seats, setSeats] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [editingSeat, setEditingSeat] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [configData, setConfigData] = useState({
    course: "",
    batch: "2024-2028",
    totalSeats: 60,
    reservedSeats: { General: 30, OBC: 15, SC: 9, ST: 6 }
  });

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const [seatsRes, coursesRes] = await Promise.all([getSeats(), fetchCourses()]);
      if (seatsRes.success) setSeats(seatsRes.data || []);
      setCourses(Array.isArray(coursesRes) ? coursesRes : coursesRes?.data || []);
    } catch (err) {
      console.error("Failed to fetch seats", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await configureSeats(configData);
      if (res.success) {
        setMessage("Seat configuration saved successfully.");
        await loadData(true);
        setShowConfig(false);
        setEditingSeat(null);
      }
    } catch (err) {
      setMessage("Unable to configure seats right now.");
    }
  };

  const handleEditSeat = (seat: any) => {
    setEditingSeat(seat);
    setConfigData({
      course: seat.course || "",
      batch: seat.batch || "2024-2028",
      totalSeats: Number(seat.totalSeats || 0),
      reservedSeats: {
        General: Number(seat.reservedSeats?.General || 0),
        OBC: Number(seat.reservedSeats?.OBC || 0),
        SC: Number(seat.reservedSeats?.SC || 0),
        ST: Number(seat.reservedSeats?.ST || 0),
      }
    });
    setShowConfig(true);
  };

  const filteredSeats = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return seats;
    return seats.filter((seat) => {
      const haystack = `${seat.course || ""} ${seat.batch || ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [seats, searchTerm]);

  const summary = useMemo(() => {
    const totalSeats = seats.reduce((sum, seat) => sum + Number(seat.totalSeats || 0), 0);
    const filledSeats = seats.reduce((sum, seat) => sum + Number(seat.filledSeats || 0), 0);
    const availableSeats = Math.max(totalSeats - filledSeats, 0);
    const utilization = totalSeats > 0 ? (filledSeats / totalSeats) * 100 : 0;
    return { totalSeats, filledSeats, availableSeats, utilization };
  }, [seats]);

  return (
    <div className="space-y-6">
      {message ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{message}</div>
      ) : null}

      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-utility font-bold text-on-surface/30 uppercase tracking-widest mb-1">
            Admissions <ChevronRight size={12} className="text-on-surface/20" /> Seat Matrix
          </div>
          <h1 className="text-2xl font-display font-bold text-on-surface">Live Seat Allocation</h1>
          <p className="text-sm text-on-surface/40 mt-1 max-w-2xl">Use this screen to view configured seat availability by course and batch, then update the matrix using real course records from the portal.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => loadData(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white text-on-surface/60 hover:text-primary-indigo hover:bg-surface-container-low border border-outline-variant/30 rounded-xl transition-all font-bold text-xs"
          >
            {refreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} Refresh
          </button>
          <button 
            onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-low text-on-surface/60 hover:text-primary-indigo hover:bg-white border border-outline-variant/30 rounded-xl transition-all font-bold text-xs"
          >
            <Settings size={16} /> Configure Matrix
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Configured Rows" value={String(seats.length)} accent="blue" description="Course/batch combinations" />
        <MetricCard label="Total Seats" value={String(summary.totalSeats)} accent="indigo" description="Across the whole matrix" />
        <MetricCard label="Filled Seats" value={String(summary.filledSeats)} accent="emerald" description="Currently occupied seats" />
        <MetricCard label="Availability" value={`${summary.utilization.toFixed(0)}%`} accent="amber" description={`${summary.availableSeats} seats open`} />
      </div>

      <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-black text-slate-900">Matrix Filters</h2>
            <p className="text-sm text-slate-500">Search the configured rows by course or batch.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <SlidersHorizontal size={14} /> Live summary
          </div>
        </div>

        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:bg-white focus-within:border-indigo-300 transition-all max-w-2xl">
          <Search size={15} className="text-slate-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search course or batch"
            className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
          />
        </label>
      </Card>

      {loading ? (
        <div className="h-100 flex items-center justify-center bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant">
          <Loader2 className="animate-spin text-primary-indigo" size={32} />
        </div>
      ) : (
        <SeatMatrix seats={filteredSeats} onEditSeat={handleEditSeat} />
      )}

      {/* Config Modal */}
      {showConfig && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
          <Card className="max-w-md w-full p-8 bg-surface-container-lowest border-none shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setShowConfig(false);
                setEditingSeat(null);
              }}
              className="absolute right-4 top-4 p-2 text-on-surface/30 hover:text-on-surface"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-display font-bold text-on-surface mb-6">{editingSeat ? "Edit Seats" : "Configure Seats"}</h3>
            <form onSubmit={handleConfigure} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-on-surface/40 uppercase mb-1 block tracking-widest">Course Name</label>
                <select
                  required
                  className="w-full bg-surface-container-low border-transparent focus:border-primary-indigo/30 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none border transition-all"
                  value={configData.course}
                  onChange={e => setConfigData({...configData, course: e.target.value})}
                  disabled={Boolean(editingSeat)}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course.name}>
                      {course.name}{course.code ? ` (${course.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-on-surface/40 uppercase mb-1 block tracking-widest">Total Seats</label>
                  <input 
                    type="number"
                    className="w-full bg-surface-container-low border-transparent focus:border-primary-indigo/30 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none border transition-all"
                    value={configData.totalSeats}
                    onChange={e => setConfigData({...configData, totalSeats: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-on-surface/40 uppercase mb-1 block tracking-widest">Batch</label>
                  <input 
                    className="w-full bg-surface-container-low border-transparent focus:border-primary-indigo/30 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none border transition-all"
                    value={configData.batch}
                    onChange={e => setConfigData({...configData, batch: e.target.value})}
                    disabled={Boolean(editingSeat)}
                  />
                </div>
              </div>
              <div className="p-4 bg-surface-container-low rounded-xl">
                 <p className="text-[10px] font-bold text-on-surface/30 uppercase mb-3">Reservation Distribution</p>
                 <div className="grid grid-cols-2 gap-4">
                    <ReservationInput label="General" value={configData.reservedSeats.General} onChange={(v) => setConfigData({...configData, reservedSeats: {...configData.reservedSeats, General: v}})} />
                    <ReservationInput label="OBC" value={configData.reservedSeats.OBC} onChange={(v) => setConfigData({...configData, reservedSeats: {...configData.reservedSeats, OBC: v}})} />
                    <ReservationInput label="SC" value={configData.reservedSeats.SC} onChange={(v) => setConfigData({...configData, reservedSeats: {...configData.reservedSeats, SC: v}})} />
                    <ReservationInput label="ST" value={configData.reservedSeats.ST} onChange={(v) => setConfigData({...configData, reservedSeats: {...configData.reservedSeats, ST: v}})} />
                 </div>
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-gradient text-white rounded-xl font-bold text-sm shadow-xl active:scale-[0.98] transition-all mt-4">
                Update Seat Matrix
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, description, accent }: { label: string; value: string; description: string; accent: string }) {
  const accents: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600",
    indigo: "bg-indigo-500/10 text-indigo-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
  };

  return (
    <Card className="p-4 border border-slate-200 bg-white shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${accents[accent]}`}>Live</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </Card>
  );
}

function ReservationInput({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-[8px] font-bold text-on-surface/40 uppercase block mb-1">{label}</label>
      <input 
        type="number"
        className="w-full bg-white border-outline-variant/30 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary-indigo/30 border transition-all"
        value={value}
        onChange={e => onChange(parseInt(e.target.value))}
      />
    </div>
  )
}
