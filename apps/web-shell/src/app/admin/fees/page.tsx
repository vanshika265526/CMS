"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  createFeeAdjustment,
  createFeeStructure,
  createScholarship,
  deleteFeeStructure,
  deleteScholarship,
  fetchBatches,
  fetchCourses,
  fetchFeeAdjustments,
  fetchFeeStructures,
  fetchFinancialSummary,
  fetchPayments,
  fetchStudentFeeLedger,
  fetchScholarships,
  updateFeeStructure,
  updateScholarship,
} from "@/lib/api/admin";
import {
  Download,
  Landmark,
  Plus,
  Search,
  TrendingUp,
  WalletCards,
} from "lucide-react";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const currency = (v: any) => INR.format(Number(v || 0));

const emptyStructureForm = {
  id: "",
  courseId: "",
  batchId: "",
  academicYear: "",
  tuitionFee: "",
  hostelFee: "",
  examFee: "",
  otherCharges: "",
  dueDate: "",
  lateFeeAmount: "",
  installmentPlan: "full",
};

const emptyScholarshipForm = {
  id: "",
  name: "",
  type: "percentage",
  value: "",
  categoryApplicable: "ALL",
};

export default function FeesPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [ledgerRows, setLedgerRows] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [expandedTimelineRows, setExpandedTimelineRows] = useState<Record<string, boolean>>({});

  const [filters, setFilters] = useState({
    status: "",
    courseId: "",
    batchId: "",
    startDate: "",
    endDate: "",
  });

  const [structureForm, setStructureForm] = useState<any>(emptyStructureForm);
  const [scholarshipForm, setScholarshipForm] = useState<any>(emptyScholarshipForm);
  const [adjustmentForm, setAdjustmentForm] = useState<any>({
    studentId: "",
    type: "waiver",
    amount: "",
    reason: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        summaryRes,
        coursesRes,
        batchesRes,
        structuresRes,
        scholarshipsRes,
        adjustmentsRes,
        paymentsRes,
        ledgerRes,
      ] = await Promise.all([
        fetchFinancialSummary(),
        fetchCourses(),
        fetchBatches(),
        fetchFeeStructures(),
        fetchScholarships(),
        fetchFeeAdjustments(),
        fetchPayments(filters),
        fetchStudentFeeLedger({
          batchId: filters.batchId,
          courseId: filters.courseId,
          status: filters.status,
        }),
      ]);

      if (summaryRes?.success) setSummary(summaryRes.data || {});
      if (coursesRes?.success) setCourses(coursesRes.data || []);
      if (batchesRes?.success) setBatches(batchesRes.data || []);
      if (structuresRes?.success) setStructures(structuresRes.data || []);
      if (scholarshipsRes?.success) setScholarships(scholarshipsRes.data || []);
      if (adjustmentsRes?.success) setAdjustments(adjustmentsRes.data || []);
      if (paymentsRes?.success) setPayments(paymentsRes.data || []);
      if (ledgerRes?.success) setLedgerRows(ledgerRes.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredPayments = useMemo(() => payments, [payments]);

  const exportCsv = async () => {
    const header = [
      "Transaction ID",
      "Student Name",
      "Enrollment ID",
      "Course",
      "Batch",
      "Amount",
      "Method",
      "Date",
      "Status",
    ];

    const refreshPaymentsRes = await fetchPayments(filters).catch(() => null);
    const exportPayments = Array.isArray(refreshPaymentsRes?.data)
      ? refreshPaymentsRes.data
      : filteredPayments;

    const rowsFromPayments = exportPayments.map((payment: any) => {
      const studentName = payment?.studentId?.personalInfo?.name
        || `${payment?.studentId?.personalInfo?.firstName || ""} ${payment?.studentId?.personalInfo?.lastName || ""}`.trim();
      const enrollment = payment?.studentId?.enrollmentId || payment?.studentId?.uniqueStudentId || "";
      const batch = batches.find((b: any) => String(b._id) === String(payment?.studentId?.batchId));
      const course = courses.find((c: any) => String(c._id) === String(batch?.courseId));

      return [
        payment?.razorpayPaymentId || payment?.transactionId || payment?._id || "",
        studentName,
        enrollment,
        course?.name || "",
        batch?.name || "",
        String(payment?.amountPaid ?? payment?.amount ?? 0),
        payment?.paymentMethod || payment?.mode || "",
        payment?.createdAt ? new Date(payment.createdAt).toISOString() : "",
        payment?.status || "",
      ];
    });

    const rowsFromLedgerTimeline = ledgerRows.flatMap((row: any) => {
      const timeline = Array.isArray(row?.payment_timeline) ? row.payment_timeline : [];
      return timeline
        .filter((entry: any) => ["Paid", "paid", "COMPLETED"].includes(String(entry?.status || "")))
        .map((entry: any) => [
          entry?.transaction_id || entry?.id || "",
          row?.student_name || "",
          row?.enrollment_id || "",
          row?.program || "",
          row?.batch || "",
          String(entry?.amount || 0),
          entry?.method || "",
          entry?.paid_at ? new Date(entry.paid_at).toISOString() : "",
          entry?.status || "",
        ]);
    });

    const rows = rowsFromPayments.length > 0 ? rowsFromPayments : rowsFromLedgerTimeline;

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `fee-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveStructure = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      courseId: structureForm.courseId,
      batchId: structureForm.batchId,
      academicYear: structureForm.academicYear,
      tuitionFee: Number(structureForm.tuitionFee || 0),
      hostelFee: Number(structureForm.hostelFee || 0),
      examFee: Number(structureForm.examFee || 0),
      otherCharges: Number(structureForm.otherCharges || 0),
      dueDate: structureForm.dueDate,
      lateFeeAmount: Number(structureForm.lateFeeAmount || 0),
      installmentPlan: structureForm.installmentPlan,
      semester: 1,
      finePerDay: 0,
      components: [
        { name: "tuition", amount: Number(structureForm.tuitionFee || 0) },
        { name: "hostel", amount: Number(structureForm.hostelFee || 0) },
        { name: "exam", amount: Number(structureForm.examFee || 0) },
        { name: "other", amount: Number(structureForm.otherCharges || 0) },
      ],
    };

    if (structureForm.id) {
      await updateFeeStructure(structureForm.id, payload);
    } else {
      await createFeeStructure(payload);
    }
    setStructureForm(emptyStructureForm);
    await loadData();
  };

  const saveScholarship = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name: scholarshipForm.name,
      type: scholarshipForm.type,
      value: Number(scholarshipForm.value || 0),
      categoryApplicable: scholarshipForm.categoryApplicable,
    };

    if (scholarshipForm.id) {
      await updateScholarship(scholarshipForm.id, payload);
    } else {
      await createScholarship(payload);
    }

    setScholarshipForm(emptyScholarshipForm);
    await loadData();
  };

  const addAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    await createFeeAdjustment({
      studentId: adjustmentForm.studentId,
      type: adjustmentForm.type,
      amount: Number(adjustmentForm.amount || 0),
      reason: adjustmentForm.reason,
    });
    setAdjustmentForm({ studentId: "", type: "waiver", amount: "", reason: "" });
    await loadData();
  };

  const toggleTimelineRow = (studentId: string) => {
    setExpandedTimelineRows((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight">Bursar's Office</h1>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Institutional Financial Control & Billing</p>
        </div>
        <button onClick={exportCsv} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Revenue" value={currency(summary?.totalRevenue || 0)} subtitle={summary?.collectionEfficiency || "0%"} icon={<TrendingUp size={20} />} />
        <StatCard title="Pending Collections" value={currency(summary?.pendingCollections || 0)} subtitle="Across all active students" icon={<WalletCards size={20} />} />
        <StatCard title="Scholarship Fund" value={currency(summary?.scholarshipFund || 0)} subtitle="Total discounts granted" icon={<Landmark size={20} />} />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400 font-bold">Loading fee data...</div>
      ) : (
        <>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6">
              <h2 className="font-black text-slate-900 uppercase tracking-wide mb-4">Fee Structure Management</h2>
              <form onSubmit={saveStructure} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                <select className="border border-slate-200 rounded-xl px-3 py-2" value={structureForm.courseId} onChange={(e) => setStructureForm({ ...structureForm, courseId: e.target.value })} required>
                  <option value="">Select Course</option>
                  {courses.map((course: any) => <option key={course._id} value={course._id}>{course.name}</option>)}
                </select>
                <select className="border border-slate-200 rounded-xl px-3 py-2" value={structureForm.batchId} onChange={(e) => setStructureForm({ ...structureForm, batchId: e.target.value })} required>
                  <option value="">Select Batch</option>
                  {batches.map((batch: any) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
                </select>
                <input className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Academic Year" value={structureForm.academicYear} onChange={(e) => setStructureForm({ ...structureForm, academicYear: e.target.value })} required />
                <input type="date" className="border border-slate-200 rounded-xl px-3 py-2" value={structureForm.dueDate} onChange={(e) => setStructureForm({ ...structureForm, dueDate: e.target.value })} required />
                <input type="number" className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Tuition Fee" value={structureForm.tuitionFee} onChange={(e) => setStructureForm({ ...structureForm, tuitionFee: e.target.value })} required />
                <input type="number" className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Hostel Fee" value={structureForm.hostelFee} onChange={(e) => setStructureForm({ ...structureForm, hostelFee: e.target.value })} />
                <input type="number" className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Exam Fee" value={structureForm.examFee} onChange={(e) => setStructureForm({ ...structureForm, examFee: e.target.value })} />
                <input type="number" className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Other Charges" value={structureForm.otherCharges} onChange={(e) => setStructureForm({ ...structureForm, otherCharges: e.target.value })} />
                <input type="number" className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Late Fee Amount" value={structureForm.lateFeeAmount} onChange={(e) => setStructureForm({ ...structureForm, lateFeeAmount: e.target.value })} />
                <select className="border border-slate-200 rounded-xl px-3 py-2" value={structureForm.installmentPlan} onChange={(e) => setStructureForm({ ...structureForm, installmentPlan: e.target.value })}>
                  <option value="full">Full</option>
                  <option value="semester">Semester</option>
                  <option value="quarterly">Quarterly</option>
                </select>
                <button className="md:col-span-2 bg-slate-900 text-white rounded-xl py-2 text-xs font-black uppercase tracking-widest flex justify-center items-center gap-2">
                  <Plus size={14} /> {structureForm.id ? "Update Structure" : "New Structure"}
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                      <th className="py-2">Course</th>
                      <th className="py-2">Batch</th>
                      <th className="py-2">Year</th>
                      <th className="py-2">Total</th>
                      <th className="py-2">Due</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {structures.map((item: any) => {
                      const total = Number(item.tuitionFee || 0) + Number(item.hostelFee || 0) + Number(item.examFee || 0) + Number(item.otherCharges || 0);
                      return (
                        <tr key={item._id} className="border-t border-slate-100">
                          <td className="py-2">{item.courseId?.name || "-"}</td>
                          <td className="py-2">{item.batchId?.name || "-"}</td>
                          <td className="py-2">{item.academicYear || "-"}</td>
                          <td className="py-2">{currency(total)}</td>
                          <td className="py-2">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "-"}</td>
                          <td className="py-2 space-x-2">
                            <button className="text-indigo-600 text-xs font-bold" onClick={() => setStructureForm({
                              id: item._id,
                              courseId: item.courseId?._id || "",
                              batchId: item.batchId?._id || "",
                              academicYear: item.academicYear || "",
                              tuitionFee: String(item.tuitionFee || 0),
                              hostelFee: String(item.hostelFee || 0),
                              examFee: String(item.examFee || 0),
                              otherCharges: String(item.otherCharges || 0),
                              dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : "",
                              lateFeeAmount: String(item.lateFeeAmount || 0),
                              installmentPlan: item.installmentPlan || "full",
                            })}>Edit</button>
                            <button className="text-rose-600 text-xs font-bold" onClick={async () => { await deleteFeeStructure(item._id); await loadData(); }}>Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="font-black text-slate-900 uppercase tracking-wide mb-4">Scholarship Management</h2>
                <form onSubmit={saveScholarship} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  <input className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Scholarship Name" value={scholarshipForm.name} onChange={(e) => setScholarshipForm({ ...scholarshipForm, name: e.target.value })} required />
                  <select className="border border-slate-200 rounded-xl px-3 py-2" value={scholarshipForm.type} onChange={(e) => setScholarshipForm({ ...scholarshipForm, type: e.target.value })}>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed</option>
                  </select>
                  <input type="number" className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Value" value={scholarshipForm.value} onChange={(e) => setScholarshipForm({ ...scholarshipForm, value: e.target.value })} required />
                  <select className="border border-slate-200 rounded-xl px-3 py-2" value={scholarshipForm.categoryApplicable} onChange={(e) => setScholarshipForm({ ...scholarshipForm, categoryApplicable: e.target.value })}>
                    <option value="ALL">ALL</option>
                    <option value="GEN">GEN</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="OBC">OBC</option>
                  </select>
                  <button className="md:col-span-2 bg-slate-900 text-white rounded-xl py-2 text-xs font-black uppercase tracking-widest">
                    {scholarshipForm.id ? "Update Scholarship" : "New Scholarship"}
                  </button>
                </form>
                <ul className="space-y-2">
                  {scholarships.map((item: any) => (
                    <li key={item._id} className="flex items-center justify-between border border-slate-100 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.type} - {item.value} - {item.categoryApplicable}</p>
                      </div>
                      <div className="space-x-2">
                        <button className="text-indigo-600 text-xs font-bold" onClick={() => setScholarshipForm({ id: item._id, name: item.name, type: item.type, value: String(item.value), categoryApplicable: item.categoryApplicable })}>Edit</button>
                        <button className="text-rose-600 text-xs font-bold" onClick={async () => { await deleteScholarship(item._id); await loadData(); }}>Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6">
                <h2 className="font-black text-slate-900 uppercase tracking-wide mb-4">Manual Fee Adjustments</h2>
                <form onSubmit={addAdjustment} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Student ID" value={adjustmentForm.studentId} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, studentId: e.target.value })} required />
                  <select className="border border-slate-200 rounded-xl px-3 py-2" value={adjustmentForm.type} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, type: e.target.value })}>
                    <option value="waiver">Waiver</option>
                    <option value="extra_charge">Extra Charge</option>
                    <option value="late_fee">Late Fee</option>
                  </select>
                  <input type="number" className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Amount" value={adjustmentForm.amount} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })} required />
                  <input className="border border-slate-200 rounded-xl px-3 py-2" placeholder="Reason" value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })} required />
                  <button className="md:col-span-2 bg-slate-900 text-white rounded-xl py-2 text-xs font-black uppercase tracking-widest">Add Adjustment</button>
                </form>
                <div className="mt-3 space-y-2 max-h-48 overflow-auto">
                  {adjustments.map((item: any) => (
                    <div key={item._id} className="text-xs border border-slate-100 rounded-lg p-2">
                      <p className="font-bold text-slate-900">{item.studentId?.personalInfo?.firstName} {item.studentId?.personalInfo?.lastName} - {item.type}</p>
                      <p className="text-slate-600">{currency(item.amount)} - {item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-slate-900 uppercase tracking-wide">Revenue Streams Table</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
              <select className="border border-slate-200 rounded-xl px-3 py-2" value={filters.courseId} onChange={(e) => setFilters({ ...filters, courseId: e.target.value })}>
                <option value="">All Courses</option>
                {courses.map((course: any) => <option key={course._id} value={course._id}>{course.name}</option>)}
              </select>
              <select className="border border-slate-200 rounded-xl px-3 py-2" value={filters.batchId} onChange={(e) => setFilters({ ...filters, batchId: e.target.value })}>
                <option value="">All Batches</option>
                {batches.map((batch: any) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
              </select>
              <select className="border border-slate-200 rounded-xl px-3 py-2" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
              </select>
              <input type="date" className="border border-slate-200 rounded-xl px-3 py-2" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
              <input type="date" className="border border-slate-200 rounded-xl px-3 py-2" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
            </div>

            <button onClick={loadData} className="mb-4 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Search size={14} /> Apply Filters
            </button>

            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-3">Student Fee Ledger (Batch-wise / Program-wise)</h3>
            <div className="overflow-x-auto mb-8">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-2">Student Name</th>
                    <th className="py-2">Enrollment ID</th>
                    <th className="py-2">Program</th>
                    <th className="py-2">Batch</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Final Payable</th>
                    <th className="py-2">Paid</th>
                    <th className="py-2">Left</th>
                    <th className="py-2">Last Paid</th>
                    <th className="py-2">Last Paid At</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row: any) => {
                    const studentId = String(row.student_id || "");
                    const timelineEntries = Array.isArray(row.payment_timeline) ? row.payment_timeline : [];
                    const paidTimelineEntries = timelineEntries.filter((entry: any) =>
                      ["Paid", "paid", "COMPLETED"].includes(String(entry?.status || ""))
                    );
                    const isExpanded = Boolean(expandedTimelineRows[studentId]);

                    return (
                      <React.Fragment key={studentId || row.enrollment_id}>
                        <tr className="border-t border-slate-100">
                          <td className="py-2">{row.student_name || "-"}</td>
                          <td className="py-2">{row.enrollment_id || "-"}</td>
                          <td className="py-2">{row.program || "-"}</td>
                          <td className="py-2">{row.batch || "-"}</td>
                          <td className="py-2">{currency(row.total_fee || 0)}</td>
                          <td className="py-2">{currency(row.final_fee || 0)}</td>
                          <td className="py-2 text-emerald-700 font-bold">{currency(row.paid_amount || 0)}</td>
                          <td className="py-2 text-rose-700 font-bold">{currency(row.due_amount || 0)}</td>
                          <td className="py-2">{currency(row.last_paid_amount || 0)}</td>
                          <td className="py-2">{row.last_paid_at ? new Date(row.last_paid_at).toLocaleString() : "-"}</td>
                          <td className="py-2">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${String(row.payment_status).toLowerCase() === "paid" ? "bg-emerald-50 text-emerald-600" : String(row.payment_status).toLowerCase() === "partial" ? "bg-amber-50 text-amber-600" : String(row.payment_status).toLowerCase() === "not configured" ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-600"}`}>
                              {row.payment_status || "N/A"}
                            </span>
                            {row.fee_note ? (
                              <p className="text-[10px] text-slate-500 mt-1">{row.fee_note}</p>
                            ) : null}
                          </td>
                          <td className="py-2">
                            <button
                              type="button"
                              onClick={() => toggleTimelineRow(studentId)}
                              className="px-3 py-1 rounded-lg border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                            >
                              {isExpanded ? "Hide" : "View"}
                            </button>
                          </td>
                        </tr>
                        {isExpanded ? (
                          <tr className="bg-slate-50/60 border-t border-slate-100">
                            <td colSpan={12} className="py-3 px-2">
                              {paidTimelineEntries.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="text-left uppercase tracking-widest text-slate-500">
                                        <th className="py-2">Amount</th>
                                        <th className="py-2">Date & Time</th>
                                        <th className="py-2">Transaction ID</th>
                                        <th className="py-2">Method</th>
                                        <th className="py-2">Receipt</th>
                                        <th className="py-2">Installment</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {paidTimelineEntries.map((entry: any) => (
                                        <tr key={String(entry.id)} className="border-t border-slate-100">
                                          <td className="py-2 font-bold text-emerald-700">{currency(entry.amount || 0)}</td>
                                          <td className="py-2">{entry.paid_at ? new Date(entry.paid_at).toLocaleString() : "-"}</td>
                                          <td className="py-2">{entry.transaction_id || "-"}</td>
                                          <td className="py-2">{entry.method || "-"}</td>
                                          <td className="py-2">{entry.receipt_number || "-"}</td>
                                          <td className="py-2">{entry.installment_number ? `#${entry.installment_number}` : "Full/Custom"}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">No paid transactions found</p>
                              )}
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                  {ledgerRows.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">No student fee records found for selected filters</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-widest text-slate-500">
                    <th className="py-2">Transaction ID</th>
                    <th className="py-2">Student Name</th>
                    <th className="py-2">Enrollment ID</th>
                    <th className="py-2">Course</th>
                    <th className="py-2">Batch</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Method</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment: any) => {
                    const studentName = payment?.studentId?.personalInfo?.name
                      || `${payment?.studentId?.personalInfo?.firstName || ""} ${payment?.studentId?.personalInfo?.lastName || ""}`.trim();
                    const enrollment = payment?.studentId?.enrollmentId || payment?.studentId?.uniqueStudentId || "-";
                    const batch = batches.find((b: any) => String(b._id) === String(payment?.studentId?.batchId));
                    const course = courses.find((c: any) => String(c._id) === String(batch?.courseId));
                    const status = String(payment?.status || "");
                    return (
                      <tr key={payment._id} className="border-t border-slate-100">
                        <td className="py-2">{payment?.razorpayPaymentId || payment?.transactionId || payment?._id}</td>
                        <td className="py-2">{studentName || "-"}</td>
                        <td className="py-2">{enrollment}</td>
                        <td className="py-2">{course?.name || "-"}</td>
                        <td className="py-2">{batch?.name || "-"}</td>
                        <td className="py-2">{currency(payment?.amountPaid ?? payment?.amount ?? 0)}</td>
                        <td className="py-2">{payment?.paymentMethod || payment?.mode || "-"}</td>
                        <td className="py-2">{payment?.createdAt ? new Date(payment.createdAt).toLocaleString() : "-"}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${status.toLowerCase() === "paid" || status === "COMPLETED" ? "bg-emerald-50 text-emerald-600" : status.toLowerCase() === "failed" ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"}`}>
                            {status || "N/A"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">{title}</p>
        <div className="text-indigo-600">{icon}</div>
      </div>
      <p className="text-3xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}
