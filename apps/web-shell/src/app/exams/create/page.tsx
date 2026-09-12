"use client";

import React, { useState, useEffect } from "react";
import ExamForm from "@/components/exams/ExamForm";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function CreateExamPage() {
  const router = useRouter();
  const [collegeId, setCollegeId] = useState<string>("");

  useEffect(() => {
    const isValidObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      // Role check
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'COLLEGE_ADMIN' && user.role !== 'TEACHER') {
        router.push("/exams/results");
        return;
      }
      const id = user.collegeId;
      setCollegeId((id && isValidObjectId(id)) ? id : "69c6a87042c1f53f6f59b964");
    }
  }, [router]);

  const handleSuccess = () => {
    router.push("/exams");
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex items-center gap-4">
        <Link 
          href="/exams"
          className="p-2.5 bg-surface-container hover:bg-surface-container-high text-surface-on-surface-variant rounded-xl transition-all border border-outline"
        >
          <ChevronLeft size={20} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-surface-on-surface tracking-tight">Create New Exam</h1>
          <p className="text-sm text-surface-on-surface-variant mt-1">Define exam details, courses, and grading scheme</p>
        </div>
      </div>

      <ExamForm collegeId={collegeId} onSuccess={handleSuccess} />
    </div>
  );
}
