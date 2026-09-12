import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './src/models/Student.js';
import Batch from './src/models/Batch.js';

dotenv.config();

async function spy() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    
    const students = await Student.find().limit(5);
    console.log("SAMPLE STUDENT BATCH NAMES (academicInfo.batch):");
    students.forEach(s => console.log(`- ${s.academicInfo.batch} (College: ${s.collegeId})`));

    const batches = await Batch.find().limit(10);
    console.log("\nAVAILABLE BATCH NAMES (Batch model):");
    batches.forEach(b => console.log(`- ${b.name} (College: ${b.collegeId})`));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

spy();
