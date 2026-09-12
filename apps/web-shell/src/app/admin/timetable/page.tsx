"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Plus, RotateCcw } from "lucide-react";
import { DAYS, TIME_SLOTS } from "@/constants/timeSlots";
import TimetableGrid, { TimetableCellEntry } from "@/components/timetable/TimetableGrid";
import { fetchBatches, fetchFaculties } from "@/lib/api/admin";
import { fetchSubjects } from "@/lib/api/admin";
import {
  createTimetableEntry,
  deleteTimetableEntry,
  fetchSectionsByBatch,
  fetchTimetableBySection,
  updateTimetableEntry,
} from "@/lib/api/timetable";

type BatchOption = { _id: string; name: string };
type SectionOption = { _id: string; name: string };
type SubjectOption = { _id: string; name: string; code?: string };
type TeacherOption = { _id: string; name: string; assignedSubjects: SubjectOption[] };

type FormState = {
  teacherId: string;
  subject: string;
  day: string;
  startTime: string;
};

const initialForm: FormState = {
  teacherId: "",
  subject: "",
  day: "Monday",
  startTime: "09:00",
};

export default function AdminTimetablePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [entries, setEntries] = useState<TimetableCellEntry[]>([]);

  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setSections([]);
      setSelectedSectionId("");
      setEntries([]);
      return;
    }
    void loadSections(selectedBatchId);
  }, [selectedBatchId]);

  useEffect(() => {
    if (!selectedSectionId) {
      setEntries([]);
      return;
    }
    void loadSectionTimetable(selectedSectionId);
  }, [selectedSectionId]);

  const sectionName = useMemo(
    () => sections.find((section) => section._id === selectedSectionId)?.name || "",
    [sections, selectedSectionId]
  );

  const batchName = useMemo(
    () => batches.find((batch) => batch._id === selectedBatchId)?.name || "",
    [batches, selectedBatchId]
  );

  const bootstrap = async () => {
    try {
      setLoading(true);
      const [batchRes, facultyRes, subjectRes] = await Promise.all([fetchBatches(), fetchFaculties(), fetchSubjects()]);

      const batchData = (batchRes?.data || []).map((batch: any) => ({ _id: String(batch._id), name: String(batch.name) }));
      setBatches(batchData);
      if (batchData.length > 0) {
        setSelectedBatchId(batchData[0]._id);
      }

      const teacherData = (facultyRes?.data || []).map((faculty: any) => ({
        _id: String(faculty?.userId?._id || faculty?._id),
        name: String(faculty?.userId?.name || faculty?.personalInfo?.name || "Unnamed Teacher"),
        assignedSubjects: (faculty?.assignedSubjects || [])
          .map((assignment: any) => assignment?.subjectId)
          .filter(Boolean)
          .map((subject: any) => ({
            _id: String(subject._id),
            name: String(subject.name),
            code: String(subject.code || "")
          })),
      }));
      setTeachers(teacherData);
      if (teacherData.length > 0) {
        setForm((prev) => ({ ...prev, teacherId: teacherData[0]._id }));
      }

      const subjectData = (subjectRes?.data || []).map((subject: any) => ({
        _id: String(subject._id),
        name: String(subject.name),
        code: String(subject.code || ""),
      }));
      setSubjects(subjectData);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load timetable setup data");
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async (batchId: string) => {
    try {
      const sectionRes = await fetchSectionsByBatch(batchId);
      const sectionData = (sectionRes?.data || []).map((section: any) => ({
        _id: String(section._id),
        name: String(section.name),
      }));
      setSections(sectionData);
      setSelectedSectionId((prev) => {
        if (prev && sectionData.some((section: SectionOption) => section._id === prev)) return prev;
        return sectionData[0]?._id || "";
      });
    } catch (err: any) {
      setSections([]);
      setSelectedSectionId("");
      setEntries([]);
      setError(err?.response?.data?.message || "Failed to load sections for selected batch");
    }
  };

  const loadSectionTimetable = async (sectionId: string) => {
    try {
      const response = await fetchTimetableBySection(sectionId);
      const normalized = (response?.data || []).map((entry: any) => ({
        ...entry,
        day: entry.day || entry.dayOfWeek,
      }));
      setEntries(normalized);
    } catch (err: any) {
      setEntries([]);
      setError(err?.response?.data?.message || "Failed to load section timetable");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm((prev) => ({
      teacherId: prev.teacherId || teachers[0]?._id || "",
      subject: "",
      day: "Monday",
      startTime: "09:00",
    }));
  };

  const prefillFromEmptyCell = (day: string, slot: { start: string }) => {
    setForm((prev) => ({ ...prev, day, startTime: slot.start }));
  };

  const teacherSubjectOptions = useMemo(() => {
    const teacher = teachers.find((item) => item._id === form.teacherId);
    if (teacher?.assignedSubjects?.length) {
      return teacher.assignedSubjects;
    }
    return subjects;
  }, [teachers, form.teacherId, subjects]);

  useEffect(() => {
    if (!teacherSubjectOptions.length) {
      setForm((prev) => ({ ...prev, subject: "" }));
      return;
    }

    setForm((prev) => {
      const currentSubjectStillValid = teacherSubjectOptions.some((option) => option.name === prev.subject || option._id === prev.subject);
      if (currentSubjectStillValid) return prev;
      return { ...prev, subject: teacherSubjectOptions[0].name };
    });
  }, [teacherSubjectOptions]);

  const handleEdit = (entry: TimetableCellEntry) => {
    setEditingId(entry._id);
    setForm({
      teacherId: String(entry.teacherId?._id || ""),
      subject: String(entry.subject || ""),
      day: String(entry.day),
      startTime: String(entry.startTime),
    });
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (entry: TimetableCellEntry) => {
    const ok = window.confirm("Delete this timetable entry?");
    if (!ok) return;

    try {
      await deleteTimetableEntry(entry._id);
      await loadSectionTimetable(selectedSectionId);
      setSuccess("Entry deleted successfully.");
      if (editingId === entry._id) resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete entry");
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedBatchId || !selectedSectionId) {
      setError("Please select both batch and section before adding timetable entries.");
      return;
    }

    if (!form.teacherId || !form.subject.trim() || !form.day || !form.startTime) {
      setError("Teacher, subject, day and time slot are required.");
      return;
    }

    const allowedSubjectNames = teacherSubjectOptions.map((option) => option.name);
    if (allowedSubjectNames.length > 0 && !allowedSubjectNames.includes(form.subject.trim())) {
      setError("Please choose a subject assigned to the selected teacher.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        batchId: selectedBatchId,
        sectionId: selectedSectionId,
        teacherId: form.teacherId,
        subject: form.subject.trim(),
        day: form.day,
        startTime: form.startTime,
      };

      if (editingId) {
        await updateTimetableEntry(editingId, payload);
        setSuccess("Timetable entry updated successfully.");
      } else {
        await createTimetableEntry(payload);
        setSuccess("Timetable entry added successfully.");
      }

      await loadSectionTimetable(selectedSectionId);
      resetForm();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to save timetable entry");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Batch</label>
            <select
              value={selectedBatchId}
              onChange={(event) => setSelectedBatchId(event.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300"
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option key={batch._id} value={batch._id}>{batch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Section</label>
            <select
              value={selectedSectionId}
              onChange={(event) => setSelectedSectionId(event.target.value)}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300"
              disabled={!selectedBatchId || sections.length === 0}
            >
              <option value="">Select Section</option>
              {sections.map((section) => (
                <option key={section._id} value={section._id}>{section.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Teacher</label>
            <select
              value={form.teacherId}
              onChange={(event) => setForm((prev) => ({ ...prev, teacherId: event.target.value }))}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300"
            >
              <option value="">Select Teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject</label>
            <select
              value={form.subject}
              onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300"
            >
              <option value="">Select Subject</option>
              {teacherSubjectOptions.map((subject) => (
                <option key={subject._id} value={subject.name}>
                  {subject.code ? `${subject.code} - ${subject.name}` : subject.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[10px] font-semibold text-slate-400">
              {teacherSubjectOptions.length > 0
                ? "Only subjects assigned to the selected teacher are shown."
                : "No teacher-specific subjects found, showing the full subject list."}
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Day</label>
            <select
              value={form.day}
              onChange={(event) => setForm((prev) => ({ ...prev, day: event.target.value }))}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300"
            >
              {DAYS.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Time Slot</label>
            <select
              value={form.startTime}
              onChange={(event) => setForm((prev) => ({ ...prev, startTime: event.target.value }))}
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-300"
            >
              {TIME_SLOTS.map((slot) => (
                <option key={slot.start} value={slot.start}>{slot.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="h-11 flex-1 rounded-xl bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              {editingId ? "Update" : "Add Entry"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="h-11 px-3 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                title="Reset"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 text-sm font-semibold flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 text-sm font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}
      </form>

      <div className="space-y-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">
          Timetable Grid for: {batchName || "-"} {sectionName ? `→ ${sectionName}` : ""}
        </h2>

        <TimetableGrid
          entries={entries}
          onEmptyCellClick={prefillFromEmptyCell}
          onEdit={handleEdit}
          onDelete={handleDelete}
          renderBody={(entry) => (
            <>
              <p className="text-[11px] font-black text-slate-900 leading-tight">{entry.subject}</p>
              <p className="text-[10px] font-bold text-slate-600">{entry.teacherId?.name || "Unknown Teacher"}</p>
            </>
          )}
          emptyLabel="Add"
        />
      </div>
    </div>
  );
}
