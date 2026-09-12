"use client";

import React from "react";

export default function TeacherLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Skeleton Top Header */}
      <div className="h-10 w-64 bg-slate-200 rounded-lg"></div>
      
      {/* Dashboard Stats Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-2xl border border-slate-200"></div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[500px] bg-slate-100 rounded-2xl border border-slate-200"></div>
        <div className="h-[500px] bg-slate-100 rounded-2xl border border-slate-200"></div>
      </div>
    </div>
  );
}
