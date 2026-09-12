import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../src/models/Student.js';
import Batch from '../src/models/Batch.js';

dotenv.config({ path: '.env' });

async function diagnose() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri!);
    console.log("Connected to MongoDB");

    const students = await Student.find({ batchId: { $exists: false } });
    console.log(`\n--- STUDENTS MISSING batchId (Total: ${students.length}) ---`);
    for (const s of students.slice(0, 10)) {
       console.log(`ID: ${s._id} | Name: ${s.personalInfo?.firstName} | Batch: "${s.academicInfo?.batch}" | College: ${s.collegeId}`);
    }

    const batches = await Batch.find({});
    console.log(`\n--- ALL AVAILABLE BATCHES (Total: ${batches.length}) ---`);
    for (const b of batches) {
       console.log(`Name: "${b.name}" | ID: ${b._id} | College: ${b.collegeId}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

diagnose();
