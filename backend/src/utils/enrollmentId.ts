import mongoose from 'mongoose';
import College from '../models/College.js';
import EnrollmentCounter from '../models/EnrollmentCounter.js';

const sanitizeCollegeCode = (code: string) => {
  const normalized = String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return normalized || 'COL';
};

const getCollegeCode = async (collegeId: string) => {
  if (!mongoose.Types.ObjectId.isValid(collegeId)) {
    return 'COL';
  }

  const college = await College.findById(collegeId).select('code');
  return sanitizeCollegeCode(college?.code || 'COL');
};

export const generateEnrollmentId = async (collegeId: string, date = new Date()) => {
  const year = date.getFullYear();
  const collegeCode = await getCollegeCode(collegeId);

  const counter = await EnrollmentCounter.findOneAndUpdate(
    { collegeId, year },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true }
  );

  const sequence = Number(counter?.sequence || 1);
  const padded = String(sequence).padStart(4, '0');
  return `${collegeCode}${year}${padded}`;
};

export const normalizeEnrollmentId = (value: string) =>
  String(value || '').trim().toUpperCase().replace(/\s+/g, '');
