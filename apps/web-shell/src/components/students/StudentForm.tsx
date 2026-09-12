// FILE: apps/web-shell/src/components/students/StudentForm.tsx
"use client";

import React, { useState, useEffect } from "react";
import { getDepartments, createStudent, uploadDocuments } from "@/lib/api/students";
import api from "@/lib/api";
import { ChevronRight, ChevronLeft, Check, Loader2, User, BookOpen, Heart, FileText } from "lucide-react";
import Card from "@/components/ui/Card";
import DocumentUploader from "./DocumentUploader";

interface StudentFormProps {
  onSuccess: () => void;
}

export default function StudentForm({ onSuccess }: StudentFormProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    personalInfo: { firstName: "", lastName: "", dob: "", gender: "male", phone: "", email: "", address: "" },
    academicInfo: { course: "", batch: "2024-2028", department: "", semester: 1, collegeId: "" },
    parentInfo: { name: "", phone: "", email: "", relation: "Father" },
    documents: [] as any[]
  });

  useEffect(() => {
    getDepartments().then(res => {
      if (res.success) setDepartments(res.data);
    });
    api.get('/super-admin/colleges?limit=1000')
      .then((res) => setColleges(Array.isArray(res?.data?.data) ? res.data.data : []))
      .catch(() => setColleges([]));
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let finalDocuments = formData.documents;
      
      // Upload documents if they are File objects
      if (formData.documents.length > 0 && formData.documents[0] instanceof File) {
        const docFormData = new FormData();
        formData.documents.forEach(file => docFormData.append("files", file));
        
        const uploadRes = await uploadDocuments(docFormData);
        if (uploadRes.success) {
          finalDocuments = uploadRes.data;
        } else {
          throw new Error(uploadRes.message || "Document upload failed");
        }
      }

      const res = await createStudent({
        ...formData,
        collegeId: formData.academicInfo.collegeId || undefined,
        documents: finalDocuments
      });

      if (res.success) onSuccess();
      else alert(res.message);
    } catch (err: any) {
      alert(err.message || "Failed to enroll student");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  return (
    <div className="max-w-4xl mx-auto py-8">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-12 relative px-4 text-center">
         <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-surface-container-low -translate-y-1/2 z-0" />
         <StepIcon step={1} currentStep={step} icon={<User size={18} />} label="Personal" />
         <StepIcon step={2} currentStep={step} icon={<BookOpen size={18} />} label="Academic" />
         <StepIcon step={3} currentStep={step} icon={<Heart size={18} />} label="Family" />
         <StepIcon step={4} currentStep={step} icon={<FileText size={18} />} label="Documents" />
      </div>

      <Card className="p-10 bg-surface-container-lowest border-none shadow-ambient">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-display font-bold text-on-surface mb-8">Personal Information</h3>
            <div className="grid grid-cols-2 gap-6">
              <Input label="First Name" value={formData.personalInfo.firstName} onChange={v => setFormData({...formData, personalInfo: {...formData.personalInfo, firstName: v}})} />
              <Input label="Last Name" value={formData.personalInfo.lastName} onChange={v => setFormData({...formData, personalInfo: {...formData.personalInfo, lastName: v}})} />
              <Input label="Phone Number" type="tel" value={formData.personalInfo.phone} onChange={v => setFormData({...formData, personalInfo: {...formData.personalInfo, phone: v}})} />
              <Input label="Email Address" type="email" value={formData.personalInfo.email} onChange={v => setFormData({...formData, personalInfo: {...formData.personalInfo, email: v}})} />
              <Input label="Date of Birth" type="date" value={formData.personalInfo.dob} onChange={v => setFormData({...formData, personalInfo: {...formData.personalInfo, dob: v}})} />
              <div className="col-span-2">
                <Input label="Home Address" value={formData.personalInfo.address} onChange={v => setFormData({...formData, personalInfo: {...formData.personalInfo, address: v}})} placeholder="City, State, Zip Code" />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-on-surface/40 uppercase mb-2 tracking-widest">Gender</label>
                <div className="flex gap-4">
                  {["male", "female", "other"].map(g => (
                    <label key={g} className="flex-1 text-center p-3 rounded-xl border border-outline-variant text-xs font-bold capitalize cursor-pointer has-[:checked]:bg-black has-[:checked]:text-white has-[:checked]:border-transparent transition-all">
                      <input type="radio" className="hidden" name="gender" checked={formData.personalInfo.gender === g} onChange={() => setFormData({...formData, personalInfo: {...formData.personalInfo, gender: g as any}})} />
                      {g}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-display font-bold text-on-surface mb-8">Academic Details</h3>
            <div className="grid grid-cols-2 gap-6">
               <div className="flex flex-col col-span-2">
                 <label className="text-[10px] font-bold text-on-surface/40 uppercase mb-2 tracking-widest">Department</label>
                 <select 
                   className="w-full bg-surface-container-low border-transparent focus:border-primary-indigo/30 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none border transition-all appearance-none"
                   value={formData.academicInfo.department}
                   onChange={e => setFormData({...formData, academicInfo: {...formData.academicInfo, department: e.target.value}})}
                 >
                   <option value="">Select Department</option>
                   {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                 </select>
               </div>
               <Input label="Course Name" value={formData.academicInfo.course} onChange={v => setFormData({...formData, academicInfo: {...formData.academicInfo, course: v}})} />
               <Input label="Current Batch" value={formData.academicInfo.batch} onChange={v => setFormData({...formData, academicInfo: {...formData.academicInfo, batch: v}})} />
               {colleges.length > 0 && (
                 <div className="flex flex-col col-span-2">
                   <label className="text-[10px] font-bold text-on-surface/40 uppercase mb-2 tracking-widest">College</label>
                   <select
                     className="w-full bg-surface-container-low border-transparent focus:border-primary-indigo/30 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none border transition-all appearance-none"
                     value={formData.academicInfo.collegeId}
                     onChange={e => setFormData({ ...formData, academicInfo: { ...formData.academicInfo, collegeId: e.target.value } })}
                   >
                     <option value="">Select College</option>
                     {colleges.map((college) => (
                       <option key={college._id} value={college._id}>{college.name} ({college.code})</option>
                     ))}
                   </select>
                 </div>
               )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-display font-bold text-on-surface mb-8">Family & Guardian Info</h3>
            <div className="grid grid-cols-2 gap-6">
              <Input label="Parent/Guardian Name" value={formData.parentInfo.name} onChange={v => setFormData({...formData, parentInfo: {...formData.parentInfo, name: v}})} />
              <Input label="Relation" value={formData.parentInfo.relation} onChange={v => setFormData({...formData, parentInfo: {...formData.parentInfo, relation: v}})} />
              <Input label="Phone Number" value={formData.parentInfo.phone} onChange={v => setFormData({...formData, parentInfo: {...formData.parentInfo, phone: v}})} />
              <Input label="Email Address" value={formData.parentInfo.email} onChange={v => setFormData({...formData, parentInfo: {...formData.parentInfo, email: v}})} />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <h3 className="text-xl font-display font-bold text-on-surface mb-8">Document Verification</h3>
            <DocumentUploader onUpload={(files) => setFormData({...formData, documents: files})} />
          </div>
        )}

        {/* Form Controls */}
        <div className="mt-12 pt-8 border-t border-outline-variant/30 flex justify-between">
          <button 
            disabled={step === 1 || loading}
            onClick={prevStep}
            className="px-8 py-3 bg-surface-container-low text-on-surface/40 hover:text-on-surface rounded-xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-0"
          >
            <ChevronLeft size={18} /> Previous
          </button>
          
          {step < 4 ? (
            <button 
              onClick={nextStep}
              className="px-10 py-3 bg-white text-black border-2 border-primary-indigo rounded-xl font-bold text-sm shadow-ambient hover:bg-surface-container-low transition-all flex items-center gap-2 active:scale-95"
            >
              Continue <ChevronRight size={18} className="text-primary-indigo" />
            </button>
          ) : (
            <button 
              disabled={loading}
              onClick={handleSubmit}
              className="px-10 py-3 bg-white text-black border-2 border-primary-indigo rounded-xl font-bold text-sm shadow-ambient hover:bg-surface-container-low transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin text-primary-indigo" /> : <>Enroll Student <Check size={18} className="text-primary-indigo" /></>}
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function StepIcon({ step, currentStep, icon, label }: any) {
  const isDone = currentStep > step;
  const isActive = currentStep === step;

  return (
    <div className="z-10 bg-surface flex flex-col items-center gap-2 px-2">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
        isActive ? "bg-primary-indigo text-white shadow-lg ring-4 ring-primary-indigo/20 scale-110" : 
        isDone ? "bg-emerald-500 text-white" : "bg-surface-container-low text-on-surface/20"
      }`}>
        {isDone ? <Check size={20} /> : icon}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? "text-primary-indigo" : "text-on-surface/30"}`}>{label}</span>
    </div>
  );
}

function Input({ label, type = "text", value, onChange, placeholder }: any) {
  return (
    <div className="flex flex-col">
      <label className="text-[10px] font-bold text-on-surface/40 uppercase mb-2 tracking-widest leading-none">{label}</label>
      <input 
        type={type}
        className="w-full bg-surface-container-low border-transparent focus:border-primary-indigo/30 focus:bg-white rounded-xl px-4 py-3 text-sm outline-none border transition-all placeholder:text-on-surface/20"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
