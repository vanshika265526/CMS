"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface GradeBadgeProps {
  grade: string;
  className?: string;
}

export default function GradeBadge({ grade, className }: GradeBadgeProps) {
  const getStyles = (grade: string) => {
    switch (grade) {
      case 'A+': return "bg-green-100 text-green-700 border-green-200";
      case 'A':  return "bg-green-50 text-green-600 border-green-100";
      case 'B':  return "bg-indigo-50 text-indigo-600 border-indigo-100";
      case 'C':  return "bg-amber-50 text-amber-600 border-amber-100";
      case 'D':  return "bg-orange-50 text-orange-600 border-orange-100";
      case 'F':  return "bg-red-100 text-red-700 border-red-200";
      default:   return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-black tracking-widest border uppercase shadow-sm inline-block",
      getStyles(grade),
      className
    )}>
      {grade}
    </span>
  );
}
