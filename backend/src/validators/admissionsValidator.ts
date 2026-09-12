// FILE: backend/src/validators/admissionsValidator.ts
import { z } from "zod";

export const enquirySchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  courseInterested: z.string().min(1, "Course is required"),
  source: z.enum(["walk-in", "online", "referral"]).optional(),
});

export const applicationSchema = z.object({
  enquiryId: z.string().min(24, "Invalid Enquiry ID"),
  studentDetails: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dob: z.string().transform((str) => new Date(str)),
    gender: z.enum(["male", "female", "other"]),
    phone: z.string().min(10, "Phone is required"),
    email: z.string().email("Invalid email"),
    address: z.string().min(5, "Address is required"),
    parentName: z.string().min(2, "Parent name is required"),
    parentPhone: z.string().min(10, "Parent phone is required"),
  }),
  assignedCourse: z.string().min(1, "Course is required"),
  assignedBatch: z.string().min(1, "Batch is required"),
});

export const seatConfigSchema = z.object({
  course: z.string(),
  batch: z.string(),
  totalSeats: z.number().min(1),
  reservedSeats: z.object({
    SC: z.number().min(0),
    ST: z.number().min(0),
    OBC: z.number().min(0),
    General: z.number().min(0),
  }).optional(),
});
