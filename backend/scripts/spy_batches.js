import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from './dist/models/Student.js';
import Batch from './dist/models/Batch.js';

dotenv.config();

async function spy() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
    
    const students = await Student.find({"academicInfo.batch": { $exists: true }}).limit(10);
    console.log("\n--- SAMPLE STUDENT DATA ---");
    students.forEach(s => {
      console.log(`Student: ${s.personalInfo.firstName} ${s.personalInfo.lastName}`);
      console.log(`- academicInfo.batch: "${s.academicInfo.batch}"`);
      console.log(`- batchId: ${s.batchId || 'NULL'}`);
      console.log(`- collegeId: ${s.collegeId}`);
    });

    const batches = await Batch.find().limit(10);
    console.log("\n--- AVAILABLE BATCHES ---");
    batches.forEach(b => {
      console.log(`Batch Name: "${b.name}"`);
      console.log(`- ID: ${b._id}`);
      console.log(`- collegeId: ${b.collegeId}`);
      console.log(`- courseId: ${b.courseId}`);
    });

    process.exit(0);
  } catch (err) {
    console.error("SPY ERROR:", err);
    process.exit(1);
  }
}

spy();
