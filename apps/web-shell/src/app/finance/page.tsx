"use client";

import React, { useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Link from "next/link";
import jsPDF from "jspdf";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  History,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createFeeOrder,
  fetchMyFeeCalculation,
  verifyFeePayment,
} from "@/lib/api/fees";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatCurrency = (value: number) => INR.format(Number(value || 0));
const isDevMode = process.env.NODE_ENV !== "production";

export default function FinancePortal() {
  const [feeData, setFeeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState<any>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [payAmountInput, setPayAmountInput] = useState<string>("");

  useEffect(() => {
    const scriptId = "razorpay-checkout-script";
    if (document.getElementById(scriptId)) {
      setRazorpayReady(true);
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => setRazorpayReady(true);
    script.onerror = () => setNotice("Unable to load payment gateway. Please refresh.");
    document.head.appendChild(script);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetchMyFeeCalculation();
      if (response?.success) {
        setFeeData(response.data);
        const due = Number(response?.data?.due_amount || 0);
        setPayAmountInput(due > 0 ? String(due) : "");
      }
    } catch (error) {
      console.error("Failed to load fee data", error);
      setNotice("Unable to load fee data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const user = useMemo(() => {
    if (typeof window === "undefined") return {} as any;
    return JSON.parse(localStorage.getItem("user") || "{}");
  }, []);

  const generateReceipt = (paymentPayload?: any) => {
    const data = feeData || {};
    const paymentId = paymentPayload?.razorpay_payment_id || paymentPayload?.razorpayPaymentId || "N/A";
    const paidAmount = Number(paymentPayload?.amount || paymentPayload?.amountPaid || 0);
    const date = paymentPayload?.paid_at || paymentPayload?.paymentDate || paymentPayload?.createdAt
      ? new Date(paymentPayload?.paid_at || paymentPayload?.paymentDate || paymentPayload?.createdAt).toLocaleString()
      : new Date().toLocaleString();
    const paidByText =
      String(user?.role || "").toUpperCase() === "PARENT"
        ? `${user?.name || "Parent"} on behalf of ${data?.student_name || "Student"}`
        : user?.name || "Student";

    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("College Fee Payment Receipt", 14, 20);
    pdf.setFontSize(11);
    pdf.text(`College: ${data?.college_name || "College Name"}`, 14, 30);
    pdf.text(`Student: ${data?.student_name || "Student"}`, 14, 38);
    pdf.text(`Roll Number: ${data?.roll_number || "N/A"}`, 14, 46);
    pdf.text(`Course: ${data?.course_name || "N/A"}`, 14, 54);
    pdf.text(`Batch: ${data?.batch_name || "N/A"}`, 14, 62);
    pdf.text(`Paid By: ${paidByText}`, 14, 70);
    pdf.text(`Transaction ID: ${paymentId}`, 14, 78);
    pdf.text(`Receipt Number: ${paymentPayload?.receiptNumber || "N/A"}`, 14, 86);
    pdf.text(`Amount Paid: ${formatCurrency(paidAmount)}`, 14, 94);
    pdf.text(`Date: ${date}`, 14, 102);
    pdf.save(`receipt-${paymentId}.pdf`);
  };

  const beginPayment = async (amount: number, installmentNumber?: number) => {
    if (!feeData?.student_id) {
      setNotice("Student context missing for payment.");
      return;
    }
    const dueNow = Number(feeData?.due_amount || 0);
    if (!amount || amount <= 0) {
      setNotice("No payable amount available.");
      return;
    }
    if (amount > dueNow) {
      setNotice(`Entered amount exceeds due amount of ${formatCurrency(dueNow)}.`);
      return;
    }
    if (!razorpayReady || typeof window === "undefined" || !window.Razorpay) {
      setNotice("Payment gateway is still loading. Please retry.");
      return;
    }

    setPaying(true);
    setNotice("");

    try {
      const orderRes = await createFeeOrder({
        student_id: String(feeData.student_id),
        amount,
        installment_number: installmentNumber,
      });

      const order = orderRes?.data;
      if (!order?.id) {
        throw new Error("Failed to create payment order");
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_",
        amount: order.amount,
        currency: order.currency || "INR",
        name: "College Name",
        description: installmentNumber ? `Installment ${installmentNumber} Fee Payment` : "Fee Payment",
        order_id: order.id,
        handler: async function (response: any) {
          const verifyRes = await verifyFeePayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (!verifyRes?.success) {
            throw new Error(verifyRes?.message || "Payment verification failed");
          }

          const verifiedPayment = verifyRes?.data?.payment || {};
          const successPayload = {
            razorpay_payment_id: response.razorpay_payment_id,
            amount: Number(verifiedPayment?.amountPaid ?? verifiedPayment?.amount ?? amount),
            paid_at: verifiedPayment?.paymentDate || verifiedPayment?.createdAt || new Date().toISOString(),
            receiptNumber: verifiedPayment?.receiptNumber || "N/A",
          };
          setSuccess(successPayload);
          await loadData();
        },
        prefill: {
          name: user?.name || feeData?.student_name || "Student",
          email: user?.email || feeData?.student_email || "",
          contact: user?.phone || feeData?.student_phone || "",
        },
        theme: { color: "#6366f1" },
      };

      const checkout = new window.Razorpay(options);
      checkout.on("payment.failed", () => {
        setNotice("Payment failed. Please try again.");
      });
      checkout.open();
    } catch (error: any) {
      console.error("Payment flow failed", error);
      setNotice(error?.response?.data?.message || error?.message || "Payment failed. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading Finance Ledger...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-3xl mx-auto w-full py-16">
        <Card className="p-10 rounded-3xl border border-emerald-100 bg-white shadow-ambient text-center">
          <CheckCircle2 size={64} className="mx-auto text-emerald-500 mb-4" />
          <h1 className="text-3xl font-black text-slate-900">Payment Successful!</h1>
          <p className="text-slate-500 mt-2">Your transaction has been verified successfully.</p>
          <div className="mt-8 text-left space-y-2 bg-slate-50 border border-slate-100 rounded-2xl p-5">
            <p className="text-sm"><span className="font-bold">Transaction ID:</span> {success.razorpay_payment_id}</p>
            <p className="text-sm"><span className="font-bold">Amount Paid:</span> {formatCurrency(success.amount)}</p>
            <p className="text-sm"><span className="font-bold">Date & Time:</span> {new Date(success.paid_at).toLocaleString()}</p>
          </div>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => generateReceipt(success)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all"
            >
              Download Receipt
            </button>
            <button
              onClick={() => setSuccess(null)}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all"
            >
              Back to Dashboard
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const dueAmount = Number(feeData?.due_amount || 0);
  const paidAmount = Number(feeData?.paid_amount || 0);
  const finalFee = Number(feeData?.final_fee || 0);
  const enteredAmount = Number(payAmountInput || 0);
  const canPayEntered = enteredAmount > 0 && enteredAmount <= dueAmount;
  const installments = Array.isArray(feeData?.installments) ? feeData.installments : [];
  const payments = Array.isArray(feeData?.payments) ? feeData.payments : [];
  const paidTransactions = payments.filter((payment: any) =>
    ["Paid", "paid", "COMPLETED"].includes(String(payment?.status || ""))
  );
  const fullPaidInSingleTxn =
    dueAmount <= 0
    && paidTransactions.length === 1
    && !paidTransactions[0]?.installmentNumber
    && Number(paidTransactions[0]?.amountPaid ?? paidTransactions[0]?.amount ?? 0) >= finalFee;

  return (
    <div className="max-w-7xl mx-auto w-full space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
      {notice ? <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{notice}</div> : null}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <nav className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            <Link href="/" className="hover:text-indigo-600 transition-colors">Portal</Link>
            <ArrowUpRight size={10} className="text-slate-300" />
            <span className="text-slate-900">Financial Governance</span>
          </nav>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">Fees & Payments</h1>
          <p className="text-sm font-medium text-slate-500 mt-4 max-w-md leading-relaxed">
            Dynamic fee computation with scholarship, category, adjustments and payment reconciliation.
          </p>
        </div>

        <div className="w-full md:w-auto space-y-2">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-2">
            <label htmlFor="payAmount" className="text-[10px] font-black uppercase tracking-widest text-slate-500">Amount</label>
            <input
              id="payAmount"
              type="number"
              min={1}
              max={Math.max(0, dueAmount)}
              step="0.01"
              value={payAmountInput}
              onChange={(e) => setPayAmountInput(e.target.value)}
              className="w-36 md:w-40 bg-transparent outline-none text-sm font-black text-slate-900"
              placeholder="Enter amount"
            />
            <button
              onClick={() => setPayAmountInput(String(dueAmount))}
              className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
              type="button"
            >
              Max
            </button>
          </div>
          <button
            onClick={() => beginPayment(enteredAmount)}
            disabled={paying || dueAmount <= 0 || !canPayEntered}
            className="w-full px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
          >
            {paying ? "Processing..." : "Pay Selected Amount"}
          </button>
        </div>
      </div>

      {isDevMode ? (
        <Card className="p-4 border border-amber-200 bg-amber-50 rounded-2xl">
          <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">Test Mode Card Details</p>
          <p className="text-sm text-amber-800">Card Number: 4111 1111 1111 1111 | Expiry: Any future date | CVV: Any 3 digits | OTP: 1234</p>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard title="Total Fees" value={formatCurrency(finalFee)} icon={<CreditCard size={20} />} color="bg-slate-50 text-slate-700" />
        <StatusCard title="Paid Amount" value={formatCurrency(paidAmount)} icon={<CheckCircle2 size={20} />} color="bg-emerald-50 text-emerald-600 border border-emerald-100" />
        <StatusCard
          title="Due Amount"
          value={formatCurrency(dueAmount)}
          icon={<AlertCircle size={20} />}
          color={dueAmount > 0 ? "bg-rose-50 text-rose-600 border border-rose-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Fee Breakdown</h2>
          <Card className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
            <div className="divide-y divide-slate-100">
              <BreakdownRow label="Tuition Fee" value={Number(feeData?.tuition_fee || 0)} />
              <BreakdownRow label="Hostel Fee" value={Number(feeData?.hostel_fee || 0)} />
              <BreakdownRow label="Exam Fee" value={Number(feeData?.exam_fee || 0)} />
              <BreakdownRow label="Other Charges" value={Number(feeData?.other_charges || 0)} />
              <BreakdownRow label="Subtotal" value={Number(feeData?.total_fee || 0)} emphasized />
              <BreakdownRow label="Scholarship Discount" value={-Number(feeData?.scholarship_discount || 0)} valueClass="text-emerald-600" />
              <BreakdownRow label="Category Discount" value={-Number(feeData?.category_discount || 0)} valueClass="text-emerald-600" />
              <BreakdownRow label="Late Fee" value={Number(feeData?.late_fee || 0)} valueClass={Number(feeData?.late_fee || 0) > 0 ? "text-rose-600" : "text-slate-900"} />
              <BreakdownRow label="Manual Adjustments" value={Number(feeData?.manual_adjustments || 0)} />
              <BreakdownRow label="Total Payable" value={finalFee} emphasized />
              <BreakdownRow label="Amount Paid" value={paidAmount} valueClass="text-emerald-600" />
              <BreakdownRow label="Balance Due" value={dueAmount} emphasized valueClass={dueAmount > 0 ? "text-rose-600" : "text-emerald-600"} />
            </div>
          </Card>

          {installments.length > 0 ? (
            <>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Installment Plan</h2>
              {fullPaidInSingleTxn ? (
                <Card className="p-5 border border-emerald-100 rounded-2xl bg-emerald-50/60">
                  <p className="text-sm font-black text-emerald-700 uppercase tracking-widest">Fully Settled In One Payment</p>
                  <p className="text-sm text-emerald-700 mt-2">
                    Installments are auto-settled because the complete due amount was paid in one transaction.
                  </p>
                </Card>
              ) : null}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {installments.map((installment: any) => {
                  const canPayInstallment = installment.status !== "Paid" && dueAmount > 0;
                  const displayStatus = fullPaidInSingleTxn ? "Settled" : installment.status;
                  return (
                    <Card key={installment.number} className="p-5 border border-slate-100 rounded-2xl bg-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-black text-slate-900">Installment {installment.number}</p>
                          <p className="text-xs text-slate-500 mt-1">Due: {new Date(installment.due_date).toLocaleDateString()}</p>
                          <p className="text-lg font-black text-slate-900 mt-2">{formatCurrency(Number(installment.amount || 0))}</p>
                        </div>
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          displayStatus === "Paid" || displayStatus === "Settled"
                            ? "bg-emerald-50 text-emerald-600"
                            : displayStatus === "Overdue"
                              ? "bg-rose-50 text-rose-600"
                              : "bg-amber-50 text-amber-600"
                        )}>
                          {displayStatus}
                        </span>
                      </div>
                      {canPayInstallment ? (
                        <button
                          onClick={() => beginPayment(Number(installment.amount || 0), Number(installment.number))}
                          disabled={paying}
                          className="mt-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50"
                        >
                          Pay Now
                        </button>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </>
          ) : null}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Transactions</h2>
          <div className="space-y-4">
            {payments.length > 0 ? (
              payments.map((payment: any) => {
                const amount = Number(payment?.amountPaid ?? payment?.amount ?? 0);
                const isPaid = ["Paid", "paid", "COMPLETED"].includes(String(payment?.status || ""));
                const txId = payment?.razorpayPaymentId || payment?.transactionId || payment?._id;
                return (
                  <div key={payment._id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{formatCurrency(amount)}</p>
                        <p className="text-xs text-slate-500">{new Date(payment.createdAt).toLocaleString()}</p>
                        <p className="text-xs text-slate-400 mt-1">Txn: {txId}</p>
                      </div>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        isPaid ? "bg-emerald-50 text-emerald-600" : String(payment?.status || "").toLowerCase() === "failed" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Method: {payment.paymentMethod || payment.mode || "N/A"}</p>
                      {isPaid ? (
                        <button onClick={() => generateReceipt({ ...payment, razorpay_payment_id: txId, amount })} className="text-indigo-600 text-xs font-bold hover:text-indigo-700 flex items-center gap-1">
                          Download Receipt <Download size={12} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                <History size={32} className="mx-auto text-slate-200 mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No Transactions Recorded</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusCard({ title, value, icon, color }: any) {
  return (
    <Card className={cn("p-8 rounded-3xl flex items-center justify-between group hover:scale-[1.02] transition-all duration-300", color)}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">{title}</p>
        <span className="text-3xl font-black tracking-tight">{value}</span>
      </div>
      <div className="w-14 h-14 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-sm">{icon}</div>
    </Card>
  );
}

function BreakdownRow({ label, value, emphasized, valueClass }: { label: string; value: number; emphasized?: boolean; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <p className={cn("text-sm", emphasized ? "font-black text-slate-900" : "font-semibold text-slate-600")}>{label}</p>
      <p className={cn("text-sm font-black", valueClass || "text-slate-900")}>{formatCurrency(value)}</p>
    </div>
  );
}
