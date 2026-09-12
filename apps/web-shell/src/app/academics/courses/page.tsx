"use client";

import React, { useEffect, useState } from "react";
import { getCourses, createCourse } from "@/lib/api/academics";
import Card from "@/components/ui/Card";
import { Calendar, Plus, Loader2, AlertCircle, Clock } from "lucide-react";

export default function CoursesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await getCourses();
      setCourses(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []));
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Course Offerings</h2>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Syllabus Directory Base</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-600/20 flex items-center gap-2 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={16} /> Link New Entry
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {courses.map((course) => (
            <Card key={course._id} className="p-6 bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between group rounded-3xl">
               <div className="flex items-start gap-5">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                     <span className="font-bold text-xl">{course.code?.slice(0, 2) || "CO"}</span>
                  </div>
                  <div>
                     <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-indigo-100/50">{course.code}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                           <Clock size={12} className="text-slate-400" /> {course.duration} YEARS
                        </span>
                     </div>
                     <h3 className="text-xl font-bold text-slate-900 truncate pr-8 max-w-xl">{course.name}</h3>
                     <p className="text-sm font-medium text-slate-500 mt-1 line-clamp-1 max-w-xl leading-relaxed">
                        {course.description || "Standard syllabus outline and grading structures configured."}
                     </p>
                  </div>
               </div>
               <div className="mt-6 md:mt-0 text-right flex items-center justify-end">
                  <button className="px-5 py-2.5 bg-slate-50 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-200">
                     Manage Matrix
                  </button>
               </div>
            </Card>
          ))}
          
          {courses.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-slate-200 bg-slate-50 rounded-3xl">
              <Calendar size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No deployed syllabi models</p>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <CreateCourseModal onClose={() => setShowModal(false)} onSuccess={fetchCourses} />
        </div>
      )}
    </div>
  );
}

function CreateCourseModal({ onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({ name: "", code: "", duration: 4, description: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = { ...formData };

      const res = await createCourse(payload);
      if (res.success || res.name) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || "Course synthesis failed");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md p-8 bg-white border border-slate-200 shadow-2xl relative animate-in zoom-in-95 duration-200 rounded-3xl">
      <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">Initialize Course Entry</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold">
           <AlertCircle size={14} /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Full Designation</label>
           <input 
             required
             type="text"
             placeholder="e.g. Master of Computer Applications"
             className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
             value={formData.name}
             onChange={(e) => setFormData({...formData, name: e.target.value})}
           />
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Unique Code</label>
              <input 
                required
                type="text"
                placeholder="e.g. MCA-20"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all uppercase placeholder:text-slate-400"
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value})}
              />
           </div>
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Duration (Years)</label>
              <input 
                required
                type="number"
                min="1"
                max="8"
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: Number(e.target.value)})}
              />
           </div>
        </div>
        <div>
           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Curriculum Summary</label>
           <input 
             type="text"
             placeholder="Brief overview of course targets"
             className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none px-4 py-3 rounded-xl text-sm font-semibold text-slate-900 transition-all placeholder:text-slate-400"
             value={formData.description}
             onChange={(e) => setFormData({...formData, description: e.target.value})}
           />
        </div>
        <div className="flex gap-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 hover:text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 transition-all border border-slate-200">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center">
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Deploy Code"}
          </button>
        </div>
      </form>
    </Card>
  );
}
