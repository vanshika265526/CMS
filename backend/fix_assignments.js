import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI || '');
  
  const Assignment = mongoose.model('Assignment', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const turing = await User.findOne({ email: 'teacher@git.edu' }).lean();
  console.log('Alan Turing userId:', turing._id.toString());
  console.log('Alan Turing collegeId:', turing.collegeId?.toString());

  // Update ALL assignments to be linked to Turing with his correct collegeId
  const result = await Assignment.updateMany(
    {},
    {
      $set: {
        teacherId: turing._id,
        collegeId: turing.collegeId
      }
    }
  );
  
  console.log(`Updated ${result.modifiedCount} assignment(s) to be linked to teacher@git.edu (Alan Turing)`);

  // Verify
  const assignments = await Assignment.find({}).lean();
  for (const a of assignments) {
    console.log(`\n"${a.title}":`);
    console.log(`  teacherId: ${a.teacherId?.toString()}`);
    console.log(`  batchId:   ${a.batchId?.toString()}`);
    console.log(`  collegeId: ${a.collegeId?.toString()}`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch(e => { console.error(e.message); process.exit(1); });
