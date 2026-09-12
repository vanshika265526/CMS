import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
  console.log('DB Connected\n');

  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }));

  const harshUser = await User.findOne({ email: 'student@git.edu' });
  const harshStudent = await Student.findOne({ userId: harshUser._id });
  console.log('=== HARSH ===');
  console.log('userId:', harshUser._id.toString());
  console.log('batchId:', harshStudent.batchId?.toString());
  console.log('collegeId:', harshStudent.collegeId?.toString());

  const turingUser = await User.findOne({ email: 'teacher@git.edu' });
  console.log('\n=== ALAN TURING ===');
  console.log('userId:', turingUser._id.toString());

  const turingAssignments = await Assignment.find({ teacherId: turingUser._id });
  console.log('\n=== TURING ASSIGNMENTS ===', turingAssignments.length, 'found');
  turingAssignments.forEach(a => {
    const batchMatch = a.batchId?.toString() === harshStudent.batchId?.toString();
    console.log(`  "${a.title}" | batchId: ${a.batchId} | MATCH: ${batchMatch ? 'YES' : 'NO'}`);
  });

  const allAssignments = await Assignment.find({}).lean();
  console.log('\n=== ALL ASSIGNMENTS IN DB ===', allAssignments.length, 'total');
  allAssignments.forEach(a => {
    console.log(`  "${a.title}" | teacher: ${a.teacherId} | batch: ${a.batchId}`);
  });

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
