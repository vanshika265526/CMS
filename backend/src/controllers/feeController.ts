import crypto from "crypto";
import { Request, Response } from "express";
// @ts-ignore
import Razorpay from "razorpay";
import FeeAdjustment from "../models/FeeAdjustment.js";
import FeeStructure from "../models/FeeStructure.js";
import Payment from "../models/Payment.js";
import Scholarship from "../models/Scholarship.js";
import Student from "../models/Student.js";
import Course from "../models/Course.js";
import Batch from "../models/Batch.js";
import Parent from "../models/Parent.js";
import { calculateStudentFee } from "../services/feeService.js";
import { generateReceiptNo } from "../utils/generateReceiptNo.js";

const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured");
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
};

const getScopedStudentIds = async (collegeId?: string) => {
  if (!collegeId) return [];
  const students = await Student.find({ collegeId }).select("_id");
  return students.map((s) => s._id);
};

const toNumber = (value: any) => Number(value || 0);

export const getStudentFeeCalculation = async (req: Request, res: Response) => {
  try {
    const { student_id } = req.params as any;
    const collegeId = String((req as any).user?.collegeId || "");
    const role = String((req as any).user?.role || "").toUpperCase();
    const userId = String((req as any).user?._id || "");

    if (!student_id) {
      return res.status(400).json({ success: false, message: "student_id is required" });
    }

    if (role === "STUDENT") {
      const ownStudent = await Student.findOne({ userId, collegeId }).select("_id");
      if (!ownStudent || String(ownStudent._id) !== String(student_id)) {
        return res.status(403).json({ success: false, message: "Not authorized for this student" });
      }
    }

    if (role === "PARENT") {
      const parent = await Parent.findOne({ userId }).select("students");
      const linkedIds = (parent?.students || []).map((id: any) => String(id));
      if (!linkedIds.includes(String(student_id))) {
        return res.status(403).json({ success: false, message: "Not authorized for this student" });
      }
    }

    const data = await calculateStudentFee(String(student_id), collegeId);
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getMyFeeCalculation = async (req: Request, res: Response) => {
  try {
    const role = String((req as any).user?.role || "").toUpperCase();
    const collegeId = String((req as any).user?.collegeId || "");
    const userId = String((req as any).user?._id || "");

    let studentId: string | null = null;
    if (role === "STUDENT") {
      const student = await Student.findOne({ userId, collegeId }).select("_id");
      studentId = student?._id ? String(student._id) : null;
    } else if (role === "PARENT") {
      const parent = await Parent.findOne({ userId }).select("students");
      studentId = parent?.students?.[0] ? String(parent.students[0]) : null;
    }

    if (!studentId) {
      return res.status(404).json({ success: false, message: "Linked student not found" });
    }

    try {
      const scopedCollegeId = role === "PARENT" ? undefined : collegeId;
      const data = await calculateStudentFee(studentId, scopedCollegeId);
      return res.status(200).json({ success: true, data });
    } catch (calcError: any) {
      const knownConfigIssue = [
        "Fee structure not found",
        "Student batch not found",
        "Course mapping not found for batch",
      ].some((key) => String(calcError?.message || "").includes(key));

      if (knownConfigIssue) {
        return res.status(200).json({
          success: true,
          data: {
            student_id: studentId,
            total_fee: 0,
            tuition_fee: 0,
            hostel_fee: 0,
            exam_fee: 0,
            other_charges: 0,
            scholarship_discount: 0,
            category_discount: 0,
            manual_adjustments: 0,
            late_fee: 0,
            final_fee: 0,
            paid_amount: 0,
            due_amount: 0,
            due_date: null,
            installment_plan: "full",
            installments: [],
            adjustments: [],
            payments: [],
            note: calcError.message,
          },
        });
      }

      throw calcError;
    }
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getStudentFeeLedger = async (req: Request, res: Response) => {
  try {
    const collegeId = String((req as any).user?.collegeId || "");
    const { batchId, courseId, status, q } = req.query as any;

    const studentQuery: any = { collegeId };
    if (batchId) {
      studentQuery.batchId = batchId;
    }
    if (q) {
      studentQuery.$or = [
        { uniqueStudentId: { $regex: q, $options: "i" } },
        { enrollmentId: { $regex: q, $options: "i" } },
        { "personalInfo.firstName": { $regex: q, $options: "i" } },
        { "personalInfo.lastName": { $regex: q, $options: "i" } },
      ];
    }

    const students = await Student.find(studentQuery)
      .select("uniqueStudentId enrollmentId personalInfo.firstName personalInfo.lastName personalInfo.name academicInfo.status batchId")
      .sort({ createdAt: -1 })
      .lean();

    const batchIds = Array.from(
      new Set(students.map((s: any) => String(s.batchId || "")).filter(Boolean))
    );
    const batches = await Batch.find({ _id: { $in: batchIds } })
      .select("name courseId")
      .lean();
    const batchMap = new Map(batches.map((b: any) => [String(b._id), b]));

    const courseIds = Array.from(
      new Set(batches.map((b: any) => String(b.courseId || "")).filter(Boolean))
    );
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select("name")
      .lean();
    const courseMap = new Map(courses.map((c: any) => [String(c._id), c]));

    const rows = await Promise.all(
      students.map(async (student: any) => {
        const studentName = student?.personalInfo?.name
          || `${student?.personalInfo?.firstName || ""} ${student?.personalInfo?.lastName || ""}`.trim();

        const batch = student?.batchId ? batchMap.get(String(student.batchId)) : null;
        const course = batch?.courseId ? courseMap.get(String(batch.courseId)) : null;

        let fee: any = null;
        let feeError = "";
        try {
          fee = await calculateStudentFee(String(student._id), collegeId);
        } catch (error: any) {
          feeError = String(error?.message || "Fee not configured");
        }

        const finalFee = Number(fee?.final_fee || 0);
        const paidAmount = Number(fee?.paid_amount || 0);
        const dueAmount = Number(fee?.due_amount || 0);
        const paymentTimeline = Array.isArray(fee?.payments)
          ? fee.payments.map((p: any) => ({
              id: p?._id,
              amount: Number(p?.amountPaid ?? p?.amount ?? 0),
              status: String(p?.status || ""),
              method: p?.paymentMethod || p?.mode || "N/A",
              transaction_id: p?.razorpayPaymentId || p?.transactionId || p?._id,
              receipt_number: p?.receiptNumber || "N/A",
              installment_number: p?.installmentNumber || null,
              paid_at: p?.paymentDate || p?.createdAt || null,
            }))
          : [];
        const paidTransactions = Array.isArray(fee?.payments)
          ? fee.payments.filter((p: any) => ["Paid", "paid", "COMPLETED"].includes(String(p?.status || "")))
          : [];
        const lastPaidPayment = paidTransactions.length > 0 ? paidTransactions[0] : null;
        const lastPaidAmount = Number(lastPaidPayment?.amountPaid ?? lastPaidPayment?.amount ?? 0);
        const lastPaidAt = lastPaidPayment?.paymentDate || lastPaidPayment?.createdAt || null;

        let paymentStatus = "Unpaid";
        if (finalFee > 0 && dueAmount <= 0) {
          paymentStatus = "Paid";
        } else if (paidAmount > 0 && dueAmount > 0) {
          paymentStatus = "Partial";
        } else if (!fee && feeError) {
          paymentStatus = "Not Configured";
        }

        return {
          student_id: student._id,
          student_name: studentName || "-",
          enrollment_id: student?.enrollmentId || student?.uniqueStudentId || "-",
          program: course?.name || "-",
          batch: batch?.name || "-",
          total_fee: Number(fee?.total_fee || 0),
          final_fee: finalFee,
          paid_amount: paidAmount,
          due_amount: dueAmount,
          last_paid_amount: lastPaidAmount,
          last_paid_at: lastPaidAt,
          payment_timeline: paymentTimeline,
          payment_status: paymentStatus,
          fee_note: feeError || null,
        };
      })
    );

    let filteredRows = rows;
    if (courseId) {
      filteredRows = filteredRows.filter((row: any) => {
        const matchedBatch = batches.find((b: any) => b.name === row.batch);
        return matchedBatch && String(matchedBatch.courseId) === String(courseId);
      });
    }

    if (status) {
      const normalized = String(status).toLowerCase();
      filteredRows = filteredRows.filter((row: any) => String(row.payment_status).toLowerCase() === normalized);
    }

    return res.status(200).json({ success: true, data: filteredRows });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getFeeStructures = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    let query: any = {};

    if (collegeId) {
      const courses = await Course.find({ collegeId }).select("_id");
      query.courseId = { $in: courses.map((course) => course._id) };
    }

    const structures = await FeeStructure.find(query).populate("courseId batchId").sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: structures });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createFeeStructure = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    if (collegeId) {
      const targetCourse = await Course.findOne({ _id: req.body.courseId, collegeId }).select("_id");
      if (!targetCourse) {
        return res.status(400).json({ success: false, message: "Selected course is not available for this college" });
      }
    }

    const components = Array.isArray(req.body.components) ? req.body.components : [
      { name: "tuition", amount: toNumber(req.body.tuitionFee) },
      { name: "hostel", amount: toNumber(req.body.hostelFee) },
      { name: "exam", amount: toNumber(req.body.examFee) },
      { name: "other", amount: toNumber(req.body.otherCharges) },
    ];

    const structure = new FeeStructure({
      courseId: req.body.courseId,
      batchId: req.body.batchId,
      semester: Number(req.body.semester || 1),
      tuitionFee: toNumber(req.body.tuitionFee),
      hostelFee: toNumber(req.body.hostelFee),
      examFee: toNumber(req.body.examFee),
      otherCharges: toNumber(req.body.otherCharges),
      academicYear: req.body.academicYear,
      dueDate: req.body.dueDate,
      lateFeeAmount: toNumber(req.body.lateFeeAmount),
      installmentPlan: req.body.installmentPlan || "full",
      finePerDay: toNumber(req.body.finePerDay),
      components,
    });

    await structure.save();
    res.status(201).json({ success: true, data: structure });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateFeeStructure = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const update = req.body || {};
    const structure = await FeeStructure.findByIdAndUpdate(id, update, { new: true });
    if (!structure) {
      return res.status(404).json({ success: false, message: "Fee structure not found" });
    }
    return res.status(200).json({ success: true, data: structure });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteFeeStructure = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await FeeStructure.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Fee structure not found" });
    }
    return res.status(200).json({ success: true, message: "Fee structure deleted" });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getScholarships = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const data = await Scholarship.find({ collegeId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createScholarship = async (req: Request, res: Response) => {
  try {
    const collegeId = (req as any).user?.collegeId;
    const scholarship = await Scholarship.create({
      ...req.body,
      collegeId,
    });
    return res.status(201).json({ success: true, data: scholarship });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateScholarship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await Scholarship.findByIdAndUpdate(id, req.body || {}, { new: true });
    if (!item) {
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteScholarship = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await Scholarship.findByIdAndDelete(id);
    if (!item) {
      return res.status(404).json({ success: false, message: "Scholarship not found" });
    }
    return res.status(200).json({ success: true, message: "Scholarship deleted" });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getFeeAdjustments = async (req: Request, res: Response) => {
  try {
    const collegeId = String((req as any).user?.collegeId || "");
    const { studentId, q } = req.query as any;
    const query: any = { collegeId };

    if (studentId) {
      query.studentId = studentId;
    }

    if (q) {
      const matchedStudents = await Student.find({
        collegeId,
        $or: [
          { uniqueStudentId: { $regex: q, $options: "i" } },
          { enrollmentId: { $regex: q, $options: "i" } },
          { "personalInfo.firstName": { $regex: q, $options: "i" } },
          { "personalInfo.lastName": { $regex: q, $options: "i" } },
        ],
      }).select("_id");
      query.studentId = { $in: matchedStudents.map((s) => s._id) };
    }

    const data = await FeeAdjustment.find(query)
      .populate("studentId", "personalInfo.firstName personalInfo.lastName uniqueStudentId enrollmentId")
      .populate("createdByAdminId", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createFeeAdjustment = async (req: Request, res: Response) => {
  try {
    const collegeId = String((req as any).user?.collegeId || "");
    const userId = String((req as any).user?._id || "");
    const { studentId, type, amount, reason } = req.body || {};

    const student = await Student.findOne({ _id: studentId, collegeId }).select("_id");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const created = await FeeAdjustment.create({
      studentId,
      collegeId,
      type,
      amount: Number(amount || 0),
      reason,
      createdByAdminId: userId,
      date: new Date(),
    });
    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getPayments = async (req: Request, res: Response) => {
  try {
    const { status, studentId, courseId, batchId, startDate, endDate } = req.query as any;
    const collegeId = String((req as any).user?.collegeId || "");
    const query: any = {};

    const scopedStudentIds = await getScopedStudentIds(collegeId);
    if (scopedStudentIds.length > 0) {
      query.studentId = { $in: scopedStudentIds };
    }

    if (status) query.status = status;
    if (studentId) query.studentId = studentId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    let payments = await Payment.find(query)
      .populate("studentId", "personalInfo.firstName personalInfo.lastName personalInfo.name uniqueStudentId enrollmentId batchId")
      .populate("feeStructureId")
      .sort({ createdAt: -1 });

    if (courseId || batchId) {
      const filtered = [];
      for (const payment of payments) {
        const student = payment.studentId as any;
        if (!student?._id) continue;
        const studentDoc = await Student.findById(student._id).select("batchId");
        if (!studentDoc?.batchId) continue;
        const batch = await (await import("../models/Batch.js")).default.findById(studentDoc.batchId).select("courseId");
        if (!batch) continue;
        if (batchId && String(studentDoc.batchId) !== String(batchId)) continue;
        if (courseId && String(batch.courseId) !== String(courseId)) continue;
        filtered.push(payment);
      }
      payments = filtered as any;
    }

    res.status(200).json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const recordPayment = async (req: Request, res: Response) => {
  try {
    const { studentId, feeStructureId, amount, method, transactionId } = req.body;
    const userRole = String((req as any).user?.role || "").toUpperCase();
    const userCollegeId = String((req as any).user?.collegeId || "");
    const userName = String((req as any).user?.name || "");

    if (userCollegeId) {
      const student = await Student.findOne({ _id: studentId, collegeId: userCollegeId });
      if (!student) {
        return res.status(403).json({ success: false, message: "Student not found in your college" });
      }
    }

    const receiptNo = await generateReceiptNo();

    const payment = new Payment({
      studentId,
      feeStructureId,
      amountPaid: Number(amount || 0),
      amount: Number(amount || 0),
      mode: method || "online",
      paymentMethod: method || "online",
      transactionId,
      receiptNumber: receiptNo,
      status: "Paid",
      paymentDate: new Date(),
      fineApplied: 0,
      paidByRole: userRole,
      paidByName: userName,
      paidByUserId: (req as any).user?._id,
    });

    await payment.save();
    res.status(201).json({ success: true, data: payment });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    const { student_id, amount, installment_number } = req.body || {};
    if (!student_id || amount === undefined || amount === null) {
      return res.status(400).json({ success: false, message: "student_id and amount are required" });
    }

    const numericAmount = Number(amount || 0);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ success: false, message: "Payable amount must be greater than zero" });
    }

    const collegeId = String((req as any).user?.collegeId || "");
    const role = String((req as any).user?.role || "").toUpperCase();
    const userId = String((req as any).user?._id || "");

    let parent: any = null;
    if (role === "PARENT") {
      parent = await Parent.findOne({ userId }).select("students");
      const linked = (parent?.students || []).map((id: any) => String(id));
      if (!linked.includes(String(student_id))) {
        return res.status(403).json({ success: false, message: "Not authorized to pay for this student" });
      }
    }

    const studentQuery: any = { _id: student_id };
    if (collegeId) {
      studentQuery.collegeId = collegeId;
    }

    const student = await Student.findOne(studentQuery).select("_id userId collegeId");
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    if (role === "STUDENT" && String(student.userId || "") !== userId) {
      return res.status(403).json({ success: false, message: "Not authorized to pay for this student" });
    }

    const feeSnapshot = await calculateStudentFee(String(student._id), collegeId || undefined);
    const currentDue = Number(feeSnapshot?.due_amount || 0);
    if (currentDue <= 0) {
      return res.status(400).json({ success: false, message: "No pending due amount" });
    }
    if (numericAmount > currentDue) {
      return res.status(400).json({ success: false, message: `Entered amount exceeds due balance of ${currentDue}` });
    }

    const razorpay = getRazorpayClient();
    const orderAmount = Math.round(numericAmount * 100);
    const compactStudentId = String(student_id).slice(-8);
    const compactTs = String(Date.now()).slice(-10);
    const receipt = `rcpt_${compactStudentId}_${compactTs}`;
    const order = await razorpay.orders.create({
      amount: orderAmount,
      currency: "INR",
      receipt,
    });

    const payment = await Payment.create({
      studentId: student_id,
      amountPaid: numericAmount,
      amount: numericAmount,
      status: "Pending",
      mode: "razorpay",
      paymentMethod: "razorpay",
      receiptNumber: await generateReceiptNo(),
      razorpayOrderId: order.id,
      installmentNumber: installment_number ? Number(installment_number) : undefined,
      paidByRole: role,
      paidByName: (req as any).user?.name,
      paidByUserId: (req as any).user?._id,
    });

    return res.status(200).json({
      success: true,
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        payment_id: payment._id,
      },
    });
  } catch (error: any) {
    const message =
      error?.error?.description ||
      error?.error?.reason ||
      error?.message ||
      "Unable to create payment order";
    return res.status(400).json({ success: false, message });
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment verification fields" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return res.status(500).json({ success: false, message: "Razorpay secret not configured" });
    }

    const generated = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Pending payment record not found" });
    }

    if (generated !== razorpay_signature) {
      payment.status = "Failed";
      payment.razorpayPaymentId = razorpay_payment_id;
      payment.razorpaySignature = razorpay_signature;
      await payment.save();
      return res.status(400).json({
        success: false,
        message: "Payment verification failed. Please contact support",
      });
    }

    payment.status = "Paid";
    payment.paymentDate = new Date();
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.receiptNumber = payment.receiptNumber || (await generateReceiptNo());
    await payment.save();

    const role = String((req as any).user?.role || "").toUpperCase();
    const scopedCollegeId = role === "PARENT" ? undefined : String((req as any).user?.collegeId || "");
    const feeData = await calculateStudentFee(String(payment.studentId), scopedCollegeId);

    return res.status(200).json({
      success: true,
      data: {
        payment,
        due_amount: feeData.due_amount,
      },
    });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const getFinancialSummary = async (req: Request, res: Response) => {
  try {
    const collegeId = String((req as any).user?.collegeId || "");
    const scopedStudentIds = await getScopedStudentIds(collegeId);

    const paidQuery: any = { status: { $in: ["Paid", "paid", "COMPLETED"] } };
    if (scopedStudentIds.length > 0) {
      paidQuery.studentId = { $in: scopedStudentIds };
    }

    const paidPayments = await Payment.find(paidQuery).select("amountPaid amount paymentDate").lean();
    const totalRevenue = paidPayments.reduce((sum: number, p: any) => sum + Number(p.amountPaid ?? p.amount ?? 0), 0);

    let pendingCollections = 0;
    let scholarshipFund = 0;
    for (const studentId of scopedStudentIds) {
      try {
        const fee = await calculateStudentFee(String(studentId), collegeId);
        pendingCollections += Number(fee.due_amount || 0);
        scholarshipFund += Number(fee.scholarship_discount || 0) + Number(fee.category_discount || 0);
      } catch {
        // ignore per-student calculation failures to keep summary resilient
      }
    }

    const totalExpected = totalRevenue + pendingCollections;
    const collectionEfficiency = totalExpected > 0 ? `${((totalRevenue / totalExpected) * 100).toFixed(1)}%` : "0%";

    return res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        pendingCollections,
        collectionEfficiency,
        scholarshipFund,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
