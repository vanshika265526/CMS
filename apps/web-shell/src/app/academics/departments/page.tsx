"use client";

import React, { useEffect, useState } from "react";
import { getDepartments, createDepartment } from "@/lib/api/academics";
import Card from "@/components/ui/Card";
import { Layers, Plus, Loader2, AlertCircle } from "lucide-react";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchDepts();
  }, []);

  const fetchDepts = async () => {
    try {
      setLoading(true);
      const res = await getDepartments();
      setDepartments(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Department Architecture</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Hierarchical Node Management</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={16} /> New Node
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : departments.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
          <Layers size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No active departments found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map((dept) => (
            <Card key={dept._id} className="p-6 bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col group rounded-3xl">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
                 <Layers size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">NODE // {dept._id.slice(-6)}</p>
              <h3 className="text-xl font-bold text-slate-900 truncate mb-4">{dept.name}</h3>
              <div className="mt-auto pt-4 border-t border-slate-100 text-xs font-bold text-slate-700 bg-slate-50 px-3 py-2 rounded-xl flex items-center gap-2 w-fit">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">HOD:</span> 
                {dept.hod || "Pending Assignment"}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <CreateDepartmentModal onClose={() => setShowModal(false)} onSuccess={fetchDepts} />
        </div>
      )}
    </div>
  );
}

function CreateDepartmentModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({ name: "", hod: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await createDepartment(formData);
      if (res.success || res.name) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || "Failed to initialize node");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-sm p-8 bg-white border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200 rounded-3xl">
      <h3 className="text-xl font-bold text-slate-900 mb-6">Initialize Department Node</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold">
           <AlertCircle size={16} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Department Nomenclature</label>
           <input 
             autoFocus
             required
             type="text"
             placeholder="e.g. Computing Sciences"
             className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
             value={formData.name}
             onChange={(e) => setFormData({...formData, name: e.target.value})}
           />
        </div>
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Head of Node (HOD)</label>
           <input 
             type="text"
             placeholder="e.g. Dr. Aravind"
             className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
             value={formData.hod}
             onChange={(e) => setFormData({...formData, hod: e.target.value})}
           />
        </div>
        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 transition-all border border-slate-200">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Deploy Root"}
          </button>
        </div>
      </form>
    </Card>
  );
}
