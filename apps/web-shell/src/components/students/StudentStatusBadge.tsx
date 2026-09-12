import React from "react";

interface StatusBadgeProps {
  status: "active" | "inactive" | "graduated" | "dropped";
}

const statusConfig: Record<string, { label: string; classes: string }> = {
  active: { label: "Active", classes: "bg-emerald-50 text-emerald-600 border-emerald-200" },
  inactive: { label: "Inactive", classes: "bg-amber-50 text-amber-600 border-amber-200" },
  graduated: { label: "Graduated", classes: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  dropped: { label: "Dropped", classes: "bg-rose-50 text-rose-600 border-rose-200" },
};

export default function StudentStatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, classes: "bg-slate-50 text-slate-500 border-slate-200" };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] bg-white font-bold uppercase tracking-wider border shadow-sm ${config.classes}`}>
      {config.label}
    </span>
  );
}
