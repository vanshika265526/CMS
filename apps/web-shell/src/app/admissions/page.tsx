// FILE: apps/web-shell/src/app/admissions/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { getAdmissionsReport } from "@/lib/api/admissions";
import { 
  Users, 
  FileText, 
  CheckCircle, 
  PieChart, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Loader2
} from "lucide-react";
import Link from "next/link";
import EnquiryForm from "@/components/admissions/EnquiryForm";

export default function AdmissionsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showEnquiryForm, setShowEnquiryForm] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await getAdmissionsReport();
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error("Failed to fetch admissions stats", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex bg-surface-container-low h-[400px] items-center justify-center rounded-2xl border border-dashed border-outline-variant">
        <Loader2 className="animate-spin text-primary-indigo" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-on-surface">Admissions Management</h1>
          <p className="text-sm text-on-surface/40 mt-1">Lifecycle tracking from enquiry to seat allocation</p>
        </div>
        <button 
          onClick={() => setShowEnquiryForm(true)}
          className="bg-white text-black border-2 border-primary-indigo px-6 py-3 rounded-xl font-bold text-sm shadow-ambient flex items-center gap-2 hover:bg-surface-container-low active:scale-95 transition-all"
        >
          <Plus size={18} className="text-primary-indigo" />
          <span>New Enquiry</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Enquiries" 
          value={stats?.totalEnquiries || 0} 
          icon={<Users size={20} />} 
          color="bg-primary-indigo" 
        />
        <StatCard 
          title="Pending Apps" 
          value={stats?.pendingApps || 0} 
          icon={<FileText size={20} />} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Seats Filled %" 
          value={`${stats?.fillRate?.toFixed(1) || 0}%`} 
          icon={<PieChart size={20} />} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Admitted (Month)" 
          value={stats?.admittedThisMonth || 0} 
          icon={<TrendingUp size={20} />} 
          color="bg-indigo-600" 
        />
      </div>

      {/* Module Hub Link Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <HubLinkCard 
          title="Enquiry CRM" 
          description="Manage walk-in and online leads, track follow-ups and notes."
          href="/admissions/enquiries"
          icon={<Users className="text-blue-500" size={24} />}
        />
        <HubLinkCard 
          title="Application Portal" 
          description="Process admissions, review documents and approve seats."
          href="/admissions/applications"
          icon={<FileText className="text-amber-500" size={24} />}
        />
        <HubLinkCard 
          title="Seat Matrix" 
          description="Visual visualization of course-wise and batch-wise seat fill levels."
          href="/admissions/seats"
          icon={<PieChart className="text-emerald-500" size={24} />}
        />
      </div>

      {/* Enquiry Form Modal */}
      {showEnquiryForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
          <EnquiryForm onSuccess={fetchStats} onClose={() => setShowEnquiryForm(false)} />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  return (
    <Card className="p-6 border-none bg-surface-container-lowest group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 ${color} text-white rounded-xl flex items-center justify-center shadow-lg`}>
          {icon}
        </div>
      </div>
      <h3 className="text-xs font-bold text-on-surface/40 uppercase tracking-widest mb-1">{title}</h3>
      <span className="text-2xl font-display font-bold text-on-surface">{value}</span>
    </Card>
  );
}

function HubLinkCard({ title, description, href, icon }: any) {
  return (
    <Link href={href} className="group">
      <Card className="p-8 h-full bg-surface-container-low border-none group-hover:bg-white group-hover:shadow-ambient transition-all duration-300 relative overflow-hidden">
        <div className="relative z-10 flex flex-col h-full">
          <div className="mb-6">{icon}</div>
          <h3 className="text-xl font-display font-bold text-on-surface mb-3 group-hover:text-primary-indigo transition-colors">{title}</h3>
          <p className="text-sm text-on-surface/40 leading-relaxed mb-6 flex-1">{description}</p>
          <div className="flex items-center gap-2 text-xs font-bold text-on-surface/20 group-hover:text-primary-indigo transition-all">
            MANAGE MODULE <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-indigo-gradient/5 rounded-full blur-2xl group-hover:bg-indigo-gradient/10 transition-all duration-700" />
      </Card>
    </Link>
  );
}
