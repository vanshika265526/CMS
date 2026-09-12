import Batch from "../models/Batch.js";
import College from "../models/College.js";
import Course from "../models/Course.js";
import FeeAdjustment from "../models/FeeAdjustment.js";
import FeeStructure from "../models/FeeStructure.js";
import Payment from "../models/Payment.js";
import Scholarship from "../models/Scholarship.js";
import Student from "../models/Student.js";

const CATEGORY_DISCOUNT_MAP: Record<string, number> = {
  SC: 0.1,
  ST: 0.12,
  OBC: 0.08,
};

const getStructureAmount = (structure: any) => {
  const tuitionFee = Number(structure?.tuitionFee || 0);
  const hostelFee = Number(structure?.hostelFee || 0);
  const examFee = Number(structure?.examFee || 0);
  const otherCharges = Number(structure?.otherCharges || 0);

  if (tuitionFee || hostelFee || examFee || otherCharges) {
    return { tuitionFee, hostelFee, examFee, otherCharges };
  }

  const components = Array.isArray(structure?.components) ? structure.components : [];
  const fromName = (name: string) =>
    Number(
      components
        .filter((c: any) => String(c?.name || "").toLowerCase().includes(name))
        .reduce((sum: number, c: any) => sum + Number(c?.amount || 0), 0)
    );

  return {
    tuitionFee: fromName("tuition"),
    hostelFee: fromName("hostel"),
    examFee: fromName("exam"),
    otherCharges: components
      .filter((c: any) => {
        const n = String(c?.name || "").toLowerCase();
        return !n.includes("tuition") && !n.includes("hostel") && !n.includes("exam");
      })
      .reduce((sum: number, c: any) => sum + Number(c?.amount || 0), 0),
  };
};

const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildInstallments = (opts: {
  finalFee: number;
  paidAmount: number;
  dueDate: Date;
  installmentPlan: "full" | "semester" | "quarterly";
}) => {
  const { finalFee, paidAmount, dueDate, installmentPlan } = opts;
  const count = installmentPlan === "quarterly" ? 4 : installmentPlan === "semester" ? 2 : 1;
  const amountPerInstallment = round2(finalFee / count);
  const out: any[] = [];
  let paidRemaining = paidAmount;

  for (let i = 1; i <= count; i += 1) {
    const installmentDueDate = new Date(dueDate);
    if (count > 1) {
      installmentDueDate.setMonth(installmentDueDate.getMonth() + (i - 1) * (12 / count));
    }

    let status: "Paid" | "Due" | "Overdue" = "Due";
    if (paidRemaining >= amountPerInstallment) {
      status = "Paid";
      paidRemaining -= amountPerInstallment;
    } else if (new Date() > installmentDueDate) {
      status = "Overdue";
    }

    out.push({
      number: i,
      amount: amountPerInstallment,
      due_date: installmentDueDate,
      status,
    });
  }

  return out;
};

export const calculateStudentFee = async (studentId: string, collegeId?: string) => {
  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error("Student not found");
  }

  if (collegeId && String(student.collegeId || "") !== String(collegeId)) {
    throw new Error("Student does not belong to this college");
  }

  let batchId = student.batchId;
  if (!batchId && student.collegeId) {
    const membershipBatch = await Batch.findOne({
      collegeId: student.collegeId,
      students: student._id,
    }).select("_id");
    if (membershipBatch?._id) {
      batchId = membershipBatch._id as any;
    }
  }

  if (!batchId && student.academicInfo?.batch && student.collegeId) {
    const rawBatchName = String(student.academicInfo.batch || "").trim();
    const normalizedBatchName = rawBatchName.replace(/^batch\s*/i, "").trim();

    let fallbackBatch = await Batch.findOne({
      name: student.academicInfo.batch,
      collegeId: student.collegeId,
    });

    if (!fallbackBatch && rawBatchName) {
      fallbackBatch = await Batch.findOne({
        collegeId: student.collegeId,
        name: { $regex: new RegExp(escapeRegex(rawBatchName), "i") },
      });
    }

    if (!fallbackBatch && normalizedBatchName) {
      fallbackBatch = await Batch.findOne({
        collegeId: student.collegeId,
        name: { $regex: new RegExp(escapeRegex(normalizedBatchName), "i") },
      });
    }

    if (fallbackBatch) {
      batchId = fallbackBatch._id as any;
    }
  }

  if (!batchId) {
    throw new Error("Student batch not found");
  }

  const batch = await Batch.findById(batchId).select("name courseId");
  if (!batch?.courseId) {
    throw new Error("Course mapping not found for batch");
  }

  const [course, college] = await Promise.all([
    Course.findById(batch.courseId).select("name").lean(),
    student.collegeId ? College.findById(student.collegeId).select("name").lean() : Promise.resolve(null),
  ]);

  // Highest priority: exact batch mapping, even if course linkage was edited later
  let feeStructure = await FeeStructure.findOne({
    batchId,
  })
    .sort({ dueDate: -1, createdAt: -1 })
    .lean();

  if (!feeStructure) {
    feeStructure = await FeeStructure.findOne({
      courseId: batch.courseId,
      batchId,
    })
    .sort({ dueDate: -1, createdAt: -1 })
    .lean();
  }

  if (!feeStructure) {
    feeStructure = await FeeStructure.findOne({
      courseId: batch.courseId,
      $or: [{ batchId: { $exists: false } }, { batchId: null }],
    })
      .sort({ dueDate: -1, createdAt: -1 })
      .lean();
  }

  if (!feeStructure) {
    // Final fallback: latest structure for course (handles cases where admin created structure for a sibling batch)
    feeStructure = await FeeStructure.findOne({
      courseId: batch.courseId,
    })
      .sort({ dueDate: -1, createdAt: -1 })
      .lean();
  }

  if (!feeStructure) {
    throw new Error("Fee structure not found");
  }

  const amountBreak = getStructureAmount(feeStructure);
  const totalFee = round2(
    amountBreak.tuitionFee + amountBreak.hostelFee + amountBreak.examFee + amountBreak.otherCharges
  );

  let scholarshipDiscount = 0;
  const scholarshipId = (student as any).scholarshipId;
  if (scholarshipId) {
    const scholarship = await Scholarship.findById(scholarshipId).lean();
    const category = String((student as any).category || "GEN").toUpperCase();
    if (scholarship && (scholarship.categoryApplicable === "ALL" || scholarship.categoryApplicable === category)) {
      scholarshipDiscount = scholarship.type === "percentage"
        ? round2(totalFee * (Number(scholarship.value || 0) / 100))
        : round2(Number(scholarship.value || 0));
    }
  }

  const studentCategory = String((student as any).category || "GEN").toUpperCase();
  const categoryDiscount = CATEGORY_DISCOUNT_MAP[studentCategory]
    ? round2(totalFee * CATEGORY_DISCOUNT_MAP[studentCategory])
    : 0;

  const adjustments = await FeeAdjustment.find({ studentId: student._id }).lean();
  const manualAdjustments = round2(
    adjustments.reduce((sum: number, item: any) => {
      if (item.type === "waiver") return sum - Number(item.amount || 0);
      return sum + Number(item.amount || 0);
    }, 0)
  );

  const dueDate = new Date((feeStructure as any).dueDate);
  const lateFee = new Date() > dueDate ? Number((feeStructure as any).lateFeeAmount || 0) : 0;

  const finalFee = round2(totalFee - scholarshipDiscount - categoryDiscount + manualAdjustments + lateFee);

  const paidPayments = await Payment.find({
    studentId: student._id,
    status: { $in: ["Paid", "paid", "COMPLETED"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  const allPayments = await Payment.find({ studentId: student._id })
    .sort({ createdAt: -1 })
    .lean();

  const paidAmount = round2(
    paidPayments.reduce((sum: number, payment: any) => {
      return sum + Number(payment.amountPaid ?? payment.amount ?? 0);
    }, 0)
  );

  const dueAmount = Math.max(0, round2(finalFee - paidAmount));
  const installmentPlan = ((feeStructure as any).installmentPlan || "full") as "full" | "semester" | "quarterly";

  return {
    student_id: student._id,
    student_name:
      student.personalInfo?.name
      || `${student.personalInfo?.firstName || ""} ${student.personalInfo?.lastName || ""}`.trim()
      || "Student",
    roll_number: student.academicInfo?.rollNumber || student.enrollmentId || student.uniqueStudentId || "N/A",
    enrollment_id: student.enrollmentId || student.uniqueStudentId || "N/A",
    college_name: (college as any)?.name || "College",
    course_name: (course as any)?.name || student.academicInfo?.course || "N/A",
    batch_name: (batch as any)?.name || student.academicInfo?.batch || "N/A",
    fee_structure_id: (feeStructure as any)._id,
    total_fee: totalFee,
    tuition_fee: amountBreak.tuitionFee,
    hostel_fee: amountBreak.hostelFee,
    exam_fee: amountBreak.examFee,
    other_charges: amountBreak.otherCharges,
    scholarship_discount: scholarshipDiscount,
    category_discount: categoryDiscount,
    manual_adjustments: manualAdjustments,
    late_fee: lateFee,
    final_fee: finalFee,
    paid_amount: paidAmount,
    due_amount: dueAmount,
    academic_year: (feeStructure as any).academicYear || null,
    due_date: dueDate,
    installment_plan: installmentPlan,
    installments: buildInstallments({
      finalFee,
      paidAmount,
      dueDate,
      installmentPlan,
    }),
    adjustments,
    payments: allPayments,
  };
};
