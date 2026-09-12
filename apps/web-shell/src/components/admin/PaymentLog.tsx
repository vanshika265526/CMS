"use client";

import React from "react";
import { CreditCard, ArrowUpRight, ArrowDownRight, Printer, CheckCircle2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentLogProps {
  payments: any[];
}

export default function PaymentLog({ payments }: PaymentLogProps) {
  const handlePrintReceipt = (payment: any) => {
    const amount = payment?.amountPaid ?? payment?.amount ?? 0;
    const receiptNo = payment?.receiptNumber || payment?.receiptNo || "N/A";
    const method = payment?.mode || payment?.method || "N/A";
    const date = payment?.paymentDate || payment?.paidAt || payment?.createdAt;
    const studentName = payment?.studentId?.personalInfo?.name
      || `${payment?.studentId?.personalInfo?.firstName || ""} ${payment?.studentId?.personalInfo?.lastName || ""}`.trim()
      || payment?.studentId?.studentId
      || "Student";

    const printable = window.open("", "_blank", "width=700,height=900");
    if (!printable) return;
    printable.document.write(`
      <html>
      <head><title>Receipt ${receiptNo}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 24px;">
        <h2>Payment Receipt</h2>
        <p><strong>Receipt:</strong> ${receiptNo}</p>
        <p><strong>Student:</strong> ${studentName}</p>
        <p><strong>Amount:</strong> INR ${Number(amount).toLocaleString()}</p>
        <p><strong>Mode:</strong> ${method}</p>
        <p><strong>Status:</strong> ${payment?.status || "N/A"}</p>
        <p><strong>Date:</strong> ${date ? new Date(date).toLocaleString() : "N/A"}</p>
      </body>
      </html>
    `);
    printable.document.close();
    printable.focus();
    printable.print();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
      <div className="p-8 border-b border-slate-100 flex items-center justify-between">
         <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Revenue Streams & Collection Log</h3>
         <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">View All Collections</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Transaction ID</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Student Info</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Category</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Method</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Amount</th>
              <th className="px-8 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payments.map((payment) => (
              <tr key={payment._id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-1">
                       <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{payment.receiptNumber || payment.receiptNo || 'N/A'}</p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate w-24">{payment.transactionId || '-'}</p>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-0.5">
                       <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{payment.studentId?.personalInfo?.name || `${payment.studentId?.personalInfo?.firstName || ''} ${payment.studentId?.personalInfo?.lastName || ''}`.trim() || 'N/A'}</p>
                       <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{payment.studentId?.studentId || payment.studentId?.uniqueStudentId || '-'}</p>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2 py-1 bg-slate-100 rounded-lg">
                      {payment.feeStructureId?.components?.[0]?.name || payment.feeStructureId?.category || "Tuition"}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                     <CreditCard size={12} className="text-slate-400" />
                       <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{payment.mode || payment.method || '-'}</span>
                  </div>
                </td>
                <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-900 tracking-tighter">₹{((payment.amountPaid ?? payment.amount) || 0).toLocaleString()}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                       <button onClick={() => handlePrintReceipt(payment)} className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center hover:bg-slate-800 transition-all">
                        <Printer size={14} />
                     </button>
                     <button className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center hover:text-slate-900 transition-all">
                        <MoreHorizontal size={14} />
                     </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
