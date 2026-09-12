"use client";

import React, { use, useState, useEffect } from "react";
import { ChevronLeft, Printer, Download, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { getMyStudent } from "@/lib/api/students";
import { getHallTicket } from "@/lib/api/exams";

export default function HallTicketPage({ params }: { params: Promise<{ examId: string }> }) {
  const { examId } = use(params);
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        // 1. Get student profile
        const profileRes = await getMyStudent();
        if (!profileRes.success) throw new Error("Could not find student profile");
        
        const studentId = profileRes.data._id;

        // 2. Get hall ticket from API
        const data = await getHallTicket(studentId, examId);
        
        if (data.success) {
          setTicket(data.data);
        } else {
          setError(data.message || "Hall ticket not generated yet");
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [examId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary mb-4" size={48} />
        <p className="text-surface-on-surface-variant font-bold uppercase tracking-widest text-xs">Generating Hall Ticket...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="py-24 text-center">
        <AlertCircle size={48} className="text-error mx-auto mb-4 opacity-20" />
        <h2 className="text-xl font-bold text-surface-on-surface mb-2">Hall Ticket Not Found</h2>
        <p className="text-surface-on-surface-variant mb-6">{error || "The hall ticket for this exam is not available yet."}</p>
        <Link href={`/exams/${examId}`} className="text-primary font-bold hover:underline flex items-center justify-center gap-2">
           <ChevronLeft size={16} /> Back to Exam Details
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 print:m-0 print:p-0">
      {/* Header - Hidden on Print */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link 
            href={`/exams/${examId}`}
            className="p-2.5 bg-surface-container hover:bg-surface-container-high text-surface-on-surface-variant rounded-xl transition-all border border-outline"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-surface-on-surface tracking-tight">E-Hall Ticket</h1>
        </div>
        <button 
          onClick={handlePrint}
          className="bg-primary text-primary-on-primary px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-all"
        >
          <Printer size={18} /> Print Ticket
        </button>
      </div>

      {/* Hall Ticket Card */}
      <Card className="p-0 border-2 border-slate-900 overflow-hidden shadow-2xl relative">
        {/* Institutional Branding */}
        <div className="bg-slate-900 text-white p-8 flex justify-between items-center border-b-4 border-indigo-500">
          <div>
            <h2 className="text-3xl font-black tracking-tighter italic">NgCMS ERP</h2>
            <p className="text-xs uppercase tracking-[0.3em] font-bold text-slate-400 mt-1">Official Hall Ticket</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{ticket.examInfo?.examName}</p>
            <p className="text-[10px] text-slate-400 font-mono uppercase">{ticket.ticketNumber}</p>
          </div>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Photo & Roll No */}
          <div className="md:col-span-1 flex flex-col items-center gap-4">
            <div className="w-32 h-40 bg-slate-100 border-2 border-slate-200 rounded-lg overflow-hidden flex items-center justify-center relative">
              {ticket.studentInfo?.photo ? (
                 <img src={ticket.studentInfo.photo} alt="Student" className="w-full h-full object-cover" />
              ) : (
                 <Loader2 className="animate-pulse text-slate-300" size={32} />
              )}
              <div className="absolute inset-0 border-[10px] border-white pointer-events-none"></div>
            </div>
            <div className="text-center">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-0.5">Roll Number</p>
               <p className="text-lg font-bold font-mono text-slate-900">{ticket.studentInfo?.rollNumber}</p>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-3 grid grid-cols-2 gap-y-6 gap-x-12">
             <Detail field="Full Name" value={ticket.studentInfo?.name} />
             <Detail field="Course" value={ticket.studentInfo?.course || "Information Technology"} />
             <Detail field="Exam Date" value={new Date(ticket.examInfo?.scheduleDate).toLocaleDateString()} />
             <Detail field="Duration" value={`${ticket.examInfo?.duration} Mins`} />
             <Detail field="Venue" value={ticket.examInfo?.venue || "Main Examination Hall (Block A)"} />
             <Detail field="Seat Number" value={ticket.examInfo?.seatNumber || "TO BE ASSIGNED"} />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-slate-50 p-6 border-t border-slate-200 text-[10px] text-slate-500 italic flex justify-between items-end">
           <div className="max-w-[70%]">
             <p className="font-bold mb-1">IMPORTANT INSTRUCTIONS:</p>
             <p>1. Candidates must produce this ticket at the gate for entry. 2. Electronic gadgets are strictly prohibited. 3. Reach the venue 30 minutes before the commencement.</p>
           </div>
           <div className="text-center">
              <div className="w-24 h-8 border-b border-slate-900 mb-1"></div>
              <p className="font-bold uppercase tracking-widest text-[8px]">Authorized Signatory</p>
           </div>
        </div>
      </Card>
      
      <p className="text-[10px] text-center text-slate-400 uppercase tracking-widest print:hidden">
        Digitally Generated by NgCMS ERP Analytics Engine
      </p>
    </div>
  );
}

function Detail({ field, value }: any) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">{field}</p>
      <p className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-1">{value}</p>
    </div>
  );
}
