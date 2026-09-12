"use client";

import React, { useEffect, useState } from "react";
import { getBatches, createBatch, getCourses } from "@/lib/api/academics";
import Card from "@/components/ui/Card";
import { Users, Plus, Loader2, AlertCircle, BookOpen, Clock } from "lucide-react";

export default function BatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [batchRes, coursesRes] = await Promise.all([
        getBatches(),
        getCourses()
      ]);
      setBatches(Array.isArray(batchRes) ? batchRes : (Array.isArray(batchRes?.data) ? batchRes.data : []));
      setCourses(Array.isArray(coursesRes) ? coursesRes : (Array.isArray(coursesRes?.data) ? coursesRes.data : []));
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Batch Arrays</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Student Matrices</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={16} /> Link Batch
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batches.map((batch) => (
            <Card key={batch._id} className="p-6 bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col group rounded-3xl">
              <div className="flex items-center justify-between mb-6">
                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
                    <Users size={20} />
                 </div>
                 <div className="text-right bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">TIMELINE</p>
                    <p className="text-sm font-bold text-slate-800 tracking-tight">
                      {batch.startYear} - {batch.endYear}
                    </p>
                 </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 truncate mb-1">{batch.name}</h3>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                <BookOpen size={14} className="text-indigo-400" /> {(batch.courseId && (batch.courseId as any).name) || "Assigned Course"}
              </div>

              <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="flex -space-x-3">
                     <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">01</div>
                     <div className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">02</div>
                     <div className="w-8 h-8 rounded-full bg-slate-300 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600">03</div>
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     {Array.isArray(batch.students) ? `${batch.students.length} Active` : "0 Active"}
                   </span>
                </div>
                <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-widest border border-indigo-100">
                   SEM 0{batch.currentSemester}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {batches.length === 0 && !loading && (
        <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
          <Users size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No batches deployed in current cluster</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <CreateBatchModal courses={courses} onClose={() => setShowModal(false)} onSuccess={fetchData} />
        </div>
      )}
    </div>
  );
}

function CreateBatchModal({ courses, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({ 
    name: "", 
    courseId: "", 
    startYear: new Date().getFullYear(),
    endYear: new Date().getFullYear() + 4,
    currentSemester: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...formData };

      const res = await createBatch(payload);
      if (res.success || res.name) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || "Batch deployment failed");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200 rounded-3xl">
      <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Allocate New Batch</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold">
           <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Nomenclature</label>
           <input 
             required
             type="text"
             placeholder="e.g. Class of 2026 (Sec A)"
             className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
             value={formData.name}
             onChange={(e) => setFormData({...formData, name: e.target.value})}
           />
        </div>

        <div>
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Target Syllabus</label>
           <select 
             required
             className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all appearance-none"
             value={formData.courseId}
             onChange={(e) => setFormData({...formData, courseId: e.target.value})}
           >
             <option value="" disabled>Select Target Array</option>
             {courses.map((c: any) => (
               <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
             ))}
           </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Induction Year</label>
              <input 
                required type="number"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all"
                value={formData.startYear}
                onChange={(e) => setFormData({...formData, startYear: Number(e.target.value)})}
              />
           </div>
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Exit Year</label>
              <input 
                required type="number"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all"
                value={formData.endYear}
                onChange={(e) => setFormData({...formData, endYear: Number(e.target.value)})}
              />
           </div>
        </div>

        <div className="flex gap-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 transition-all border border-slate-200">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Deploy Batch Matrix"}
          </button>
        </div>
      </form>
    </Card>
  );
}
