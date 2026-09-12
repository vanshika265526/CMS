// FILE: backend/src/validators/studentsValidator.ts
import { z } from "zod";

export const studentSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dob: z.string().transform((str) => new Date(str)),
    gender: z.enum(["male", "female", "other"]),
    phone: z.string().min(10, "Phone is required"),
    email: z.string().email("Invalid email"),
    address: z.string().min(5, "Address is required"),
  }),
  academicInfo: z.object({
    course: z.string().min(1, "Course is required"),
    batch: z.string().min(1, "Batch is required"),
    department: z.string().min(24, "Invalid Department ID"),
    semester: z.number().min(1).max(8).optional(),
    section: z.string().optional(),
    status: z.enum(["active", "inactive", "graduated", "dropped"]).optional(),
  }),
  parentInfo: z.object({
    name: z.string().min(1, "Parent name is required"),
    phone: z.string().min(10, "Parent phone is required"),
    email: z.string().email("Invalid email"),
    relation: z.string().min(1, "Relation is required"),
  }),
});

export const departmentSchema = z.object({
  name: z.string().min(2, "Department name is required"),
  hod: z.string().optional(),
  courses: z.array(z.string()).optional(),
});
