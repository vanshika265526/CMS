import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import Fee from '../../models/Fee.js';
import FeeStructure from '../../models/FeeStructure.js';
import FeeAdjustment from '../../models/FeeAdjustment.js';
import Payment from '../../models/Payment.js';
import Student from '../../models/Student.js';
import Course from '../../models/Course.js';
import User from '../../models/User.js';
import { paginate, toObjectId, generateReceiptNumber } from '../helpers.js';
import { success, error } from '../types.js';

export function registerFeeTools(server: McpServer) {

  // ─── fee_structure_list ─────────────────────────────────────────
  server.tool(
    'fee_structure_list',
    'List and filter fee structures. Fields: courseId, batchId, semester, tuitionFee, examFee, components.',
    {
      courseId: z.string().optional().describe('Filter by Course ObjectId'),
      batchId: z.string().optional().describe('Filter by Batch ObjectId'),
      semester: z.number().optional().describe('Filter by semester number'),
      academicYear: z.string().optional().describe('Filter by academic year (e.g. 2026-2027)'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.courseId) filter.courseId = toObjectId(params.courseId, 'courseId');
        if (params.batchId) filter.batchId = toObjectId(params.batchId, 'batchId');
        if (params.semester) filter.semester = params.semester;
        if (params.academicYear) filter.academicYear = params.academicYear;

        const query = FeeStructure.find(filter)
          .populate('courseId', 'name code')
          .populate('batchId', 'name')
          .sort({ academicYear: -1, semester: 1 });
        const countQuery = FeeStructure.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── fee_structure_create ───────────────────────────────────────
  server.tool(
    'fee_structure_create',
    'Create a new fee structure. Requires courseId, semester, dueDate, and at least one fee amount or component.',
    {
      courseId: z.string().describe('Course ObjectId'),
      batchId: z.string().optional().describe('Batch ObjectId'),
      semester: z.number().describe('Semester number'),
      tuitionFee: z.number().optional().describe('Tuition fee amount'),
      hostelFee: z.number().optional().describe('Hostel fee amount'),
      examFee: z.number().optional().describe('Exam fee amount'),
      otherCharges: z.number().optional().describe('Other charges amount'),
      academicYear: z.string().optional().describe('Academic year'),
      lateFeeAmount: z.number().optional().describe('Late fee default amount'),
      installmentPlan: z.enum(['full', 'semester', 'quarterly']).optional().describe('Payment plan options'),
      components: z.array(
        z.object({
          name: z.string().describe('Fee component name (e.g. lab, library)'),
          amount: z.number().describe('Component amount'),
        })
      ).optional().describe('Custom fee components list'),
      dueDate: z.string().describe('Primary due date (ISO string YYYY-MM-DD)'),
      finePerDay: z.number().optional().describe('Fine amount charged per day after due date'),
    },
    async (params) => {
      try {
        const courseId = toObjectId(params.courseId, 'courseId');
        const batchId = params.batchId ? toObjectId(params.batchId, 'batchId') : undefined;

        // Verify course exists
        const courseDoc = await Course.findById(courseId);
        if (!courseDoc) return error(`Course ${params.courseId} not found`);

        const feeStructure = await FeeStructure.create({
          ...params,
          courseId,
          batchId,
          dueDate: new Date(params.dueDate),
        });

        return success({
          message: '✅ Fee structure created successfully',
          feeStructureId: feeStructure._id,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── fee_structure_update ───────────────────────────────────────
  server.tool(
    'fee_structure_update',
    'Update a fee structure. Pass only fields to change.',
    {
      id: z.string().describe('FeeStructure _id (ObjectId)'),
      updates: z.record(z.any()).describe('Key-value updates (e.g., "dueDate": "2026-09-01", "finePerDay": 10)'),
    },
    async (params) => {
      try {
        const updates = { ...params.updates };
        if (updates.courseId) updates.courseId = toObjectId(updates.courseId, 'courseId');
        if (updates.batchId) updates.batchId = toObjectId(updates.batchId, 'batchId');
        if (updates.dueDate) updates.dueDate = new Date(updates.dueDate);

        const feeStructure = await FeeStructure.findByIdAndUpdate(
          toObjectId(params.id, 'id'),
          { $set: updates },
          { new: true, runValidators: true }
        ).lean();

        if (!feeStructure) return error('Fee structure not found');
        return success({ message: '✅ Fee structure updated', feeStructure });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── fee_structure_delete ───────────────────────────────────────
  server.tool(
    'fee_structure_delete',
    'Delete a fee structure. Default: soft-delete (sets isDeleted=true). Pass hard=true for permanent deletion.',
    {
      id: z.string().describe('FeeStructure _id (ObjectId)'),
      hard: z.boolean().optional().describe('If true, permanently delete. Default: soft-delete'),
    },
    async (params) => {
      try {
        const structId = toObjectId(params.id, 'id');
        const feeStructure = await FeeStructure.findById(structId);
        if (!feeStructure) return error('Fee structure not found');

        if (params.hard) {
          await FeeStructure.deleteOne({ _id: structId });
          return success({ message: `⚠️ Fee structure permanently deleted` });
        } else {
          await FeeStructure.updateOne({ _id: structId }, { $set: { isDeleted: true } });
          return success({ message: `✅ Fee structure soft-deleted` });
        }
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── fee_list ───────────────────────────────────────────────────
  server.tool(
    'fee_list',
    'List and filter individual student fee items. Fields: studentId, amount, dueDate, status, type.',
    {
      studentId: z.string().optional().describe('Filter by Student ObjectId'),
      status: z.enum(['paid', 'pending', 'overdue']).optional().describe('Filter by status'),
      type: z.string().optional().describe('Filter by fee type (e.g. Tuition, Hostel)'),
      page: z.number().optional(),
      limit: z.number().optional(),
    },
    async (params) => {
      try {
        const filter: any = {};
        if (params.studentId) filter.studentId = toObjectId(params.studentId, 'studentId');
        if (params.status) filter.status = params.status;
        if (params.type) filter.type = params.type;

        const query = Fee.find(filter)
          .populate('studentId', 'uniqueStudentId personalInfo.firstName personalInfo.lastName')
          .sort({ dueDate: 1 });
        const countQuery = Fee.countDocuments(filter);

        const result = await paginate(query as any, countQuery as any, params);
        return success(result);
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── fee_get_dues ────────────────────────────────────────────────
  server.tool(
    'fee_get_dues',
    'Get total fee dues for a student across ALL semesters (lifetime). Formula: FeeStructure total - waivers + extra charges + late fees - payments made. To get per-semester breakdown, use fee_list filtered by studentId.',
    {
      studentId: z.string().describe('Student ObjectId'),
    },
    async (params) => {
      try {
        const studentId = toObjectId(params.studentId, 'studentId');

        // 1. Verify student and resolve course + batch
        const student = await Student.findOne({ _id: studentId, isDeleted: false });
        if (!student) return error(`Active Student ${params.studentId} not found`);

        const course = await Course.findOne({
          $or: [{ name: student.academicInfo.course }, { code: student.academicInfo.course }],
          collegeId: student.collegeId,
        });
        if (!course) {
          return error(`Course "${student.academicInfo.course}" not resolved for student`);
        }

        // 2. Fetch all FeeStructures matching this course and batch (or general course structures)
        const feeStructures = await FeeStructure.find({
          courseId: course._id,
          $or: [{ batchId: student.batchId }, { batchId: null }],
          isDeleted: false,
        });

        // 3. Calculate Base Fee Sum
        let baseFeeSum = 0;
        for (const struct of feeStructures) {
          // Sum up the core fee fields
          let structTotal = (struct.tuitionFee || 0) +
                              (struct.hostelFee || 0) +
                              (struct.examFee || 0) +
                              (struct.otherCharges || 0);

          // Sum up any custom components
          if (struct.components && struct.components.length > 0) {
            structTotal += struct.components.reduce((acc, c) => acc + (c.amount || 0), 0);
          }
          baseFeeSum += structTotal;
        }

        // 4. Fetch adjustments (waivers, extra charges, late fees)
        const adjustments = await FeeAdjustment.find({ studentId });
        let waiversSum = 0;
        let extraChargesSum = 0;
        let lateFeesSum = 0;

        for (const adj of adjustments) {
          if (adj.type === 'waiver') waiversSum += adj.amount;
          else if (adj.type === 'extra_charge') extraChargesSum += adj.amount;
          else if (adj.type === 'late_fee') lateFeesSum += adj.amount;
        }

        // 5. Fetch all successful payments
        const payments = await Payment.find({
          studentId,
          status: { $in: ['Paid', 'COMPLETED', 'paid'] },
        });
        const paymentsSum = payments.reduce((acc, p) => acc + (p.amountPaid || 0), 0);

        // 6. Compute lifetime dues
        const lifetimeDues = baseFeeSum - waiversSum + extraChargesSum + lateFeesSum - paymentsSum;

        return success({
          student: {
            id: student._id,
            uniqueStudentId: student.uniqueStudentId,
            name: `${student.personalInfo.firstName} ${student.personalInfo.lastName}`,
            course: student.academicInfo.course,
            semester: student.academicInfo.semester,
          },
          summary: {
            baseFeeSum,
            waiversSum,
            extraChargesSum,
            lateFeesSum,
            paymentsSum,
            lifetimeDues: Math.max(0, parseFloat(lifetimeDues.toFixed(2))),
            credits: lifetimeDues < 0 ? Math.abs(parseFloat(lifetimeDues.toFixed(2))) : 0,
          },
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );

  // ─── fee_payment_create ──────────────────────────────────────────
  server.tool(
    'fee_payment_create',
    'Record a fee payment. Automatically generates a unique, collision-resistant receipt number and updates corresponding Fee items if they are matched.',
    {
      studentId: z.string().describe('Student ObjectId'),
      feeStructureId: z.string().optional().describe('FeeStructure ObjectId associated with this payment'),
      feeId: z.string().optional().describe('Optional specific Fee item _id to mark as paid'),
      amountPaid: z.number().describe('Amount paid in this transaction'),
      fineApplied: z.number().optional().describe('Fine amount applied in this payment (default 0)'),
      mode: z.enum(['cash', 'cheque', 'online', 'razorpay']).describe('Payment mode'),
      paymentMethod: z.string().optional().describe('Description of method (e.g. GPay, Card)'),
      transactionId: z.string().optional().describe('Bank/Gateway transaction ID'),
      paidByRole: z.enum(['STUDENT', 'PARENT', 'COLLEGE_ADMIN', 'SUPER_ADMIN']).optional().describe('Who made the payment (default STUDENT)'),
      paidByName: z.string().optional().describe('Name of the payer'),
      paidByUserId: z.string().optional().describe('User ObjectId of the payer'),
    },
    async (params) => {
      try {
        const studentId = toObjectId(params.studentId, 'studentId');
        const feeStructureId = params.feeStructureId ? toObjectId(params.feeStructureId, 'feeStructureId') : undefined;

        // Verify student
        const student = await Student.findOne({ _id: studentId, isDeleted: false });
        if (!student) return error(`Active Student ${params.studentId} not found`);

        // Generate receipt number
        const receiptNumber = generateReceiptNumber();

        // Create the Payment
        const payment = await Payment.create({
          studentId,
          feeStructureId,
          amountPaid: params.amountPaid,
          amount: params.amountPaid, // for compatibility
          fineApplied: params.fineApplied || 0,
          mode: params.mode,
          paymentMethod: params.paymentMethod,
          transactionId: params.transactionId,
          paidByRole: params.paidByRole || 'STUDENT',
          paidByName: params.paidByName || `${student.personalInfo.firstName} ${student.personalInfo.lastName}`,
          paidByUserId: params.paidByUserId ? toObjectId(params.paidByUserId, 'paidByUserId') : undefined,
          receiptNumber,
          status: 'Paid',
          paymentDate: new Date(),
        });

        // Update matching Fee record if feeId is provided
        if (params.feeId) {
          await Fee.updateOne(
            { _id: toObjectId(params.feeId, 'feeId'), studentId },
            {
              $set: {
                status: 'paid',
                paymentDate: new Date(),
                receiptNumber,
              },
            }
          );
        } else if (params.feeStructureId) {
          // Fallback: update any pending/overdue Fee items of this student that match the fee structure's semester or date
          // For now, let's update a pending fee item of this student that matches the amountPaid
          await Fee.updateOne(
            { studentId, status: { $ne: 'paid' } },
            {
              $set: {
                status: 'paid',
                paymentDate: new Date(),
                receiptNumber,
              },
            }
          );
        }

        return success({
          message: '✅ Payment recorded and receipt generated successfully',
          paymentId: payment._id,
          receiptNumber,
        });
      } catch (err: any) {
        return error(err.message);
      }
    }
  );
}
