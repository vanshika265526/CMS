"use client";

import React, { useEffect, useState } from "react";
import { createEnquiry } from "@/lib/api/admissions";
import { fetchCourses } from "@/lib/api/admin";
import { X, Loader2 } from "lucide-react";

interface EnquiryFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

export default function EnquiryForm({ onSuccess, onClose }: EnquiryFormProps) {
  const [loading, setLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    courseInterest: "",
    source: "online",
    notes: "",
  });

  useEffect(() => {
    const loadCourses = async () => {
      try {
        setCoursesLoading(true);
        const res = await fetchCourses();
        setCourses(Array.isArray(res) ? res : res?.data || []);
      } catch {
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };

    void loadCourses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        courseInterest: formData.courseInterest,
        source: formData.source,
        ...(formData.notes.trim() ? { notes: formData.notes.trim() } : {}),
      };

      const res = await createEnquiry(payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || "Failed to create enquiry");
      }
    } catch (err) {
      setError("Failed to create enquiry");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full relative z-50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-slate-900">New Admission Enquiry</h3>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-all">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Full Name</label>
          <input
            required
            type="text"
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl px-4 py-2.5 text-sm outline-none text-slate-800"
            placeholder="e.g. Rahul Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Phone Number</label>
            <input
              required
              type="tel"
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl px-4 py-2.5 text-sm outline-none text-slate-800"
              placeholder="+91 98765-43210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Email Address</label>
            <input
              required
              type="email"
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl px-4 py-2.5 text-sm outline-none text-slate-800"
              placeholder="rahul@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Course Interested</label>
          <select
            required
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl px-4 py-2.5 text-sm outline-none text-slate-800 appearance-none"
            value={formData.courseInterest}
            onChange={(e) => setFormData({ ...formData, courseInterest: e.target.value })}
            disabled={coursesLoading}
          >
            <option value="">{coursesLoading ? "Loading courses..." : "Select a Course"}</option>
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.name}{course.code ? ` (${course.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Lead Source</label>
          <div className="flex gap-4">
            {[
              { value: "online", label: "Online" },
              { value: "walkin", label: "Walk-in" },
              { value: "referral", label: "Referral" },
              { value: "other", label: "Other" },
            ].map((source) => (
              <label key={source.value} className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-all has-[:checked]:bg-indigo-600 has-[:checked]:text-white has-[:checked]:border-indigo-600">
                <input
                  type="radio"
                  name="source"
                  className="hidden"
                  checked={formData.source === source.value}
                  onChange={() => setFormData({ ...formData, source: source.value as any })}
                />
                <span className="text-xs font-bold capitalize">{source.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Initial Notes</label>
          <textarea
            className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all rounded-xl px-4 py-2.5 text-sm outline-none text-slate-800"
            rows={3}
            placeholder="Add a short note for the counseling team"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="pt-4">
          <button
            disabled={loading}
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin text-white" /> : "Submit Enquiry"}
          </button>
        </div>
      </form>
    </div>
  );
}
