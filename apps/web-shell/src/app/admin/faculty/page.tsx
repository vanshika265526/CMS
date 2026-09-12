"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Filter, Download, UserCheck } from "lucide-react";
import FacultyTable from "@/components/admin/FacultyTable";
import { fetchFaculties, deleteFaculty } from "@/lib/api/admin";

export default function FacultyPage() {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("All Departments");
  const [status, setStatus] = useState("Active Status");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<any>(null);
  const [assigningFaculty, setAssigningFaculty] = useState<any>(null);
  const [viewingFaculty, setViewingFaculty] = useState<any>(null);

  useEffect(() => {
    loadFaculties();
  }, [search, dept, status]);

  const loadFaculties = async () => {
    try {
      setLoading(true);
      const filters: any = { search };
      if (dept !== "All Departments") filters.department = dept;
      if (status !== "Active Status") filters.status = status;
      
      const res = await fetchFaculties(filters);
      if (res.success) setFaculties(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (faculties.length === 0) return;
    const headers = ["Employee ID", "Name", "Email", "Department", "Designation", "Joining Date", "Status"];
    const rows = faculties.map(f => [
      f.employeeId,
      f.personalInfo?.name,
      f.personalInfo?.email,
      f.departmentId?.name || "General",
      f.designation || "Faculty",
      f.joiningDate?.split('T')[0],
      f.status
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Payroll_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Mark this faculty member as Resigned?")) {
      try {
        await deleteFaculty(id);
        loadFaculties();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase font-sans">Human Resources</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Faculty & Staff Management System</p>
        </div>

         <div className="flex items-center gap-3">
            <button 
              onClick={handleExportCSV}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2"
            >
               <Download size={14} /> Payroll Export
            </button>
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
            >
               <UserCheck size={14} /> Onboard Faculty
            </button>
         </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-4">
         <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH BY NAME, ID OR DEPARTMENT..."
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest placeholder:text-slate-300 focus:ring-2 focus:ring-slate-900 transition-all font-mono"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
         </div>
         <div className="flex gap-2">
            <select 
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
               <option>All Departments</option>
               <option>Computer Science</option>
               <option>Information Tech</option>
               <option>Management</option>
            </select>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-4 py-3 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
            >
               <option>Active Status</option>
               <option>On-Leave</option>
               <option>Resigned</option>
            </select>
         </div>
      </div>

      {/* Main Table Area */}
      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-4">
           <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Syncing Personnel Data...</p>
        </div>
      ) : faculties.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center gap-6 border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center">
            <UserCheck size={28} className="text-slate-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No Faculty Members Yet</p>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest mt-1">Start by onboarding your first faculty member</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-lg transition-all flex items-center gap-2 active:scale-95"
          >
            <Plus size={14} /> Add First Faculty Member
          </button>
        </div>
      ) : (
        <FacultyTable 
          faculties={faculties} 
          onDelete={handleDelete}
          onEdit={(id) => setEditingFaculty(faculties.find(f => f._id === id))}
          onAssign={(id) => setAssigningFaculty(faculties.find(f => f._id === id))}
          onView={(id) => setViewingFaculty(faculties.find(f => f._id === id))}
        />
      )}

      {isAddModalOpen && (
        <RegisterFacultyModal 
          onClose={() => setIsAddModalOpen(false)} 
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadFaculties();
          }} 
        />
      )}

      {editingFaculty && (
        <EditFacultyModal 
          faculty={editingFaculty}
          onClose={() => setEditingFaculty(null)} 
          onSuccess={() => {
            setEditingFaculty(null);
            loadFaculties();
          }} 
        />
      )}

      {assigningFaculty && (
        <AssignSubjectModal 
          faculty={assigningFaculty}
          onClose={() => setAssigningFaculty(null)} 
          onSuccess={() => {
            setAssigningFaculty(null);
            loadFaculties();
          }} 
        />
      )}

      {viewingFaculty && (
        <FacultyProfileModal 
          faculty={viewingFaculty}
          onClose={() => setViewingFaculty(null)} 
        />
      )}
    </div>
  );
}

// ─── Modal Components ──────────────────────────────────────────

import { X, Sparkles, Loader2, Book } from "lucide-react";
import { createPortal } from "react-dom";
import { createFaculty, updateFaculty, assignFacultySubjects, fetchSubjects, fetchBatches } from "@/lib/api/admin";

function EditFacultyModal({ faculty, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    personalInfo: { ...faculty.personalInfo },
    employeeId: faculty.employeeId,
    designation: faculty.designation || "Assistant Professor",
    department: faculty.department || "",
    qualification: faculty.qualification || "",
    joiningDate: faculty.joiningDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    experience: faculty.experience || 0,
    status: faculty.status || "Active"
  });

  const handleUpdate = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await updateFaculty(faculty._id, formData);
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
      <div className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center px-10 py-8 border-b border-slate-100">
           <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Edit Faculty Record</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Personnel Sync</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors"><X size={20} /></button>
        </div>
        <div className="p-10 grid grid-cols-2 gap-8">
           <div className="space-y-4">
              <input 
                type="text" placeholder="NAME" value={formData.personalInfo.name}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, name: e.target.value}})}
              />
              <input 
                type="email" placeholder="EMAIL" value={formData.personalInfo.email}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, email: e.target.value}})}
              />
              <select 
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
              >
                <option>Active</option>
                <option>On-Leave</option>
                <option>Resigned</option>
              </select>
           </div>
           <div className="space-y-4">
              <select 
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                value={formData.designation}
                onChange={(e) => setFormData({...formData, designation: e.target.value})}
              >
                <option>Assistant Professor</option>
                <option>Associate Professor</option>
                <option>Head of Department</option>
              </select>
              <input 
                type="text" placeholder="DEPARTMENT" value={formData.department}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                onChange={(e) => setFormData({...formData, department: e.target.value})}
              />
              <input 
                type="text" placeholder="QUALIFICATION" value={formData.qualification}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                onChange={(e) => setFormData({...formData, qualification: e.target.value})}
              />
              <input 
                type="number" value={formData.experience}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value)})}
              />
           </div>
        </div>
        <div className="p-10 pt-0">
           {error && <p className="mb-6 text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 uppercase tracking-widest">{error}</p>}
           <button onClick={handleUpdate} disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />} Save Changes
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AssignSubjectModal({ faculty, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subRes, batchRes] = await Promise.all([fetchSubjects(), fetchBatches()]);
        if (subRes.success) setSubjects(subRes.data);
        if (batchRes.success) setBatches(batchRes.data);
      } catch (err) { console.error(err); }
    };
    loadData();
  }, []);

  const handleAssign = async () => {
    if (!selectedSubject || !selectedBatch) {
      setError("Please select both subject and batch");
      return;
    }
    try {
      setLoading(true);
      setError("");
      // Using assignTeacher from api/admin which expects teacherId, subjectId, batchId
      const { assignTeacher } = await import("@/lib/api/admin"); 
      const res = await assignTeacher({ 
        teacherId: faculty.userId?._id || faculty.userId, // Extract ID from populated object
        subjectId: selectedSubject, 
        batchId: selectedBatch 
      });
      if (res.success) onSuccess();
      else setError(res.message);
    } catch (err: any) {
      setError(err.response?.data?.message || "Assignment failed");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="flex justify-between items-center px-10 py-8 border-b border-slate-100">
           <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Academic Assignment</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Linking Faculty to Subjects</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors"><X size={20} /></button>
        </div>
        <div className="p-10 space-y-6">
           <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs grayscale">{faculty.personalInfo.name[0]}</div>
              <div>
                 <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{faculty.personalInfo.name}</p>
                 <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{faculty.designation}</p>
              </div>
           </div>

           <div className="space-y-4">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Subject</label>
                 <select 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                    onChange={(e) => setSelectedSubject(e.target.value)}
                 >
                    <option value="">Choose Subject...</option>
                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Batch</label>
                 <select 
                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                    onChange={(e) => setSelectedBatch(e.target.value)}
                 >
                    <option value="">Choose Batch...</option>
                    {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                 </select>
              </div>
           </div>

           {error && <p className="text-[10px] font-black text-rose-500 bg-rose-50 px-4 py-3 rounded-xl border border-rose-100 uppercase tracking-widest text-center">{error}</p>}

           <button onClick={handleAssign} disabled={loading} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Book size={18} />} Link Subject
           </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function RegisterFacultyModal({ onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      address: ""
    },
    employeeId: "", // Will be auto-gen if empty or manual
    designation: "Assistant Professor",
    joiningDate: new Date().toISOString().split('T')[0],
    experience: 0
  });

  const handleRegister = async () => {
    if (!formData.personalInfo.name || !formData.personalInfo.email) {
      setError("Please fill required fields (Name & Email)");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await createFaculty(formData);
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
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Onboard Faculty Member</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Institutional Personnel Management</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-10">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-[2px] bg-indigo-500 rounded-full" />
                Identity Details
              </h3>
              <div className="space-y-4">
                <input 
                  type="text" placeholder="FULL LEGAL NAME"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, name: e.target.value}})}
                />
                <input 
                  type="email" placeholder="OFFICIAL EMAIL"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, personalInfo: {...formData.personalInfo, email: e.target.value}})}
                />
                <input 
                  type="text" placeholder="EMPLOYEE ID (OPTIONAL)"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <span className="w-4 h-[2px] bg-emerald-500 rounded-full" />
                Position & Role
              </h3>
              <div className="space-y-4">
                <select 
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-slate-200"
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                >
                  <option>Assistant Professor</option>
                  <option>Associate Professor</option>
                  <option>Head of Department</option>
                  <option>Lab Instructor</option>
                </select>
                <input 
                  type="date" placeholder="JOINING DATE"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200"
                  value={formData.joiningDate}
                  onChange={(e) => setFormData({...formData, joiningDate: e.target.value})}
                />
                <input 
                  type="number" placeholder="YEARS OF EXPERIENCE"
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-slate-200 font-mono"
                  onChange={(e) => setFormData({...formData, experience: parseInt(e.target.value) || 0})}
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
            Confirm Faculty Onboarding
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

import { fetchFacultyAttendanceStats } from "@/lib/api/admin";

function FacultyProfileModal({ faculty, onClose }: any) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetchFacultyAttendanceStats(faculty._id);
        if (res.success) setStats(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    loadStats();
  }, [faculty._id]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center px-10 py-8 border-b border-slate-100 shrink-0">
           <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Faculty Performance Ledger</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Audit Trail & Attendance Matrix Metrics</p>
          </div>
          <button onClick={onClose} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-colors"><X size={20} /></button>
        </div>

        <div className="p-10 overflow-y-auto space-y-8">
           {/* Summary Cards */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-slate-900 rounded-3xl text-white">
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Total Rectifications</p>
                 <h3 className="text-4xl font-black">{stats?.totalRectifications || 0}</h3>
              </div>
              <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Active Assignments</p>
                 <h3 className="text-4xl font-black text-emerald-900">{faculty.assignedSubjects?.length || 0}</h3>
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Last Sync</p>
                 <p className="text-sm font-black text-slate-900 uppercase">{new Date().toLocaleDateString()}</p>
              </div>
           </div>

           {/* Detailed Log */}
           <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-4 h-1 bg-slate-900 rounded-full" />
                 Attendance Rectification History
              </h3>
              
              {loading ? (
                <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-300" /></div>
              ) : !stats?.history?.length ? (
                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                   <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No Rectifications Recorded</p>
                </div>
              ) : (
                <div className="space-y-2">
                   {stats.history.map((log: any, idx: number) => (
                     <div key={idx} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-slate-300 transition-all shadow-sm">
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-slate-50 rounded-xl flex flex-col items-center justify-center">
                              <span className="text-[10px] font-black text-slate-900 leading-none">{new Date(log.date).getDate()}</span>
                              <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(log.date).toLocaleString('default', { month: 'short' })}</span>
                           </div>
                           <div>
                              <p className="text-[11px] font-black text-slate-900 uppercase">{log.subjectId?.name}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{log.classId?.name} • Lec {log.lecture}</p>
                           </div>
                        </div>
                        <div className="text-right">
                           <p className="text-[10px] font-black text-rose-500 uppercase">Rectified</p>
                           <p className="text-[8px] font-bold text-slate-400 uppercase">{new Date(log.lastRectifiedAt).toLocaleTimeString()}</p>
                        </div>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

