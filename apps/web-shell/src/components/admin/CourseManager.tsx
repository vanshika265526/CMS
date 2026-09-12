"use client";

import React from "react";
import { BookOpen, Users, Clock, Layers, Plus, ExternalLink, Settings2 } from "lucide-react";

interface CourseManagerProps {
  courses: any[];
  onCreateCourse: () => void;
  onCreateSubject: (courseId: string) => void;
   onViewProgramDetails: (course: any) => void;
}

export default function CourseManager({ courses, onCreateCourse, onCreateSubject, onViewProgramDetails }: CourseManagerProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
         {courses.map((course) => {
            const departmentLabel =
               typeof course.department === "string"
                  ? course.department
                  : course.department?.name || "-";

            return (
            <div key={course._id} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
           <div className="absolute top-0 right-0 p-8">
              <button className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors">
                 <Settings2 size={18} />
              </button>
           </div>

           <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-xl shadow-slate-200">
                 <BookOpen size={24} />
              </div>
              <div className="space-y-1">
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{course.name}</h3>
                 <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{course.code}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{course.duration} YEARS</span>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-3 gap-4 mb-8">
              <MiniIndicator icon={<Layers size={14} />} label="Subjects" value={course.subjects?.length || 0} />
              <MiniIndicator icon={<Users size={14} />} label="Total Seats" value={course.totalSeats} />
              <MiniIndicator icon={<Clock size={14} />} label="Dept" value={departmentLabel} />
           </div>

           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Core Syllabus</h4>
                 <button 
                   onClick={() => onCreateSubject(course._id)}
                   className="text-[9px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
                 >
                    <Plus size={12} /> Add Subject
                 </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 {course.subjects?.slice(0, 4).map((sub: any) => (
                   <div key={sub._id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group/sub transition-all hover:bg-white hover:border-slate-200">
                      <div className="space-y-0.5">
                         <p className="text-[9px] font-black text-slate-900 uppercase tracking-tight">{sub.name}</p>
                         <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{sub.code}</p>
                      </div>
                      <span className="text-[8px] font-black text-slate-400 uppercase">{sub.creditHours} CR</span>
                   </div>
                 ))}
                 {course.subjects?.length > 4 && (
                   <div className="p-3 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-50 transition-all">
                      + {course.subjects.length - 4} More Subjects
                   </div>
                 )}
              </div>
           </div>

                <button
                   onClick={() => onViewProgramDetails(course)}
                   className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                >
              Program Details <ExternalLink size={14} />
           </button>
        </div>
         )})}

      {/* Add New Course Placeholder */}
      <div 
        onClick={onCreateCourse}
        className="bg-white border-4 border-dashed border-slate-100 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-200 hover:bg-slate-50/50 transition-all min-h-[400px]"
      >
         <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-4">
            <Plus size={32} />
         </div>
         <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">New Academic Program</h3>
         <p className="max-w-[180px] text-[10px] font-bold text-slate-300 uppercase tracking-wide leading-relaxed mt-2">
            Establish a new course with custom duration and department
         </p>
      </div>
    </div>
  );
}

function MiniIndicator({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) {
  return (
    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
       <div className="text-slate-400 mb-1">{icon}</div>
       <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none">{label}</p>
       <p className="text-sm font-black text-slate-900 tracking-tighter mt-0.5 truncate">{value}</p>
    </div>
  );
}
