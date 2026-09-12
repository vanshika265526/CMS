"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, ChevronRight, Loader2, CheckCircle2,
  AlertCircle, Users, Layers, Search, X, GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface Course { _id: string; name: string; code: string; }
interface Batch {
  _id: string; name: string; startYear: number; endYear: number;
  sections: string[]; students: any[]; courseId?: { _id: string; name: string };
  sectionTeachers?: { section: string; teacherId: string | { _id: string; name?: string; email?: string }; subjectId?: string | { _id: string; name?: string; code?: string } }[];
}
interface Student {
  _id: string;
  personalInfo?: { firstName?: string; lastName?: string; email?: string };
  userId?: { name: string; email: string };
  uniqueStudentId?: string;
  batchId?: string;
  academicInfo?: { section?: string; course?: string; batch?: string; status?: string };
}
interface FacultyOption {
  _id: string;
  userId?: { _id: string; name?: string; email?: string };
  personalInfo?: { name?: string; email?: string };
  assignedSubjects?: { subjectId?: string | { _id?: string; name?: string; code?: string } }[];
}

type Toast = { type: "success" | "error"; text: string } | null;

export default function BatchManagementPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<FacultyOption[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchStudents, setBatchStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  // Modals
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);

  // Forms
  const [batchForm, setBatchForm] = useState({ name: "", courseId: "", startYear: new Date().getFullYear(), endYear: new Date().getFullYear() + 4 });
  const [sectionInput, setSectionInput] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [teacherSubjects, setTeacherSubjects] = useState<any[]>([]);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cd, bd, sd] = await Promise.all([
        api.get("/admin/courses"),
        api.get("/admin/batches"),
        api.get("/admin/students"),
      ]);
      const fd = await api.get("/admin/faculty");
      if (cd.data.success) setCourses(cd.data.data);
      if (bd.data.success) setBatches(bd.data.data);
      if (sd.data.success) setAllStudents(sd.data.data);
      if (fd.data.success) setTeachers(fd.data.data || []);
    } catch {
      showToast("error", "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchBatchStudents = async (batchId: string) => {
    try {
      const res = await api.get(`/admin/batches/${batchId}/students`);
      if (res.data.success) setBatchStudents(res.data.data);
    } catch {
      setBatchStudents([]);
    }
  };

  const selectBatch = (b: Batch) => {
    setSelectedBatch(b);
    setSelectedSection(null);
    fetchBatchStudents(b._id);
  };

  const toggleStudentSelection = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudentIds(newSet);
  };

  // Create Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const response = await api.post("/admin/batches", { ...batchForm, sections: ["A"] });
      const data = response.data;
      if (response.status === 200 || response.status === 201) {
        showToast("success", `Batch "${batchForm.name}" created`);
        setBatches(prev => [...prev, data.data]);
        setShowCreateBatch(false);
        setBatchForm({ name: "", courseId: "", startYear: new Date().getFullYear(), endYear: new Date().getFullYear() + 4 });
      } else {
        showToast("error", data.message || "Failed to create batch");
      }
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Add Section
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !sectionInput.trim()) return;
    setSubmitting(true);
    try {
      const response = await api.post(`/admin/batches/${selectedBatch._id}/sections`, { section: sectionInput.trim().toUpperCase() });
      const data = response.data;
      if (response.status === 200 || response.status === 201) {
        showToast("success", `Section "${sectionInput.toUpperCase()}" added`);
        const updated = data.data;
        setBatches(prev => prev.map(b => b._id === updated._id ? { ...b, ...updated } : b));
        setSelectedBatch(prev => prev ? { ...prev, ...updated } : null);
        setSectionInput("");
        setShowAddSection(false);
      } else {
        showToast("error", data.message || "Failed to add section");
      }
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Section
  const handleRemoveSection = async (section: string) => {
    if (!selectedBatch || !confirm(`Remove Section ${section}?`)) return;
    try {
      const response = await api.delete(`/admin/batches/${selectedBatch._id}/sections/${section}`);
      const data = response.data;
      if (response.status === 200) {
        showToast("success", `Section "${section}" removed`);
        const updated = data.data;
        setBatches(prev => prev.map(b => b._id === updated._id ? { ...b, ...updated } : b));
        setSelectedBatch(prev => prev ? { ...prev, ...updated } : null);
      } else {
        showToast("error", data.message || "Failed to remove section");
      }
    } catch {
      showToast("error", "An error occurred");
    }
  };

  // Assign Student
  const handleAssignStudent = async (studentId: string) => {
    if (!selectedBatch) return;
    setSubmitting(true);
    try {
      const response = await api.post("/admin/assign-student-batch", { studentId, batchId: selectedBatch._id });
      const data = response.data;
      if (response.status === 200 || response.status === 201) {
        showToast("success", "Student assigned to batch");
        fetchBatchStudents(selectedBatch._id);
        setShowAddStudent(false);
        setStudentSearch("");
      } else {
        showToast("error", data.message || "Failed to assign student");
      }
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Assign Students to Section
  const handleBulkAssign = async () => {
    if (!selectedBatch || !selectedSection || selectedStudentIds.size === 0) return;
    setSubmitting(true);
    try {
      const response = await api.put(`/admin/batches/${selectedBatch._id}/sections/${selectedSection}/students`, { studentIds: Array.from(selectedStudentIds) });
      const data = response.data;
      if (response.status === 200) {
        showToast("success", data.message || "Students assigned to section");
        fetchBatchStudents(selectedBatch._id);
        setShowBulkAssign(false);
        setSelectedStudentIds(new Set());
      } else {
        showToast("error", data.message || "Failed to assign students");
      }
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk Assign Students to Batch
  const handleBulkAssignToBatch = async () => {
    if (!selectedBatch || selectedStudentIds.size === 0) return;
    setSubmitting(true);
    try {
      const response = await api.post("/admin/bulk-assign-students-batch", { batchId: selectedBatch._id, studentIds: Array.from(selectedStudentIds) });
      const data = response.data;
      if (response.status === 200 || response.status === 201) {
        showToast("success", data.message || "Students assigned to batch");
        fetchBatchStudents(selectedBatch._id);
        setShowAddStudent(false);
        setSelectedStudentIds(new Set());
        setRangeStart(""); setRangeEnd(""); setStudentSearch("");
      } else {
        showToast("error", data.message || "Failed to assign students");
      }
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Remove Student
  const handleRemoveStudent = async (studentId: string) => {
    if (!selectedBatch || !confirm("Remove student from this batch?")) return;
    try {
      const response = await api.delete(`/admin/batches/${selectedBatch._id}/students/${studentId}`);
      const data = response.data;
      if (response.status === 200) {
        showToast("success", "Student removed");
        setBatchStudents(prev => prev.filter(s => s._id !== studentId));
      } else {
        showToast("error", data.message || "Failed to remove student");
      }
    } catch {
      showToast("error", "An error occurred");
    }
  };

  const getStudentName = (s: Student) =>
    s.userId?.name || [s.personalInfo?.firstName, s.personalInfo?.lastName].filter(Boolean).join(" ") || "Unknown";
  const getStudentEmail = (s: Student) => s.userId?.email || s.personalInfo?.email || "";

  const teacherOptions = teachers.map((f) => {
    const user = f.userId;
    return {
      id: String(user?._id || f._id),
      name: user?.name || f.personalInfo?.name || "Teacher",
      email: user?.email || f.personalInfo?.email || "",
    };
  });

  const currentSectionTeacherAssignment = selectedBatch && selectedSection
    ? (selectedBatch.sectionTeachers || []).find((entry) => entry.section === selectedSection)
    : undefined;

  const currentSectionTeacherId = (() => {
    if (!currentSectionTeacherAssignment) return "";
    const value: any = currentSectionTeacherAssignment.teacherId;
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value._id || "");
  })();

  const currentSectionTeacher = currentSectionTeacherId
    ? teacherOptions.find((t) => t.id === currentSectionTeacherId)
    : null;

  const handleOpenAssignTeacher = () => {
    if (!selectedSection) return;
    setSelectedTeacherId(currentSectionTeacherId);
    setSelectedSubjectId("");
    setTeacherSubjects([]);
    setShowAssignTeacher(true);
  };

  const handleTeacherSelectionChange = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    setSelectedSubjectId(""); // Reset subject when teacher changes
    
    if (teacherId) {
      // Find teacher's assigned subjects from faculty data
      const teacher = teachers.find((t) => String(t.userId?._id || t._id) === teacherId);
      if (teacher && teacher.assignedSubjects) {
        setTeacherSubjects(teacher.assignedSubjects);
      } else {
        setTeacherSubjects([]);
      }
    } else {
      setTeacherSubjects([]);
    }
  };

  const handleAssignTeacherToSection = async () => {
    if (!selectedBatch || !selectedSection) return;
    setSubmitting(true);
    try {
      const response = await api.put(`/admin/batches/${selectedBatch._id}/sections/${selectedSection}/teacher`, {
        teacherId: selectedTeacherId || null,
        subjectId: selectedSubjectId || null,
      });
      const data = response.data;
      if (response.status === 200 && data.success) {
        const updatedBatch = data.data;
        setBatches((prev) => prev.map((b) => (b._id === updatedBatch._id ? { ...b, ...updatedBatch } : b)));
        setSelectedBatch((prev) => (prev ? { ...prev, ...updatedBatch } : prev));
        showToast("success", data.message || "Section teacher updated");
        setShowAssignTeacher(false);
        setSelectedTeacherId("");
        setSelectedSubjectId("");
      } else {
        showToast("error", data.message || "Failed to update section teacher");
      }
    } catch {
      showToast("error", "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const assignedStudentIds = new Set(batchStudents.map(s => s._id));
  const filteredStudents = allStudents.filter(s => {
    if (assignedStudentIds.has(s._id)) return false;
    const q = studentSearch.toLowerCase();
    return !q || getStudentName(s).toLowerCase().includes(q) || getStudentEmail(s).toLowerCase().includes(q);
  });

  const displayedStudents = selectedSection 
    ? batchStudents.filter(s => s.academicInfo?.section === selectedSection)
    : batchStudents;

  // Only show students who have NO section assigned at all
  const unassignedToSectionStudents = batchStudents.filter(s => !s.academicInfo?.section);
  const searchedUnassignedToSection = unassignedToSectionStudents.filter(s => {
    const q = studentSearch.toLowerCase();
    return !q || getStudentName(s).toLowerCase().includes(q) || getStudentEmail(s).toLowerCase().includes(q);
  });

  const applyRangeSelection = (list: any[]) => {
    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);
    if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > list.length) {
      return showToast("error", "Invalid or out of bounds range");
    }
    const newSet = new Set(selectedStudentIds);
    for (let i = start - 1; i <= end - 1; i++) {
        if (list[i]) newSet.add(list[i]._id);
    }
    setSelectedStudentIds(newSet);
    showToast("success", `Selected range ${start} to ${end}`);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-400 mx-auto" />
          <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Loading Batches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 xl:p-8 space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-black animate-in slide-in-from-right-4 duration-200",
          toast.type === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-red-50 text-red-700 border-red-100"
        )}>
          {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 mb-1">Admin</p>
          <h1 className="text-3xl xl:text-4xl font-black text-slate-950 tracking-tight leading-none">
            Batch <span className="text-slate-300">Management</span>
          </h1>
          <p className="text-sm text-slate-400 font-medium mt-2">{batches.length} batch{batches.length !== 1 ? "es" : ""} configured</p>
        </div>
        <button
          onClick={() => setShowCreateBatch(true)}
          className="flex items-center gap-2 bg-slate-950 text-white rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-lg"
        >
          <Plus size={16} /> New Batch
        </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Batch List */}
        <div className="w-full xl:w-80 shrink-0 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 px-1">All Batches</p>
          {batches.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <GraduationCap size={28} className="text-slate-200 mx-auto mb-3" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No batches yet</p>
            </div>
          ) : (
            batches.map(b => (
              <button
                key={b._id}
                onClick={() => selectBatch(b)}
                className={cn(
                  "w-full text-left bg-white rounded-2xl border p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
                  selectedBatch?._id === b._id ? "border-indigo-500 shadow-md shadow-indigo-100" : "border-slate-100"
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">{b.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                      {b.courseId?.name || "No course"} · {b.startYear}–{b.endYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black bg-slate-100 text-slate-500 rounded-lg px-2 py-1 uppercase">
                      {b.sections?.length || 0} sec
                    </span>
                    <ChevronRight size={14} className="text-slate-300" />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Batch Detail */}
        {selectedBatch ? (
          <div className="flex-1 min-w-0 space-y-6">
            {/* Batch Info Header */}
            <div className="bg-slate-950 rounded-3xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Selected Batch</p>
                  <h2 className="text-2xl font-black tracking-tight">{selectedBatch.name}</h2>
                  <p className="text-sm text-slate-400 font-bold mt-1">
                    {selectedBatch.courseId?.name || "—"} · {selectedBatch.startYear}–{selectedBatch.endYear}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="bg-white/10 rounded-2xl px-4 py-2 text-center">
                    <p className="text-xl font-black text-white">{selectedBatch.sections?.length || 0}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Sections</p>
                  </div>
                  <div className="bg-white/10 rounded-2xl px-4 py-2 text-center">
                    <p className="text-xl font-black text-white">{batchStudents.length}</p>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Students</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sections */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-indigo-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Sections</h3>
                </div>
                <button
                  onClick={() => setShowAddSection(true)}
                  className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl px-3 py-2 transition-colors"
                >
                  <Plus size={11} /> Add Section
                </button>
              </div>

              {showAddSection && (
                <form onSubmit={handleAddSection} className="flex gap-2 mb-4">
                  <input
                    autoFocus
                    value={sectionInput}
                    onChange={e => setSectionInput(e.target.value)}
                    placeholder="e.g. B"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 uppercase"
                    maxLength={5}
                  />
                  <button type="submit" disabled={submitting || !sectionInput.trim()}
                    className="bg-indigo-600 text-white rounded-xl px-4 py-2.5 text-xs font-black disabled:opacity-40 hover:bg-indigo-700 transition-colors">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : "Add"}
                  </button>
                  <button type="button" onClick={() => { setShowAddSection(false); setSectionInput(""); }}
                    className="bg-slate-100 text-slate-500 rounded-xl px-3 py-2.5 hover:bg-slate-200 transition-colors">
                    <X size={14} />
                  </button>
                </form>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedBatch.sections?.length ? selectedBatch.sections.map(sec => (
                  <button
                    key={sec} 
                    onClick={() => setSelectedSection(sec === selectedSection ? null : sec)}
                    className={cn(
                      "flex items-center gap-2 border rounded-xl px-4 py-2 group transition-all duration-200 outline-none",
                      selectedSection === sec 
                        ? "bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-200 hover:bg-indigo-700" 
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    )}
                  >
                    <span className="text-xs font-black uppercase tracking-wide">Section {sec}</span>
                    <div
                      onClick={(e) => { e.stopPropagation(); handleRemoveSection(sec); }}
                      className={cn(
                        "transition-colors p-1 rounded-md ml-1",
                        selectedSection === sec 
                          ? "text-indigo-200 hover:text-white hover:bg-indigo-500" 
                          : "text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                      )}
                    >
                      <X size={12} />
                    </div>
                  </button>
                )) : (
                  <p className="text-xs text-slate-400 font-bold">No sections yet. Add one above.</p>
                )}
              </div>
            </div>

            {/* Students */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-emerald-500" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    {selectedSection ? `Section ${selectedSection} Students` : 'Students'}
                    <span className="text-slate-400 font-bold ml-2">({displayedStudents.length})</span>
                  </h3>
                  {selectedSection && currentSectionTeacher && (
                    <span className="text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg px-2 py-1">
                      Teacher: {currentSectionTeacher.name}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedSection && (
                    <button
                      onClick={handleOpenAssignTeacher}
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-xl px-3 py-2 transition-colors border border-violet-100"
                    >
                      <GraduationCap size={11} /> Assign Teacher
                    </button>
                  )}
                  {selectedSection && (
                    <button
                      onClick={() => {
                        setShowBulkAssign(true);
                        setSelectedStudentIds(new Set());
                      }}
                      className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl px-3 py-2 transition-colors border border-indigo-100"
                    >
                      <Layers size={11} /> Bulk Assign
                    </button>
                  )}
                  <button
                    onClick={() => { setShowAddStudent(true); setSelectedStudentIds(new Set()); setRangeStart(""); setRangeEnd(""); }}
                    className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl px-3 py-2 transition-colors border border-emerald-100"
                  >
                    <Plus size={11} /> Assign Student
                  </button>
                </div>
              </div>

              {displayedStudents.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <Users size={24} className="text-slate-200 mx-auto mb-2" />
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    {selectedSection ? `No students in Section ${selectedSection}` : "No students assigned"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedStudents.map(s => (
                    <div key={s._id} className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 group border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100">
                          {getStudentName(s).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{getStudentName(s)}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-slate-400 font-bold">{getStudentEmail(s)}</p>
                            {s.academicInfo?.section && (
                              <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                Sec {s.academicInfo.section}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveStudent(s._id)}
                        className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 rounded-lg"
                        title="Remove from batch"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 min-h-100">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto">
                <Layers size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Select a batch to manage</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Batch Modal */}
      {showCreateBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Create Batch</h3>
              <button onClick={() => setShowCreateBatch(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleCreateBatch} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Batch Name</label>
                <input
                  required value={batchForm.name}
                  onChange={e => setBatchForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. B.Tech CSE 2024–28"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course</label>
                <select
                  required value={batchForm.courseId}
                  onChange={e => setBatchForm(f => ({ ...f, courseId: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select course</option>
                  {courses.map(c => <option key={c._id} value={c._id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Start Year</label>
                  <input
                    required type="number" min="2000" max="2099"
                    value={batchForm.startYear}
                    onChange={e => setBatchForm(f => ({ ...f, startYear: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">End Year</label>
                  <input
                    required type="number" min="2000" max="2099"
                    value={batchForm.endYear}
                    onChange={e => setBatchForm(f => ({ ...f, endYear: parseInt(e.target.value) }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold">Section "A" will be added by default.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateBatch(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 bg-slate-950 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal (To Section) */}
      {showBulkAssign && selectedSection && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Bulk Assign to Section {selectedSection}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select students to move</p>
              </div>
              <button onClick={() => setShowBulkAssign(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto min-h-0 space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <Search size={16} className="text-slate-400" />
                  <input
                    autoFocus
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search unassigned..."
                    className="flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mx-2">Range</span>
                  <input
                    type="number" min="1" placeholder="Start"
                    value={rangeStart} onChange={e => setRangeStart(e.target.value)}
                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-center"
                  />
                  <span className="text-xs font-black text-slate-300">-</span>
                  <input
                    type="number" min="1" placeholder="End"
                    value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-center"
                  />
                  <button 
                    onClick={() => applyRangeSelection(searchedUnassignedToSection)}
                    className="ml-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors shadow-sm"
                  >
                    Apply
                  </button>
                  {(rangeStart || rangeEnd) && (
                    <button 
                      onClick={() => { setRangeStart(""); setRangeEnd(""); }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between px-2 py-1 bg-indigo-50/50 rounded-lg">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                  {selectedStudentIds.size} Students Selected
                </span>
                {selectedStudentIds.size > 0 && (
                  <button 
                    onClick={() => setSelectedStudentIds(new Set())}
                    className="text-[9px] font-black text-indigo-400 hover:text-indigo-600 uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3 py-3 px-2 border-b border-slate-100 sticky top-0 bg-white z-10">
                <label className="flex items-center gap-3 cursor-pointer group flex-1">
                  <div className={cn("w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0", 
                    selectedStudentIds.size === searchedUnassignedToSection.length && searchedUnassignedToSection.length > 0
                      ? "bg-indigo-600 border-indigo-600 text-white" 
                      : "bg-slate-50 border-slate-300"
                  )}>
                    {selectedStudentIds.size === searchedUnassignedToSection.length && searchedUnassignedToSection.length > 0 && <CheckCircle2 size={13} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900">
                    Select All ({searchedUnassignedToSection.length})
                  </span>
                  <input
                    type="checkbox"
                    className="hidden"
                    onChange={() => {
                      if (selectedStudentIds.size === searchedUnassignedToSection.length) setSelectedStudentIds(new Set());
                      else setSelectedStudentIds(new Set(searchedUnassignedToSection.map(s => s._id)));
                    }}
                  />
                </label>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-8 text-center">#</div>
                <div className="flex-1"></div>
              </div>

              <div className="space-y-1">
                {searchedUnassignedToSection.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-8">No matching students found</p>
                ) : searchedUnassignedToSection.map((s, idx) => (
                  <label key={s._id} className="cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={selectedStudentIds.has(s._id)}
                      onChange={() => toggleStudentSelection(s._id)}
                    />
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0", 
                      selectedStudentIds.has(s._id) ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300"
                    )}>
                      {selectedStudentIds.has(s._id) && <CheckCircle2 size={13} />}
                    </div>
                    <div className="w-8 text-center">
                      <span className="text-[10px] font-black text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded">{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">{getStudentName(s)}</p>
                      <div className="flex gap-2 items-center mt-0.5">
                        <p className="text-[10px] text-slate-400 font-bold">{getStudentEmail(s)}</p>
                        {s.academicInfo?.section && (
                          <span className="text-[8px] font-black bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded uppercase border border-rose-100">
                            Sec {s.academicInfo.section}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 shrink-0 flex gap-3 bg-slate-50/50 rounded-b-3xl">
              <button 
                onClick={() => setShowBulkAssign(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkAssign}
                disabled={submitting || selectedStudentIds.size === 0}
                className="flex-2 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
                Assign {selectedStudentIds.size} Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Modal (To Batch) */}
      {showAddStudent && selectedBatch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Bulk Assign to {selectedBatch.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Select students to enroll</p>
              </div>
              <button onClick={() => setShowAddStudent(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 flex-1 overflow-auto min-h-0 space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <Search size={16} className="text-slate-400" />
                  <input
                    autoFocus
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    placeholder="Search global students..."
                    className="flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none placeholder:text-slate-300"
                  />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mx-2">Range</span>
                  <input
                    type="number" min="1" placeholder="Start"
                    value={rangeStart} onChange={e => setRangeStart(e.target.value)}
                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-center"
                  />
                  <span className="text-xs font-black text-slate-300">-</span>
                  <input
                    type="number" min="1" placeholder="End"
                    value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                    className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none text-center"
                  />
                  <button 
                    onClick={() => applyRangeSelection(filteredStudents)}
                    className="ml-1 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-colors shadow-sm"
                  >
                    Apply
                  </button>
                  {(rangeStart || rangeEnd) && (
                    <button 
                      onClick={() => { setRangeStart(""); setRangeEnd(""); }}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between px-2 py-1 bg-emerald-50/50 rounded-lg">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                  {selectedStudentIds.size} Students Selected
                </span>
                {selectedStudentIds.size > 0 && (
                  <button 
                    onClick={() => setSelectedStudentIds(new Set())}
                    className="text-[9px] font-black text-emerald-400 hover:text-emerald-600 uppercase tracking-widest"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-3 py-3 px-2 border-b border-slate-100 sticky top-0 bg-white z-10">
                <label className="flex items-center gap-3 cursor-pointer group flex-1">
                  <div className={cn("w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0", 
                    selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0
                      ? "bg-indigo-600 border-indigo-600 text-white" 
                      : "bg-slate-50 border-slate-300"
                  )}>
                    {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 && <CheckCircle2 size={13} />}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 group-hover:text-slate-900">
                    Select All ({filteredStudents.length})
                  </span>
                  <input
                    type="checkbox"
                    className="hidden"
                    onChange={() => {
                      if (selectedStudentIds.size === filteredStudents.length) setSelectedStudentIds(new Set());
                      else setSelectedStudentIds(new Set(filteredStudents.map(s => s._id)));
                    }}
                  />
                </label>
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-8 text-center">#</div>
                <div className="flex-1"></div>
              </div>

              <div className="space-y-1">
                {filteredStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold text-center py-8">No matching students found</p>
                ) : filteredStudents.map((s, idx) => (
                  <label key={s._id} className="cursor-pointer flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={selectedStudentIds.has(s._id)}
                      onChange={() => toggleStudentSelection(s._id)}
                    />
                    <div className={cn("w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0", 
                      selectedStudentIds.has(s._id) ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-300"
                    )}>
                      {selectedStudentIds.has(s._id) && <CheckCircle2 size={13} />}
                    </div>
                    <div className="w-8 text-center">
                      <span className="text-[10px] font-black text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded">{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">{getStudentName(s)}</p>
                      <div className="flex gap-2 items-center mt-0.5">
                        <p className="text-[10px] text-slate-400 font-bold">{getStudentEmail(s)}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 shrink-0 flex gap-3 bg-slate-50/50 rounded-b-3xl">
              <button 
                onClick={() => setShowAddStudent(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkAssignToBatch}
                disabled={submitting || selectedStudentIds.size === 0}
                className="flex-2 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Users size={14} />}
                Assign {selectedStudentIds.size} Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignTeacher && selectedBatch && selectedSection && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Assign Teacher</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {selectedBatch.name} · Section {selectedSection}
                </p>
              </div>
              <button onClick={() => setShowAssignTeacher(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Teacher</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => handleTeacherSelectionChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-100"
                >
                  <option value="">Unassign teacher</option>
                  {teacherOptions.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.email ? ` (${t.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedTeacherId && teacherSubjects.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Subject (Optional)</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-100"
                  >
                    <option value="">-- No specific subject --</option>
                    {teacherSubjects.map((subj: any) => (
                      <option key={subj.subjectId} value={subj.subjectId}>
                        {subj.subjectId?.name || "Unknown"} ({subj.subjectId?.code || "?"})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              {currentSectionTeacher && (
                <p className="text-xs text-slate-500">
                  Current: <span className="font-semibold text-slate-700">{currentSectionTeacher.name}</span>
                </p>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3 bg-slate-50/50 rounded-b-3xl">
              <button
                onClick={() => setShowAssignTeacher(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignTeacherToSection}
                disabled={submitting}
                className="flex-2 py-3 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <GraduationCap size={14} />}
                Save Teacher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
