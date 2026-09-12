import React from "react";
import Card from "@/components/ui/Card";
import StudentStatusBadge from "./StudentStatusBadge";
import { User, Layers, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

interface StudentCardProps {
  student: any;
}

export default function StudentCard({ student }: StudentCardProps) {
  const { personalInfo, academicInfo, uniqueStudentId } = student;

  const isActive = academicInfo.status === 'active';
  const isDropped = academicInfo.status === 'dropped';
  const isInactive = academicInfo.status === 'inactive';

  return (
    <Card className="p-0 border border-slate-200 bg-white hover:shadow-lg transition-all group relative overflow-hidden flex flex-col h-full rounded-3xl">
      {/* Decorative Top Accent */}
      <div className={`h-1.5 w-full ${
        isActive ? 'bg-emerald-500' : 
        isDropped ? 'bg-rose-500' :
        isInactive ? 'bg-amber-500' : 
        'bg-slate-200'
      }`} />

      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-6">
          <div className="relative">
            {personalInfo.photo ? (
              <img 
                src={personalInfo.photo} 
                alt={personalInfo.firstName} 
                className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-slate-100"
              />
            ) : (
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-2xl border border-indigo-100 shadow-sm">
                {personalInfo.firstName[0]}{personalInfo.lastName[0]}
              </div>
            )}
            <div className="absolute -bottom-2 -right-2">
               <StudentStatusBadge status={academicInfo.status} />
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">ID NUMBER</p>
            <p className="text-xs font-bold text-slate-600 tracking-tight">{uniqueStudentId}</p>
          </div>
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors mb-1.5 line-clamp-1">
            {personalInfo.firstName} {personalInfo.lastName}
          </h3>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-5 bg-slate-50 w-fit px-2.5 py-1 rounded-lg border border-slate-100">
            <Layers size={14} className="text-indigo-500" />
            <span className="truncate max-w-[150px]">{academicInfo.course}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Batch</p>
              <p className="text-xs font-bold text-slate-700">{academicInfo.batch || 'Unassigned'}</p>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Enrolled</p>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase">
                <Calendar size={12} className="text-slate-400" /> 
                {new Date(academicInfo.enrollmentDate).getFullYear()}
              </div>
            </div>
          </div>
        </div>

        <Link 
          href={`/students/${uniqueStudentId}`}
          className="mt-6 w-full py-3 bg-white border border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm flex items-center justify-center gap-2 group/btn active:scale-95"
        >
          View Profile <ArrowRight size={14} className="text-slate-400 group-hover/btn:text-white group-hover/btn:translate-x-1 transition-all" />
        </Link>
      </div>
    </Card>
  );
}
