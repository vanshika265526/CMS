// FILE: apps/web-shell/src/app/students/new/page.tsx
"use client";

import React from "react";
import StudentForm from "@/components/students/StudentForm";
import { ChevronLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewStudentPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="flex items-center justify-between">
        <div>
           <Link 
             href="/students" 
             className="flex items-center gap-2 text-[10px] font-utility font-bold text-on-surface/30 uppercase tracking-[0.2em] mb-2 hover:text-primary-indigo transition-colors"
           >
             <ChevronLeft size={12} /> Back to Directory
           </Link>
           <h1 className="text-3xl font-display font-bold text-on-surface tracking-tight flex items-center gap-4">
             <UserPlus className="text-primary-indigo" size={32} />
             Student Enrollment
           </h1>
        </div>
      </header>

      <StudentForm onSuccess={() => router.push("/students")} />
    </div>
  );
}
