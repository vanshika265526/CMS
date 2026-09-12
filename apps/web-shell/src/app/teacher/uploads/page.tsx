"use client";

import React, { useState, useEffect } from "react";
import UploadCenter from "@/components/teacher/UploadCenter";
import api from "@/lib/api";
import { RotateCcw, AlertTriangle } from "lucide-react";

export default function UploadsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadBatches = async () => {
    const res = await api.get('/teacher/batches');
    const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
    setBatches(list);
    return list;
  };

  const loadScopeMeta = async (batchId: string) => {
    if (!batchId) {
      setSections([]);
      setSubjects([]);
      return;
    }

    try {
      const [sectionsRes, subjectsRes] = await Promise.all([
        api.get(`/timetable/batch/${batchId}/sections`),
        api.get('/teacher/subjects', { params: { batchId } }),
      ]);

      const nextSections = Array.isArray(sectionsRes.data?.data) ? sectionsRes.data.data : [];
      const nextSubjects = Array.isArray(subjectsRes.data?.data) ? subjectsRes.data.data : [];

      setSections(nextSections);
      setSubjects(nextSubjects);

      setSelectedSectionId((current) => {
        if (current && nextSections.some((section: any) => section._id === current)) return current;
        return nextSections[0]?._id || "";
      });

      setSelectedSubjectId((current) => {
        if (current && nextSubjects.some((subject: any) => subject._id === current)) return current;
        return nextSubjects[0]?._id || "";
      });
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load batch scope");
    }
  };

  const loadResources = async (batchId = selectedBatchId, sectionId = selectedSectionId, subjectId = selectedSubjectId) => {
    if (!batchId) {
      setMaterials([]);
      setAssignments([]);
      return;
    }

    try {
      const [materialsRes, assignmentsRes] = await Promise.all([
        api.get('/teacher/materials', { params: { batchId, sectionId, subjectId } }),
        api.get('/assignments', { params: { batchId, sectionId, subjectId } }),
      ]);

      setMaterials(Array.isArray(materialsRes.data?.data) ? materialsRes.data.data : []);
      setAssignments(Array.isArray(assignmentsRes.data?.data) ? assignmentsRes.data.data : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load materials and assignments");
    }
  };

  const fetchData = async () => {
    setRefreshing(true);
    setError("");
    try {
      const list = await loadBatches();
      const firstBatchId = selectedBatchId || list[0]?._id || "";
      if (firstBatchId && firstBatchId !== selectedBatchId) {
        setSelectedBatchId(firstBatchId);
      }
      if (firstBatchId) {
        await loadScopeMeta(firstBatchId);
        await loadResources(firstBatchId, selectedSectionId, selectedSubjectId);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load teacher resources");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) return;
    loadScopeMeta(selectedBatchId);
  }, [selectedBatchId]);

  useEffect(() => {
    if (!selectedBatchId) return;
    loadResources();
  }, [selectedBatchId, selectedSectionId, selectedSubjectId]);

  const handleUpload = async (formData: FormData) => {
    try {
      await api.post('/teacher/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      await loadResources();
    } catch (err: any) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this material?")) return;
    try {
      await api.delete(`/teacher/materials/${id}`);
      await loadResources();
    } catch (err: any) {
      setError("Unable to delete the material right now.");
    }
  };

  if (loading) return <div className="animate-pulse space-y-6">
    <div className="h-10 w-64 bg-slate-200 rounded-lg"></div>
    <div className="grid grid-cols-3 gap-8">
      <div className="h-125 bg-slate-100 rounded-2xl"></div>
      <div className="col-span-2 h-125 bg-slate-100 rounded-2xl"></div>
    </div>
  </div>;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Subjects & Materials</h1>
          <p className="text-slate-500 mt-1">Choose a batch, section, and subject to publish the right resources to the right students.</p>
        </div>
        <button 
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <RotateCcw size={16} className={refreshing ? "animate-spin" : ""} />
          Refresh Scope
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3">
          <AlertTriangle size={20} />
          {error}
        </div>
      )}

      <UploadCenter 
        batches={batches}
        sections={sections}
        subjects={subjects}
        selectedBatchId={selectedBatchId}
        selectedSectionId={selectedSectionId}
        selectedSubjectId={selectedSubjectId}
        materials={materials} 
        assignments={assignments}
        onBatchChange={setSelectedBatchId}
        onSectionChange={setSelectedSectionId}
        onSubjectChange={setSelectedSubjectId}
        onUpload={handleUpload} 
        onDelete={handleDelete} 
      />
    </div>
  );
}
