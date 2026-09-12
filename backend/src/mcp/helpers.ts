import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, LIBRARY_FINE_PER_DAY, RECEIPT_PREFIX } from './config.js';
import type { PaginationParams, PaginatedResult } from './types.js';
import Student from '../models/Student.js';
import Department from '../models/Department.js';

/**
 * Apply pagination to a Mongoose query.
 * Returns paginated result with metadata.
 */
export async function paginate<T>(
  query: mongoose.Query<T[], T>,
  countQuery: mongoose.Query<number, T>,
  params: PaginationParams
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, params.limit || DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    query.skip(skip).limit(limit).lean().exec() as Promise<T[]>,
    countQuery.exec(),
  ]);

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Generate a collision-resistant receipt number.
 * Format: RCP-YYYYMMDD-XXXX (hex from crypto.randomBytes)
 */
export function generateReceiptNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = randomBytes(2).toString('hex').toUpperCase();
  return `${RECEIPT_PREFIX}-${date}-${rand}`;
}

/**
 * Calculate library fine based on due date and return date.
 * Formula: max(0, overdueDays) × FINE_PER_DAY
 */
export function calculateFine(dueDate: Date, returnDate: Date): number {
  const msPerDay = 86_400_000;
  const overdueDays = Math.max(
    0,
    Math.floor((returnDate.getTime() - dueDate.getTime()) / msPerDay)
  );
  return overdueDays * LIBRARY_FINE_PER_DAY;
}

/**
 * Safely convert a string to a Mongoose ObjectId.
 * Throws a descriptive error if the string is not a valid ObjectId.
 */
export function toObjectId(id: string, fieldName = 'id'): mongoose.Types.ObjectId {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ObjectId for ${fieldName}: "${id}"`);
  }
  return new mongoose.Types.ObjectId(id);
}

/**
 * Generate a unique student ID.
 * Format: {DEPT_CODE}{YEAR}{SEQ_3_DIGIT} — e.g., CSE2024001
 */
export async function generateStudentId(
  departmentId: string,
  admissionYear: number
): Promise<string> {
  const dept = await Department.findById(departmentId);
  const deptCode = dept
    ? dept.name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase()
    : 'GEN';

  const count = await Student.countDocuments({
    'academicInfo.department': toObjectId(departmentId, 'departmentId'),
    'academicInfo.enrollmentDate': {
      $gte: new Date(`${admissionYear}-01-01`),
      $lt: new Date(`${admissionYear + 1}-01-01`),
    },
  });

  return `${deptCode}${admissionYear}${String(count + 1).padStart(3, '0')}`;
}
