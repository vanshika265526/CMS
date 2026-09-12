"use client";

import React, { useEffect, useState } from "react";
import { Plus, GraduationCap, LayoutGrid, List, Sparkles } from "lucide-react";
import CourseManager from "@/components/admin/CourseManager";
import BatchManager from "@/components/admin/BatchManager";
import { fetchCourses, fetchBatches, createBatch, createCourse, createSubject as createAcademicSubject } from "@/lib/api/admin";

export default function AcademicsPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [courseForm, setCourseForm] = useState({ name: "", code: "", duration: 4, totalSeats: 60, department: "" });
  const [subjectForm, setSubjectForm] = useState({ courseId: "", name: "", code: "", creditHours: 4 });
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);

  useEffect(() => {
    loadAcademics();
  }, []);

  const loadAcademics = async () => {
    try {
      setLoading(true);
      const [courseRes, batchRes] = await Promise.all([
        fetchCourses(),
        fetchBatches()
      ]);
      if (courseRes.success) setCourses(courseRes.data);
      if (batchRes.success || Array.isArray(batchRes)) {
        setBatches(Array.isArray(batchRes) ? batchRes : batchRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBatch = async (batchData: any) => {
    try {
      const res = await createBatch(batchData);
      if (res) {
        await loadAcademics(); // Refresh all
      }
    } catch (err) {
      console.error("Failed to create batch:", err);
      throw err;
    }
  };

  const handleCreateCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setCreatingCourse(true);
      await createCourse(courseForm);
      setShowCourseModal(false);
      setCourseForm({ name: "", code: "", duration: 4, totalSeats: 60, department: "" });
      await loadAcademics();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || "Failed to create course");
    } finally {
      setCreatingCourse(false);
    }
  };

  const openCreateSubjectModal = (courseId: string) => {
    setSubjectForm({ courseId, name: "", code: "", creditHours: 4 });
    setShowSubjectModal(true);
  };

  const handleCreateSubject = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setCreatingSubject(true);
      await createAcademicSubject(subjectForm);
      setShowSubjectModal(false);
      setSubjectForm({ courseId: "", name: "", code: "", creditHours: 4 });
      await loadAcademics();
    } catch (err: any) {
      window.alert(err?.response?.data?.message || "Failed to create subject");
    } finally {
      setCreatingSubject(false);
    }
  };

  const openProgramDetails = (course: any) => {
    setSelectedCourse(course);
    setShowProgramModal(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <Sparkles size={14} className="text-amber-500 fill-amber-500" />
             <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em]">Institutional Standard</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase font-sans">Curriculum Hub</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Manage Course Structures, Syllabus & Batches</p>
        </div>

        <div className="flex items-center gap-3">
           <div className="flex bg-slate-100 p-1 rounded-xl">
              <button className="px-3 py-1.5 bg-white shadow-sm rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                 <LayoutGrid size={12} /> Grid
              </button>
              <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 hover:text-slate-600">
                 <List size={12} /> List
              </button>
           </div>
            <button onClick={() => setShowCourseModal(true)} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center gap-2">
              <Plus size={14} /> New Program
           </button>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
           <div className="w-12 h-12 relative">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
           </div>
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Academic Architecture...</p>
        </div>
      ) : (
        <div className="space-y-12">
            <CourseManager 
              courses={courses} 
              onCreateCourse={() => setShowCourseModal(true)}
              onCreateSubject={openCreateSubjectModal}
              onViewProgramDetails={openProgramDetails}
            />

            {/* Batches Section */}
            <div className="pt-12 border-t border-slate-100">
               <BatchManager 
                 batches={batches} 
                 courses={courses} 
                 onCreateBatch={handleCreateBatch} 
               />
            </div>
        </div>
      )}

      {showCourseModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCourseModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-4">Create New Program</h3>
            <form className="space-y-3" onSubmit={handleCreateCourse}>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2" placeholder="Program Name" value={courseForm.name} onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })} required />
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2" placeholder="Program Code" value={courseForm.code} onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })} required />
              <input type="number" min={1} className="w-full border border-slate-200 rounded-xl px-3 py-2" placeholder="Duration (years)" value={courseForm.duration} onChange={(e) => setCourseForm({ ...courseForm, duration: Number(e.target.value) })} required />
              <input type="number" min={1} className="w-full border border-slate-200 rounded-xl px-3 py-2" placeholder="Total Seats" value={courseForm.totalSeats} onChange={(e) => setCourseForm({ ...courseForm, totalSeats: Number(e.target.value) })} required />
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2" placeholder="Department" value={courseForm.department} onChange={(e) => setCourseForm({ ...courseForm, department: e.target.value })} />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 rounded-xl border border-slate-200">Cancel</button>
                <button type="submit" disabled={creatingCourse} className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-60">{creatingCourse ? 'Creating...' : 'Create Program'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowSubjectModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900 mb-4">Add Subject</h3>
            <form className="space-y-3" onSubmit={handleCreateSubject}>
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2" placeholder="Subject Name" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} required />
              <input className="w-full border border-slate-200 rounded-xl px-3 py-2" placeholder="Subject Code" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} required />
              <input type="number" min={1} className="w-full border border-slate-200 rounded-xl px-3 py-2" placeholder="Credit Hours" value={subjectForm.creditHours} onChange={(e) => setSubjectForm({ ...subjectForm, creditHours: Number(e.target.value) })} required />
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowSubjectModal(false)} className="px-4 py-2 rounded-xl border border-slate-200">Cancel</button>
                <button type="submit" disabled={creatingSubject} className="px-4 py-2 rounded-xl bg-slate-900 text-white disabled:opacity-60">{creatingSubject ? 'Creating...' : 'Create Subject'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showProgramModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowProgramModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedCourse.name}</h3>
                <p className="text-xs text-slate-500 uppercase tracking-wider">{selectedCourse.code} • {selectedCourse.duration} Years</p>
              </div>
              <button type="button" onClick={() => setShowProgramModal(false)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs">Close</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Department</p>
                <p className="text-sm font-semibold text-slate-900 break-all">{selectedCourse.department?.name || selectedCourse.department || "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Total Seats</p>
                <p className="text-sm font-semibold text-slate-900">{selectedCourse.totalSeats ?? "-"}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-3">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">Subjects</p>
                <p className="text-sm font-semibold text-slate-900">{selectedCourse.subjects?.length || 0}</p>
              </div>
            </div>

            <h4 className="text-sm font-black text-slate-900 mb-2">Syllabus Subjects</h4>
            <div className="max-h-64 overflow-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {(selectedCourse.subjects || []).length === 0 ? (
                <p className="p-4 text-sm text-slate-500">No subjects in this program yet.</p>
              ) : (
                (selectedCourse.subjects || []).map((sub: any) => (
                  <div key={sub._id} className="p-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{sub.name}</p>
                      <p className="text-xs text-slate-500">{sub.code}</p>
                    </div>
                    <p className="text-xs text-slate-700">{sub.creditHours} credits</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowProgramModal(false);
                  openCreateSubjectModal(selectedCourse._id);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm"
              >
                Add Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
