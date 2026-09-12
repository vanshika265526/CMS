"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, RefreshCw, Users, FileText, ListFilter, ArrowRight, Clock3, Search, SlidersHorizontal, CircleCheckBig, CircleDashed, X } from "lucide-react";
import Card from "@/components/ui/Card";
import EnquiryKanbanBoard from "@/components/admissions/EnquiryKanbanBoard";
import EnquiryForm from "@/components/admissions/EnquiryForm";
import ApplicationDrawer from "@/components/admissions/ApplicationDrawer";
import EnquiryDrawer from "@/components/admissions/EnquiryDrawer";
import { fetchBatches, fetchCourses, fetchDashboardStats } from "@/lib/api/admin";
import { configureSeats, getAdmissionsReport, getApplications, getEnquiries, getSeats, updateEnquiryStatus } from "@/lib/api/admissions";

export default function AdmissionsPage() {
  const [view, setView] = useState<"board" | "list">("board");
  const [showNewEnquiry, setShowNewEnquiry] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [seats, setSeats] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showSeatConfig, setShowSeatConfig] = useState(false);
  const [editingSeat, setEditingSeat] = useState<any>(null);
  const [savingSeat, setSavingSeat] = useState(false);
  const [seatConfigData, setSeatConfigData] = useState({
    course: "",
    batch: "2024-2028",
    totalSeats: 60,
    reservedSeats: { General: 30, OBC: 15, SC: 9, ST: 6 },
  });

  const loadData = async (silent = false) => {
    try {
      silent ? setRefreshing(true) : setLoading(true);
      const [reportRes, enquiriesRes, applicationsRes, dashboardRes, coursesRes, batchesRes] = await Promise.all([
        getAdmissionsReport(),
        getEnquiries(),
        getApplications(),
        fetchDashboardStats(),
        fetchCourses(),
        fetchBatches(),
      ]);
      const seatsRes = await getSeats();

      if (reportRes?.success) setReport(reportRes.data);
      if (enquiriesRes?.success) setEnquiries(enquiriesRes.data || []);
      if (applicationsRes?.success) setApplications(applicationsRes.data || []);
      if (seatsRes?.success) setSeats(seatsRes.data || []);
      if (dashboardRes?.success) setDashboardStats(dashboardRes.data || null);
      setCourses(Array.isArray(coursesRes) ? coursesRes : coursesRes?.data || []);
      setBatches(Array.isArray(batchesRes) ? batchesRes : batchesRes?.data || []);
      setLastUpdated(new Date().toLocaleString());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const stageCounts = useMemo(() => {
    const base = { New: 0, Contacted: 0, Interested: 0, applied: 0, admitted: 0, NotInterested: 0 };
    enquiries.forEach((enquiry) => {
      if (enquiry?.status && enquiry.status in base) {
        (base as any)[enquiry.status] += 1;
      }
    });
    return base;
  }, [enquiries]);

  const recentApplications = applications.slice(0, 5);

  const exportEnquiriesCsv = () => {
    const headers = ["Name", "Email", "Phone", "Course", "Source", "Status", "Created At"];
    const rows = filteredEnquiries.map((enquiry) => {
      const courseName = typeof enquiry.courseInterest === 'string' ? enquiry.courseInterest : enquiry.courseInterest?.name || '';
      return [
        enquiry.name || "",
        enquiry.email || "",
        enquiry.phone || "",
        courseName,
        enquiry.source || "",
        enquiry.status || "",
        enquiry.createdAt ? new Date(enquiry.createdAt).toISOString() : "",
      ];
    });

    const escapeCell = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `admissions-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredEnquiries = useMemo(() => {
    return enquiries.filter((enquiry) => {
      const courseName = typeof enquiry.courseInterest === 'string' ? enquiry.courseInterest : enquiry.courseInterest?.name || '';
      const haystack = `${enquiry.name || ''} ${enquiry.email || ''} ${enquiry.phone || ''} ${courseName}`.toLowerCase();
      const matchesSearch = !searchTerm.trim() || haystack.includes(searchTerm.trim().toLowerCase());
      const matchesStatus = statusFilter === 'all' || enquiry.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || enquiry.source === sourceFilter;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [enquiries, searchTerm, statusFilter, sourceFilter]);

  const seatSummary = useMemo(() => {
    const matrixTotalSeats = seats.reduce((sum, seat) => sum + Number(seat.totalSeats || 0), 0);
    const matrixFilledSeats = seats.reduce((sum, seat) => sum + Number(seat.filledSeats || 0), 0);
    const courseCapacity = courses.reduce((sum, course) => sum + Number(course.totalSeats || 0), 0);
    const activeStudents = Number(dashboardStats?.totalStudents || 0);

    const totalSeats = matrixTotalSeats > 0 ? matrixTotalSeats : courseCapacity;
    const filledSeats = matrixTotalSeats > 0 ? matrixFilledSeats : activeStudents;
    const utilization = totalSeats > 0 ? (filledSeats / totalSeats) * 100 : 0;
    const source = matrixTotalSeats > 0 ? "seat matrix" : "courses + active students";

    return { totalSeats, filledSeats, utilization, source };
  }, [seats, courses, dashboardStats]);

  const handleStatusChange = async (id: string, newStatus: string): Promise<boolean> => {
    try {
      const res = await updateEnquiryStatus(id, newStatus, `Moved to ${newStatus} from admissions board`);
      if (res.success) {
        await loadData(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const openCreateSeatConfig = () => {
    setEditingSeat(null);
    setSeatConfigData({
      course: "",
      batch: "2024-2028",
      totalSeats: 60,
      reservedSeats: { General: 30, OBC: 15, SC: 9, ST: 6 },
    });
    setShowSeatConfig(true);
  };

  const openEditSeatConfig = (seat: any) => {
    setEditingSeat(seat);
    setSeatConfigData({
      course: seat.course || "",
      batch: seat.batch || "2024-2028",
      totalSeats: Number(seat.totalSeats || 0),
      reservedSeats: {
        General: Number(seat.reservedSeats?.General || 0),
        OBC: Number(seat.reservedSeats?.OBC || 0),
        SC: Number(seat.reservedSeats?.SC || 0),
        ST: Number(seat.reservedSeats?.ST || 0),
      },
    });
    setShowSeatConfig(true);
  };

  const closeSeatConfig = () => {
    setShowSeatConfig(false);
    setEditingSeat(null);
  };

  const handleSeatConfigSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSeat(true);
    try {
      const payload = {
        ...seatConfigData,
        totalSeats: Number(seatConfigData.totalSeats || 0),
        reservedSeats: {
          General: Number(seatConfigData.reservedSeats.General || 0),
          OBC: Number(seatConfigData.reservedSeats.OBC || 0),
          SC: Number(seatConfigData.reservedSeats.SC || 0),
          ST: Number(seatConfigData.reservedSeats.ST || 0),
        },
      };

      const response = await configureSeats(payload);
      if (response?.success) {
        await loadData(true);
        closeSeatConfig();
      }
    } finally {
      setSavingSeat(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase font-sans">Admissions Funnel</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Manage the live pipeline from enquiry capture to seat allocation</p>
          <p className="mt-3 max-w-3xl text-sm text-slate-500">
            This page is the operational view for admissions staff. Use it to create enquiries, move prospects through the funnel, review applications, and monitor seat-fill progress in real time.
          </p>
        </div>

        <div className="flex items-center gap-3">
           <button 
             onClick={() => loadData(true)}
             className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
           >
              {refreshing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Refresh
           </button>
           <button 
             onClick={() => setView(view === "board" ? "list" : "board")}
             className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
           >
              <ListFilter size={14} /> {view === "board" ? "List View" : "Board View"}
           </button>
            <button onClick={() => setShowNewEnquiry(true)} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center gap-2">
              <Plus size={14} /> New Enquiry
           </button>
              <button onClick={exportEnquiriesCsv} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
                Export CSV
              </button>
        </div>
      </div>

      {/* Quick Stats Mini-Bar */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
         <MiniStat label="Total Enquiries" value={String(report?.totalEnquiries || enquiries.length || 0)} trend={`New: ${report?.newEnquiries || stageCounts.New}`} color="blue" />
         <MiniStat label="Pending Apps" value={String(report?.pendingApps || 0)} trend={`Approved: ${report?.approvedApps || 0}`} color="amber" />
        <MiniStat label="Fill Rate" value={`${Number(report?.fillRate || 0).toFixed(1)}%`} trend={`Admitted: ${report?.admittedEnquiries || 0}`} color="emerald" />
         <MiniStat label="This Month" value={String(report?.admittedThisMonth || 0)} trend={`Updated: ${lastUpdated || "--"}`} color="indigo" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "New", value: stageCounts.New },
          { label: "Contacted", value: stageCounts.Contacted },
          { label: "Interested", value: stageCounts.Interested },
          { label: "Applied", value: stageCounts.applied },
          { label: "Admitted", value: stageCounts.admitted },
          { label: "Not Interested", value: stageCounts.NotInterested },
        ].map((item) => (
          <Card key={item.label} className="p-4 border border-slate-200 shadow-sm bg-white flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{item.value}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
              <Users size={18} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-5 border border-slate-200 bg-white shadow-sm xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Admissions Controls</h2>
              <p className="text-sm text-slate-500">Search and narrow the live funnel without leaving the page.</p>
            </div>
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <SlidersHorizontal size={14} /> Live filters
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <label className="md:col-span-2 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:bg-white focus-within:border-indigo-300 transition-all">
              <Search size={15} className="text-slate-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, email, phone, or course"
                className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
              />
            </label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-300">
              <option value="all">All statuses</option>
              <option value="New">New</option>
              <option value="Contacted">Contacted</option>
              <option value="Interested">Interested</option>
              <option value="applied">Applied</option>
              <option value="admitted">Admitted</option>
              <option value="NotInterested">Not Interested</option>
            </select>
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:bg-white focus:border-indigo-300">
              <option value="all">All sources</option>
              <option value="online">Online</option>
              <option value="walkin">Walk-in</option>
              <option value="referral">Referral</option>
              <option value="other">Other</option>
            </select>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 bg-white shadow-sm space-y-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Seat Health</h2>
            <p className="text-sm text-slate-500">Live seat availability from the seat matrix.</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{seatSummary.totalSeats}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filled</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{seatSummary.filledSeats}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usage</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{seatSummary.utilization.toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
            <CircleCheckBig size={14} className="text-emerald-500" /> Real data from {seatSummary.source}
          </div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
            <CircleDashed size={14} className="text-amber-500" /> {seats.length > 0 ? `${seats.length} configured matrix rows` : `${courses.length} courses, ${batches.length} batches`} 
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={openCreateSeatConfig}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
            >
              Configure Seats
            </button>
            {seats.slice(0, 2).map((seat) => (
              <button
                key={seat._id}
                onClick={() => openEditSeatConfig(seat)}
                className="px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-[10px] font-black uppercase tracking-widest text-indigo-700 hover:bg-indigo-100"
              >
                Edit {seat.course} / {seat.batch}
              </button>
            ))}
          </div>
          {seats.length === 0 && (
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              No seat matrix rows yet, so this card is derived from live course capacity and active student count.
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card className="xl:col-span-2 p-6 border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900">Admission Workflow</h2>
              <p className="text-sm text-slate-500">Drag enquiries through the pipeline. Status changes are saved to the backend.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <Clock3 size={14} /> {lastUpdated ? `Updated ${lastUpdated}` : "Waiting for data"}
            </div>
          </div>

          {loading ? (
            <div className="h-80 flex items-center justify-center text-slate-400">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : (
            <div className="overflow-x-auto pb-2">
              <EnquiryKanbanBoard initialEnquiries={filteredEnquiries} onStatusChange={handleStatusChange} onNewEnquiryClick={() => setShowNewEnquiry(true)} onEnquiryClick={(enquiry) => setSelectedEnquiry(enquiry)} />
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6 border border-slate-200 bg-white shadow-sm">
            <h2 className="text-lg font-black text-slate-900 mb-2">What this page does</h2>
            <ol className="space-y-3 text-sm text-slate-600">
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black">1</span> Capture a new enquiry with a real course and lead source.</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black">2</span> Move the record through contact, interest, application, and admission stages.</li>
              <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black">3</span> Review applications, approve seats, and track fill rate from the backend.</li>
            </ol>
          </Card>

          <Card className="p-6 border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">Recent Applications</h2>
                <p className="text-sm text-slate-500">Open the full application drawer to approve or reject.</p>
              </div>
              <Link href="/admissions/applications" className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-3">
              {recentApplications.length ? recentApplications.map((app) => (
                <button key={app._id} onClick={() => setSelectedApp(app)} className="w-full text-left rounded-2xl border border-slate-200 p-4 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900 text-sm">{app.studentDetails?.firstName} {app.studentDetails?.lastName}</p>
                      <p className="text-xs text-slate-500">{app.assignedCourse} • {app.assignedBatch}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{app.status}</span>
                  </div>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No applications yet</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Main Board Area */}
      <div className="min-h-60">
        {view === "list" ? (
          <Card className="p-6 border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-slate-900">Latest Enquiries</h2>
              <button onClick={() => setShowNewEnquiry(true)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600">New Enquiry</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-slate-400 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="text-left py-3">Name</th>
                    <th className="text-left py-3">Course</th>
                    <th className="text-left py-3">Source</th>
                    <th className="text-left py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnquiries.slice(0, 10).map((enquiry) => (
                    <tr key={enquiry._id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedEnquiry(enquiry)}>
                      <td className="py-3 font-semibold text-slate-900">{enquiry.name}</td>
                      <td className="py-3 text-slate-600">{typeof enquiry.courseInterest === 'string' ? enquiry.courseInterest : enquiry.courseInterest?.name || '-'}</td>
                      <td className="py-3 text-slate-600">{enquiry.source}</td>
                      <td className="py-3 text-slate-600">{enquiry.status}</td>
                    </tr>
                  ))}
                  {!filteredEnquiries.length && (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-400">No enquiries recorded yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </div>

      {showNewEnquiry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowNewEnquiry(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <EnquiryForm onSuccess={() => loadData(true)} onClose={() => setShowNewEnquiry(false)} />
          </div>
        </div>
      )}

      {selectedApp && (
        <ApplicationDrawer
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdate={() => loadData(true)}
        />
      )}

      {selectedEnquiry && (
        <EnquiryDrawer
          enquiry={selectedEnquiry}
          onClose={() => setSelectedEnquiry(null)}
          onUpdate={() => loadData(true)}
        />
      )}

      {showSeatConfig && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
          <Card className="max-w-md w-full p-8 bg-white border border-slate-200 shadow-2xl relative">
            <button
              type="button"
              onClick={closeSeatConfig}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-slate-700"
            >
              <X size={20} />
            </button>
            <h3 className="text-xl font-black text-slate-900 mb-6">{editingSeat ? "Edit Seats" : "Configure Seats"}</h3>
            <form onSubmit={handleSeatConfigSave} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Course</label>
                <select
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-300 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  value={seatConfigData.course}
                  onChange={(e) => setSeatConfigData({ ...seatConfigData, course: e.target.value })}
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
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Total Seats</label>
                  <input
                    type="number"
                    min={0}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-300 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    value={seatConfigData.totalSeats}
                    onChange={(e) => setSeatConfigData({ ...seatConfigData, totalSeats: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-widest">Batch</label>
                  <input
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-300 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none transition-all"
                    value={seatConfigData.batch}
                    onChange={(e) => setSeatConfigData({ ...seatConfigData, batch: e.target.value })}
                    disabled={Boolean(editingSeat)}
                  />
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Reservation Distribution</p>
                <div className="grid grid-cols-2 gap-4">
                  <ReservationInput label="General" value={seatConfigData.reservedSeats.General} onChange={(v: number) => setSeatConfigData({ ...seatConfigData, reservedSeats: { ...seatConfigData.reservedSeats, General: v } })} />
                  <ReservationInput label="OBC" value={seatConfigData.reservedSeats.OBC} onChange={(v: number) => setSeatConfigData({ ...seatConfigData, reservedSeats: { ...seatConfigData.reservedSeats, OBC: v } })} />
                  <ReservationInput label="SC" value={seatConfigData.reservedSeats.SC} onChange={(v: number) => setSeatConfigData({ ...seatConfigData, reservedSeats: { ...seatConfigData.reservedSeats, SC: v } })} />
                  <ReservationInput label="ST" value={seatConfigData.reservedSeats.ST} onChange={(v: number) => setSeatConfigData({ ...seatConfigData, reservedSeats: { ...seatConfigData.reservedSeats, ST: v } })} />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingSeat}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-sm shadow-xl disabled:opacity-60"
              >
                {savingSeat ? "Saving..." : "Save Seat Matrix"}
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, trend, color }: { label: string, value: string, trend: string, color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    emerald: "bg-emerald-500",
    indigo: "bg-indigo-500"
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
       <div className="space-y-0.5">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
          <p className="text-lg font-black text-slate-900 tracking-tighter">{value}</p>
       </div>
       <div className="text-right space-y-0.5">
          <div className={cn("inline-block px-1.5 py-0.5 rounded-md text-[8px] font-black text-white uppercase tracking-tighter", colors[color])}>
             {trend}
          </div>
       </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

function ReservationInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div>
      <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{label}</label>
      <input
        type="number"
        min={0}
        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-indigo-300"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
