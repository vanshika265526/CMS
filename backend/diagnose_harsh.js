import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('DB Connected');

  const User = (await import('./src/models/User.js')).default;
  const Student = (await import('./src/models/Student.js')).default;
  const Result = (await import('./src/models/Result.js')).default;
  const Attendance = (await import('./src/models/Attendance.js')).default;

  const user = await User.findOne({ email: 'student@git.edu' });
  if (!user) { console.log('NO USER FOUND'); process.exit(1); }
  console.log('User:', user._id.toString(), user.role);

  const student = await Student.findOne({ userId: user._id });
  if (!student) { console.log('NO STUDENT PROFILE'); process.exit(1); }
  console.log('Student:', student._id.toString(), 'BatchId:', student.batchId?.toString());

  const results = await Result.find({ studentId: student._id });
  console.log('Results count:', results.length);
  if (results.length > 0) {
    console.log('  CGPA:', results[0].cgpa, '| %:', results[0].percentage, '| Status:', results[0].status);
  }

  const attCount = await Attendance.countDocuments({
    'records.studentId': student._id
  });
  console.log('Attendance records where student appears:', attCount);

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(e => { console.error(e.message); process.exit(1); });
