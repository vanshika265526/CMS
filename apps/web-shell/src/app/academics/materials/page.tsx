"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, FileText, Loader2, Search, User, Download, Link2 } from "lucide-react";
import Card from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { fetchMyMaterials, fetchMyProfile, fetchMyTimetable } from "@/lib/api/student";

const resolveFileUrl = (rawUrl?: string) => {
  if (!rawUrl) return "#";
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5005/api";
  const apiRoot = base.replace(/\/api\/?$/, "");
  return `${apiRoot}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
};

const normalizeTimetableEntries = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((entry) => ({
      ...entry,
      day: entry.day || entry.dayOfWeek,
    }));
  }

  return Object.entries(data).flatMap(([day, groupedSlots]: any) => {
    const values = groupedSlots && typeof groupedSlots === "object" ? Object.values(groupedSlots) : [];
    return values.flat().map((entry: any) => ({
      ...entry,
      day: entry.day || day || entry.dayOfWeek,
    }));
  });
};

export default function StudentMaterialsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const visibleMaterials = useMemo(
    () => materials.filter((item) => String(item?.type || "").toLowerCase() !== "assignment"),
    [materials]
  );

  useEffect(() => {
    async function loadData() {
      try {
        const [profileRes, materialsRes, timetableRes] = await Promise.all([
          fetchMyProfile().catch(() => ({ success: false, data: null })),
          fetchMyMaterials().catch(() => ({ success: false, data: [] })),
          fetchMyTimetable().catch(() => ({ success: false, data: [] })),
        ]);

        if (profileRes?.success) setProfile(profileRes.data);
        if (materialsRes?.success) setMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : []);
        if (timetableRes?.success) setTimetable(normalizeTimetableEntries(timetableRes.data));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const studentName = profile?.personalInfo?.name || `${profile?.personalInfo?.firstName || ""} ${profile?.personalInfo?.lastName || ""}`.trim() || "Student";
  const batchLabel = profile?.academicInfo?.batch || profile?.batchId?.name || "Not Assigned";
  const sectionLabel = profile?.academicInfo?.section || profile?.sectionId?.name || "Not Assigned";

  const subjectGroups = useMemo(() => {
    const map = new Map<string, any>();

    const getSubjectId = (entry: any) => {
      // Always try to get the _id first, whether it's nested or direct
      const id = entry?.subjectId?._id || entry?.subjectId;
      return id ? String(id).trim() : null;
    };

    const getSubjectInfo = (entry: any) => {
      const name = entry?.subjectId?.name || entry?.subject || "General";
      const code = entry?.subjectId?.code || "GEN";
      const teacherName = entry?.teacherId?.name || "Faculty";
      return { name, code, teacherName };
    };

    const upsertSubject = (entry: any, materialItem?: any) => {
      const item = materialItem || entry;
      const subjectId = getSubjectId(item);
      
      if (!subjectId) return; // Skip if no ID
      
      const info = getSubjectInfo(item);

      if (!map.has(subjectId)) {
        map.set(subjectId, {
          subjectId,
          subjectName: info.name,
          subjectCode: info.code,
          teacherName: info.teacherName,
          timetableEntries: [],
          materials: [],
        });
      }

      const group = map.get(subjectId)!;
      
      // Update with latest info
      if (info.name && info.name !== "General") group.subjectName = info.name;
      if (info.code && info.code !== "GEN") group.subjectCode = info.code;
      if (info.teacherName && info.teacherName !== "Faculty") group.teacherName = info.teacherName;
      
      if (entry && !materialItem) group.timetableEntries.push(entry);
      if (materialItem) group.materials.push(materialItem);
    };

    // Process timetable first, then materials
    timetable.forEach((entry) => upsertSubject(entry));
    visibleMaterials.forEach((item) => upsertSubject(null, item));

    return Array.from(map.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [visibleMaterials, timetable]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return subjectGroups;

    return subjectGroups.filter((group) => {
      const haystack = [group.subjectName, group.subjectCode, group.teacherName, ...group.materials.map((materialItem: any) => materialItem.title), ...group.materials.map((materialItem: any) => materialItem.description || "")]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [search, subjectGroups]);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const totalMaterials = subjectGroups.reduce((count, group) => count + group.materials.length, 0);

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 pb-16 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Dashboard</Link>
            <ChevronRight size={10} className="text-slate-300" />
            <span className="text-slate-900">Subjects & Materials</span>
          </nav>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
            Subjects <span className="text-indigo-600">& Materials</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-4 max-w-xl leading-relaxed">
            View the subjects assigned to your batch and section along with all files, notes, and links shared by your teachers.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 w-full lg:w-auto">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Student</p>
            <p className="text-sm font-bold text-slate-900 truncate">{studentName}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Batch / Section</p>
            <p className="text-sm font-bold text-slate-900 truncate">{batchLabel} / {sectionLabel}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MiniStat label="Subjects" value={subjectGroups.length} icon={<BookOpen size={18} />} />
        <MiniStat label="Materials" value={totalMaterials} icon={<FileText size={18} />} />
        <MiniStat label="Batch" value={batchLabel === "Not Assigned" ? 0 : 1} icon={<User size={18} />} suffix={batchLabel === "Not Assigned" ? "Not Assigned" : batchLabel} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search subject, code, teacher, or material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none shadow-sm"
          />
        </div>
        <div className="text-sm font-semibold text-slate-500">
          {filteredGroups.length} subject{filteredGroups.length === 1 ? "" : "s"} shown
        </div>
      </div>

      {filteredGroups.length > 0 ? (
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <SubjectSection key={group.subjectId} group={group} />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200 shadow-sm">
          <BookOpen size={48} className="mx-auto text-slate-200 mb-6" />
          <h3 className="text-lg font-black text-slate-900">Nothing here yet</h3>
          <p className="text-sm font-medium text-slate-500 mt-2 max-w-md mx-auto">
            Your teacher hasn't uploaded anything yet for your batch and section.
          </p>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon, suffix }: { label: string; value: number; icon: React.ReactNode; suffix?: string }) {
  return (
    <Card className="p-5 border border-slate-100 bg-white shadow-sm rounded-3xl flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">{icon}</div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-slate-900 leading-none mt-1">{value}</p>
        {suffix ? <p className="text-[10px] font-semibold text-slate-500 mt-1">{suffix}</p> : null}
      </div>
    </Card>
  );
}

function SubjectSection({ group }: { group: any }) {
  return (
    <Card className="p-6 md:p-8 border border-slate-100 bg-white shadow-sm rounded-4xl">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Subject</p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{group.subjectName}</h2>
          <p className="text-sm font-semibold text-slate-500 mt-2">Code: {group.subjectCode} • Teacher: {group.teacherName}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Materials</p>
          <p className="text-xl font-black text-slate-900">{group.materials.length}</p>
        </div>
      </div>

      {group.materials.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {group.materials.map((material: any) => (
            <MaterialItem key={material._id} material={material} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-5 py-8 text-center text-slate-500 font-medium">
          No materials uploaded yet for this subject.
        </div>
      )}
    </Card>
  );
}

function MaterialItem({ material }: { material: any }) {
  const fileUrl = resolveFileUrl(material.fileUrl);
  const isExternal = /^https?:\/\//i.test(material.fileUrl || "");
  const canOpen = fileUrl && fileUrl !== "#";

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5 hover:shadow-lg hover:shadow-indigo-600/5 transition-all">
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border",
          material.type === "Assignment" ? "bg-rose-50 text-rose-600 border-rose-100" : material.type === "Reference" ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-indigo-50 text-indigo-600 border-indigo-100"
        )}>
          <FileText size={22} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">{material.title}</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{material.type}</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {material.createdAt ? new Date(material.createdAt).toLocaleDateString() : "Recently uploaded"}
            </span>
          </div>

          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            {material.description || "Your teacher has shared a resource for this subject."}
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="inline-flex items-center gap-1.5"><User size={12} /> {material.teacherId?.name || "Faculty"}</span>
            <span className="inline-flex items-center gap-1.5"><Download size={12} /> {isExternal ? "Open resource" : "Download file"}</span>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!canOpen}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              {isExternal ? <Link2 size={14} /> : <Download size={14} />}
              {isExternal ? "Open Link" : "Download"}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}