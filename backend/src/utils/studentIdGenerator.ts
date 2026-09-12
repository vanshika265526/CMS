// FILE: backend/src/utils/studentIdGenerator.ts
import Student from "../models/Student.js";

/**
 * Generates a unique student ID in the format: NGCMS-YEAR-XXXX
 * Example: NGCMS-2026-0001
 */
export const generateStudentId = async (): Promise<string> => {
  const currentYear = new Date().getFullYear();
  const prefix = `NGCMS-${currentYear}-`;

  // Find the last student with this year's prefix
  const lastStudent = await Student.findOne({ 
    uniqueStudentId: { $regex: `^${prefix}` } 
  }).sort({ uniqueStudentId: -1 });

  let nextNumber = 1;

  if (lastStudent) {
    const lastId = lastStudent.uniqueStudentId;
    const parts = lastId.split("-");
    const lastNumber = parseInt(parts[2]);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  // Pad to 4 digits
  const paddedNumber = nextNumber.toString().padStart(4, "0");
  return `${prefix}${paddedNumber}`;
};
