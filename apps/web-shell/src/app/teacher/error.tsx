"use client";

import React from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function TeacherError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center space-y-6">
      <div className="p-4 rounded-full bg-red-50 text-red-600">
        <AlertCircle size={48} />
      </div>
      
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-slate-500 max-w-md">
          {error.message || "An unexpected error occurred in the teacher portal. Please try again or return to dashboard."}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium"
        >
          <RotateCcw size={18} />
          Try Again
        </button>
        <Link
          href="/teacher"
          className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all font-medium"
        >
          <Home size={18} />
          Back to Portal
        </Link>
      </div>
    </div>
  );
}
