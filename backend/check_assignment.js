import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
  
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));

  const assignments = await Assignment.find({}).lean();
  console.log(`Total assignments: ${assignments.length}`);
  
  for (const a of assignments) {
    const teacher = await User.findById(a.teacherId).lean();
    console.log(`\nTitle: "${a.title}"`);
    console.log(`  Teacher email: ${teacher?.email}`);
    console.log(`  batchId on assignment: ${a.batchId?.toString()}`);
    console.log(`  collegeId on assignment: ${a.collegeId?.toString()}`);
  }

  const harshUser = await User.findOne({ email: 'student@git.edu' }).lean();
  const harshStudent = await Student.findOne({ userId: harshUser._id }).lean();
  console.log(`\nHarsh batchId: ${harshStudent.batchId?.toString()}`);
  console.log(`Harsh collegeId: ${harshStudent.collegeId?.toString()}`);

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(e => { console.error(e.message); process.exit(1); });
