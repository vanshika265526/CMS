// FILE: backend/src/validators/attendanceValidator.ts
import { z } from "zod";

export const bulkMark = z.object({
  body: z.object({
    batchId: z.string(),
    courseId: z.string(),
    subjectId: z.string(),
    teacherId: z.string(),
    date: z.string(),
    records: z.array(
      z.object({
        studentId: z.string(),
        status: z.enum(["Present", "Absent", "Leave"]),
        remarks: z.string().optional(),
      })
    ),
  }),
});

export const leaveRequest = z.object({
  body: z.object({
    studentId: z.string(),
    fromDate: z.string(),
    toDate: z.string(),
    reason: z.string(),
    supportingDoc: z.string().optional(),
  }),
});

export const reviewLeave = z.object({
  body: z.object({
    status: z.enum(["approved", "rejected"]),
    reviewedBy: z.string(),
    remarks: z.string().optional(),
  }),
});
