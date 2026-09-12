import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Student from '../models/Student.js';
import { generateEnrollmentId } from '../utils/enrollmentId.js';

dotenv.config();

const run = async () => {
  await connectDB();

  const students = await Student.find({
    $or: [
      { enrollmentId: { $exists: false } },
      { enrollmentId: null },
      { enrollmentId: '' },
      { enrollmentId: 'PENDING' },
      { enrollmentId: 'pending' },
    ],
    collegeId: { $exists: true, $ne: null },
  }).sort({ createdAt: 1 });

  let updated = 0;
  for (const student of students) {
    const createdAt = student.createdAt || new Date();
    const enrollmentId = await generateEnrollmentId(String(student.collegeId), createdAt);
    student.enrollmentId = enrollmentId;
    student.studentId = enrollmentId;
    await student.save();
    updated += 1;
  }

  console.log(`[MIGRATION] Enrollment IDs updated: ${updated}`);
  process.exit(0);
};

run().catch((error) => {
  console.error('[MIGRATION] Failed:', error);
  process.exit(1);
});
