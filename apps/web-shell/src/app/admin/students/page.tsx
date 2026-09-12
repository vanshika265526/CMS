"use client";

import React, { useEffect, useState } from "react";
import { fetchStudents, deleteStudent, bulkImportStudents, updateStudent, fetchBatches, updateStudentEnrollmentId } from "@/lib/api/admin";
import { Search, Download, UserPlus, FileUp, Loader2, Sparkles, X, Users, HelpCircle, FileText, CheckCircle } from "lucide-react";
import StudentTable from "@/components/admin/StudentTable";

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [course, setCourse] = useState("All Courses");
  const [batch, setBatch] = useState("All Batches");
  const [status, setStatus] = useState("All Status");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<any>(null);

  useEffect(() => {
    loadStudents();
  }, [search, course, batch, status]);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const res = await fetchBatches();
      if (res.success) {
        const items = Array.isArray(res.data) ? res.data : [];
        setBatches(items);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const filters: any = { search };
      if (course !== "All Courses") filters.course = course;
      if (batch !== "All Batches") filters.batch = batch;
      if (status !== "All Status") filters.status = status.toLowerCase();
      
      const res = await fetchStudents(filters);
      if (res.success) setStudents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportStats(null);
      const res = await bulkImportStudents(file);
      if (res.success) {
        setImportStats(res.data);
        loadStudents();
        setTimeout(() => setImportStats(null), 5000);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Import failed. Please check your CSV format.");
    } finally {
      setImporting(false);
      e.target.value = ""; // Clear input
    }
  };

  const handleExportCSV = () => {
    if (students.length === 0) return;
    const headers = ["Student ID", "First Name", "Last Name", "Email", "Course", "Batch", "Status", "Parent Name", "Parent Phone", "Parent Email", "Relation"];
    const rows = students.map(s => [
      s.studentId,
      s.personalInfo?.firstName,
      s.personalInfo?.lastName,
      s.personalInfo?.email,
      s.academicInfo?.course,
      s.academicInfo?.batch,
      s.academicInfo?.status,
      s.parentInfo?.name,
      s.parentInfo?.phone,
      s.parentInfo?.email,
      s.parentInfo?.relation
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Student_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEdit = (id: string) => {
    const student = students.find(s => s.uniqueStudentId === id);
    if (student) setEditingStudent(student);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to drop this student?")) {
      try {
        await deleteStudent(id);
        loadStudents();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleUpdateEnrollmentId = async (id: string, enrollmentId: string) => {
    try {
      await updateStudentEnrollmentId(id, enrollmentId);
      await loadStudents();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Unable to update enrollment ID");
      throw err;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Student Registry</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Institutional Student Information System (SIS)</p>
        </div>

         <div className="flex items-center gap-3">
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
               <Download size={14} /> Export CSV
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
               {importing ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
               {importing ? "Importing..." : "Import CSV"}
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
            >
               <UserPlus size={14} /> Add Student
            </button>
         </div>
      </div>

      {importStats && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
            🎉 Success! Imported {importStats.imported} students. {importStats.errors?.length > 0 ? `${importStats.errors.length} rows failed.` : ""}
          </p>
          <button onClick={() => setImportStats(null)} className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-600">Dismiss</button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4">
         <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH BY NAME, ID OR EMAIL..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="flex gap-2">
            <select 
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
               <option>All Courses</option>
               <option>B.Tech Computer Science</option>
               <option>MBA</option>
            </select>
            <select 
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
            >
              <option>All Batches</option>
              {batches.map((item) => {
                const label = String(item?.name || item?.batchName || "").trim();
                if (!label) return null;
                return (
                  <option key={String(item?._id || label)} value={label}>
                    {label}
                  </option>
                );
              })}
            </select>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Dropped</option>
            </select>
         </div>
      </div>

      {/* Main Table Area */}
      {loading ? (
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        </div>
      ) : (
        <StudentTable 
          students={students} 
          onDelete={handleDelete}
          onEdit={handleEdit}
          onUpdateEnrollmentId={handleUpdateEnrollmentId}
        />
      )}
      {isAddModalOpen && (
        <RegisterStudentModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadStudents();
          }} 
        />
      )}
      {isImportModalOpen && (
        <ImportCSVModal 
          onClose={() => setIsImportModalOpen(false)} 
          onImport={handleImportCSV}
          importing={importing}
        />
      )}
      {editingStudent && (
        <EditStudentModal 
          student={editingStudent}
          onClose={() => setEditingStudent(null)} 
          onSuccess={() => {
            setEditingStudent(null);
            loadStudents();
          }} 
        />
      )}
    </div>
  );
}

// ─── Modal Components ──────────────────────────────────────────


import { createPortal } from "react-dom";
import { createStudent } from "@/lib/api/admin";

function ImportCSVModal({ onClose, onImport, importing }: any) {
  const downloadTemplate = () => {
    const headers = ["firstName", "lastName", "email", "phone", "gender", "dob", "address", "course", "batch", "departmentId", "parentName", "parentPhone", "parentEmail", "relation"];
    const sampleRow = ["John", "Doe", "john.doe@college.edu", "9876543210", "Male", "2002-05-15", "123 Campus Lane", "B.Tech Computer Science", "Batch 2022-2026", "Optional_Dept_ID", "Jane Doe", "9876543211", "jane.doe@example.com", "Mother"];
    
    const csvContent = [headers, sampleRow].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "Student_Import_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 font-sans">
        <div className="flex justify-between items-center px-10 py-8 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">CSV Import Instructions</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Student Enrollment (Bulk SIS)</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-10 space-y-8">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
              <CheckCircle size={14} className="text-emerald-500" /> Required Headers
            </h3>
            <div className="flex flex-wrap gap-2">
              {["firstName", "lastName", "email", "phone", "gender", "dob", "address", "course", "batch", "departmentId", "parentName", "parentPhone", "parentEmail", "relation"].map(h => (
                <span key={h} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-bold text-slate-600 uppercase tracking-tight">{h}</span>
              ))}
            </div>
            <p className="text-[9px] font-medium text-slate-400 mt-4 leading-relaxed tracking-wide">
              The system intelligently maps headers. Feel free to use spaces like <span className="text-slate-900 font-bold underline">"First Name"</span>—it will work perfectly.
            </p>
          </div>

          <div className="space-y-4">
             <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                   <HelpCircle size={16} />
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-slate-900 uppercase">Multi-Tenant Scoping</h4>
                   <p className="text-[9px] font-medium text-slate-400 mt-1">Imported students are linked to your college automatically.</p>
                </div>
             </div>
             <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                   <FileText size={16} />
                </div>
                <div>
                   <h4 className="text-[10px] font-black text-slate-900 uppercase">Automatic Deduplication</h4>
                   <p className="text-[9px] font-medium text-slate-400 mt-1">We use email addresses to prevent duplicate student records.</p>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
             <button 
               onClick={downloadTemplate}
               className="px-6 py-4 border-2 border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all flex items-center justify-center gap-2"
             >
                <Download size={16} /> Download Template
             </button>
             <label className="cursor-pointer px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 flex items-center justify-center gap-2 transition-all">
                {importing ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} className="text-indigo-400" />}
                {importing ? "Importing..." : "Select CSV File"}
                <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                  onImport(e);
                  onClose();
                }} disabled={importing} />
             </label>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function RegisterStudentModal({ onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "male",
      dob: "",
      address: ""
    },
    academicInfo: {
      course: "B.Tech Computer Science",
      batch: "Batch 2022-2026",
      department: "660a2b9e1c2e3a001c2e3a00", // CSE Dept ID (Fallback for Demo)
      semester: 1
    },
    parentInfo: {
      name: "",
      phone: "",
      email: "",
      relation: "Guardian"
    }
  });

  const handleRegister = async () => {
    if (!formData.personalInfo.firstName || !formData.personalInfo.email) {
      setError("Please fill required fields (Name & Email)");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await createStudent(formData);
      if (res.success) onSuccess();
      else setError(res.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center px-10 py-8 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">New Admissions Entry</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manual Student Enrollment (Multi-Tenant SIS)</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-[2px] bg-indigo-500 rounded-full" />
                Personal Information
              </h3>
              <div className="space-y-4">
                <input 
                  type="text" placeholder="FIRST NAME"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, firstName: e.target.value}})}
                />
                <input 
                  type="text" placeholder="LAST NAME"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, lastName: e.target.value}})}
                />
                <input 
                  type="email" placeholder="EMAIL ADDRESS"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, email: e.target.value}})}
                />
                 <input 
                  type="date" placeholder="DATE OF BIRTH"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, dob: e.target.value}})}
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-[2px] bg-emerald-500 rounded-full" />
                Academic Registry
              </h3>
              <div className="space-y-4">
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, academicInfo: {...formData.academicInfo, course: e.target.value}})}
                >
                  <option>B.Tech Computer Science</option>
                  <option>MBA</option>
                </select>
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, academicInfo: {...formData.academicInfo, batch: e.target.value}})}
                >
                  <option>Batch 2022-2026</option>
                  <option>Batch 2024-28</option>
                </select>
                <input 
                  type="text" placeholder="PARENT / GUARDIAN NAME"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, parentInfo: {...formData.parentInfo, name: e.target.value}})}
                />
                <input 
                  type="text" placeholder="PARENT PHONE"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, parentInfo: {...formData.parentInfo, phone: e.target.value}})}
                />
                <input 
                  type="email" placeholder="PARENT EMAIL"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, parentInfo: {...formData.parentInfo, email: e.target.value}})}
                />
              </div>
            </div>
          </div>

          {error && <p className="mt-6 text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 text-center uppercase tracking-widest">{error}</p>}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full mt-10 bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} className="text-indigo-400" />}
            Register New Student
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function EditStudentModal({ student, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState(student);

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await updateStudent(student.uniqueStudentId, formData);
      if (res.success) onSuccess();
      else setError(res.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 font-sans">
        <div className="flex justify-between items-center px-10 py-8 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Edit Student Profile</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Update SIS Registry: {student.uniqueStudentId}</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-10 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-8">
           <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-4 h-[2px] bg-slate-900 rounded-full" />
                Personal Details
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input 
                    type="text" value={formData.personalInfo.firstName}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, firstName: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input 
                    type="text" value={formData.personalInfo.lastName}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, lastName: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" value={formData.personalInfo.email}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, email: e.target.value}})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <span className="w-4 h-[2px] bg-slate-900 rounded-full" />
                Academic Info
              </h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Course Program</label>
                  <input 
                    type="text" value={formData.academicInfo.course}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    onChange={(e) => setFormData({...formData, academicInfo: {...formData.academicInfo, course: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Batch Year</label>
                  <input 
                    type="text" value={formData.academicInfo.batch}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                    onChange={(e) => setFormData({...formData, academicInfo: {...formData.academicInfo, batch: e.target.value}})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Status</label>
                  <select 
                    value={formData.academicInfo.status}
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all cursor-pointer"
                    onChange={(e) => setFormData({...formData, academicInfo: {...formData.academicInfo, status: e.target.value}})}
                  >
                    <option value="active">ACTIVE</option>
                    <option value="dropped">DROPPED</option>
                    <option value="graduated">GRADUATED</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <span className="w-4 h-[2px] bg-slate-900 rounded-full" />
              Parent / Guardian Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Name</label>
                <input
                  type="text"
                  value={formData.parentInfo?.name || ""}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  onChange={(e) => setFormData({ ...formData, parentInfo: { ...formData.parentInfo, name: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Phone</label>
                <input
                  type="text"
                  value={formData.parentInfo?.phone || ""}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  onChange={(e) => setFormData({ ...formData, parentInfo: { ...formData.parentInfo, phone: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Email</label>
                <input
                  type="email"
                  value={formData.parentInfo?.email || ""}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  onChange={(e) => setFormData({ ...formData, parentInfo: { ...formData.parentInfo, email: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Relation</label>
                <input
                  type="text"
                  value={formData.parentInfo?.relation || "Guardian"}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-900 transition-all"
                  onChange={(e) => setFormData({ ...formData, parentInfo: { ...formData.parentInfo, relation: e.target.value } })}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 text-center uppercase tracking-widest">{error}</p>}

          <div className="flex gap-4">
            <button
               onClick={onClose}
               className="flex-1 py-5 border-2 border-slate-100 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} className="text-emerald-400" />}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
