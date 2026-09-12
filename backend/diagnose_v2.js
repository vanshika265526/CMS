// FILE: backend/diagnose_v2.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Faculty from './dist/models/Faculty.js';
import User from './dist/models/User.js';

dotenv.config();

async function diagnose() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  const t = await User.findOne({ name: /Alan Turing/i });
  if (!t) {
    console.log("Teacher Alan Turing not found");
    process.exit(0);
  }

  const faculty = await Faculty.findOne({ userId: t._id });
  console.log(`\nTeacher: ${t.name} (UserID: ${t._id})`);
  
  if (!faculty) {
    console.log("  [!] No Faculty profile found");
  } else {
    console.log(`  Faculty Document ID: ${faculty._id}`);
    console.log(`  College ID: ${faculty.collegeId}`);
    console.log(`  Assigned Subjects count: ${faculty.assignedSubjects?.length || 0}`);
    
    faculty.assignedSubjects.forEach((a, i) => {
      console.log(`\n  Assignment [${i}]:`);
      console.log(`    Subject ID: ${a.subjectId} (Type: ${typeof a.subjectId})`);
      console.log(`    Batch ID:   ${a.batchId} (Type: ${typeof a.batchId})`);
    });
  }

  process.exit(0);
}

diagnose().catch(err => {
  console.error(err);
  process.exit(1);
});
