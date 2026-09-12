// FILE: apps/web-shell/src/components/admissions/AdmissionStatusBadge.tsx
import React from "react";

interface StatusBadgeProps {
  status: string;
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  // Enquiry Statuses
  new: { label: "New", classes: "bg-surface-container-high text-on-surface border-outline-variant" },
  New: { label: "New", classes: "bg-surface-container-high text-on-surface border-outline-variant" },
  Contacted: { label: "Contacted", classes: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  Interested: { label: "Interested", classes: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" },
  applied: { label: "Applied", classes: "bg-black/10 text-black border-black/20" },
  admitted: { label: "Admitted", classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  NotInterested: { label: "Not Interested", classes: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  rejected: { label: "Rejected", classes: "bg-red-500/10 text-red-500 border-red-500/20" },
  // Application Statuses
  pending: { label: "Pending", classes: "bg-surface-container-high text-on-surface/60 border-outline-variant" },
  "under-review": { label: "Under Review", classes: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  approved: { label: "Approved", classes: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};

export default function AdmissionStatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, classes: "bg-gray-500/10 text-gray-500 border-gray-500/20" };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${config.classes}`}>
      {config.label}
    </span>
  );
}
