"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getStudentById } from "@/lib/api/students";
import StudentProfileTabs from "@/components/students/StudentProfileTabs";
import StudentStatusBadge from "@/components/students/StudentStatusBadge";
import Card from "@/components/ui/Card";
import { 
  ChevronRight, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  BookOpen, 
  User, 
  Loader2,
  AlertCircle,
  Download
} from "lucide-react";

export default function StudentProfile() {
  const { studentId } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchStudent();
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      const res = await getStudentById(studentId as string);
      if (res.success) setStudent(res.data);
    } catch (err) {
      console.error("Failed to fetch student profile", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm text-center p-8">
        <AlertCircle size={48} className="text-slate-200 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Student Not Found</h2>
        <p className="text-sm text-slate-500 max-w-xs">The unique ID {studentId} does not match any record in our database.</p>
      </div>
    );
  }

  const { personalInfo, academicInfo } = student;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Dynamic Profile Header */}
      <div className="relative group bg-white p-8 rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 via-white to-purple-50 opacity-50 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-end gap-8 relative z-10">
          <div className="relative">
             {personalInfo.photo ? (
               <img src={personalInfo.photo} className="w-32 h-32 rounded-3xl object-cover shadow-lg border-4 border-white" />
             ) : (
               <div className="w-32 h-32 bg-indigo-600 text-white rounded-3xl flex items-center justify-center text-4xl font-bold shadow-lg border-4 border-white">
                 {personalInfo.firstName[0]}{personalInfo.lastName[0]}
               </div>
             )}
             <div className="absolute -bottom-3 -right-3">
               <StudentStatusBadge status={academicInfo.status} />
             </div>
          </div>

          <div className="flex-1 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
              Student Profile <ChevronRight size={14} className="text-slate-300" /> Active Directory
            </div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
              {personalInfo.firstName} {personalInfo.lastName}
            </h1>
            <div className="flex flex-wrap items-center gap-6 mt-4 text-xs font-bold text-slate-600 uppercase tracking-widest bg-slate-50 w-fit px-4 py-2 rounded-xl border border-slate-100">
              <span className="flex items-center gap-2"><User size={16} className="text-indigo-500" /> Enrollment: {student.enrollmentId || student.studentId || student.uniqueStudentId}</span>
              <span className="flex items-center gap-2"><BookOpen size={16} className="text-indigo-500" /> {academicInfo.course}</span>
              <span className="flex items-center gap-2"><Calendar size={16} className="text-indigo-500" /> Batch: {academicInfo.batch || 'TBA'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Mini Contact */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-8 bg-white border border-slate-200 shadow-sm rounded-3xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4 flex items-center justify-between">
              Quick Contacts <PlusIcon />
            </h4>
            <div className="space-y-6">
               <ContactItem icon={<Mail size={18} className="text-indigo-600" />} value={personalInfo.email} label="Primary Email" />
               <ContactItem icon={<Phone size={18} className="text-indigo-600" />} value={personalInfo.phone} label="Phone Line" />
               <ContactItem icon={<MapPin size={18} className="text-indigo-600" />} value={personalInfo.address} label="Current Address" />
            </div>
          </Card>

          <Card className="p-8 bg-slate-50 border border-slate-200 rounded-3xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">Parental Liaison</h4>
            <div>
               <p className="text-sm font-bold text-slate-800 mb-1">{student.parentInfo.name}</p>
               <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{student.parentInfo.relation} • {student.parentInfo.phone}</p>
            </div>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-8">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden flex flex-col min-h-[500px]">
            <StudentProfileTabs activeTab={activeTab} setActiveTab={setActiveTab} />
            
            <div className="p-10 flex-1">
              {activeTab === "overview" && (
                <div className="animate-in fade-in duration-500 space-y-8">
                  <section className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50">
                    <p className="text-sm text-slate-700 leading-relaxed font-semibold">
                      Student is currently enrolled in <span className="text-indigo-600 font-bold">{academicInfo.course}</span>, maintaining an active attendance record. Documents for semester 1 have been verified by the registrar office.
                    </p>
                  </section>
                  
                  <div className="grid grid-cols-2 gap-8 border-t border-slate-100 pt-8">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Department Head</p>
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-400">VA</div>
                         <span className="text-sm font-bold text-slate-800">Dr. Vikram Aditya</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Academic Roadmap</p>
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 w-fit">
                        SEMESTER 1 <ChevronRight size={14} className="text-slate-400" /> <span className="text-indigo-600">IN PROGRESS</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === "academics" && (
                <div className="animate-in fade-in duration-500 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoPanel label="Course" value={academicInfo?.course || "N/A"} />
                    <InfoPanel label="Batch" value={academicInfo?.batch || "N/A"} />
                    <InfoPanel label="Department" value={academicInfo?.department?.name || "N/A"} />
                    <InfoPanel label="Semester" value={String(academicInfo?.semester || "1")} />
                  </div>
                </div>
              )}
              {activeTab === "attendance" && (
                <div className="animate-in fade-in duration-500 space-y-4">
                  <section className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Attendance Snapshot</p>
                    <p className="text-sm font-semibold text-slate-700 mt-2">Attendance records are maintained session-wise and visible in the attendance portal.</p>
                  </section>
                </div>
              )}
              {activeTab === "fees" && (
                <div className="animate-in fade-in duration-500 space-y-4">
                  <section className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Fee Snapshot</p>
                    <p className="text-sm font-semibold text-slate-700 mt-2">Fee structures, payment records, and dues are available in the finance module for this student.</p>
                  </section>
                </div>
              )}
              {activeTab === "documents" && (
                <div className="animate-in fade-in duration-500 space-y-4">
                  {Array.isArray(student.documents) && student.documents.length > 0 ? (
                    <div className="space-y-3">
                      {student.documents.map((doc: any, idx: number) => {
                        const name = String(doc?.name || `Document ${idx + 1}`);
                        const lowerName = name.toLowerCase();
                        const docType =
                          lowerName.includes('id') ? 'ID Card' :
                          lowerName.includes('fee') ? 'Fee Receipt' :
                          lowerName.includes('admit') ? 'Admit Card' :
                          lowerName.includes('cert') ? 'Certificate' :
                          'Document';
                        const url = doc?.cloudinaryUrl || doc?.url;

                        return (
                          <section key={String(doc?._id || idx)} className="bg-slate-50 rounded-2xl border border-slate-100 p-5 flex items-center justify-between gap-4">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{docType}</p>
                              <p className="text-sm font-semibold text-slate-700 mt-1">{name}</p>
                              <p className="text-xs text-slate-500 mt-1">{doc?.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Unknown date'}</p>
                            </div>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2">
                                <Download size={14} /> Download
                              </a>
                            ) : null}
                          </section>
                        );
                      })}
                    </div>
                  ) : (
                    <section className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                      <p className="text-sm font-semibold text-slate-700">No documents uploaded yet. Please contact your admin to upload your documents</p>
                    </section>
                  )}
                </div>
              )}
              {activeTab === "comms" && (
                <div className="animate-in fade-in duration-500 space-y-4">
                  <section className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Communication Log</p>
                    <p className="text-sm font-semibold text-slate-700 mt-2">Announcements and direct communication history for this student can be accessed via communication modules.</p>
                  </section>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ContactItem({ icon, value, label }: any) {
  return (
    <div className="flex items-center gap-4 group">
      <div className="p-3 bg-indigo-50 group-hover:bg-indigo-100 transition-colors rounded-xl border border-indigo-100">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-sm font-bold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">{value}</p>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <div className="w-6 h-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-all">
      <span className="text-sm font-bold mt-[-1px]">+</span>
    </div>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}
