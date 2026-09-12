import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../src/models/Student.js';
import Batch from '../src/models/Batch.js';

dotenv.config({ path: '.env' });

async function runMigration() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) throw new Error("MONGO_URI not found");

    await mongoose.connect(uri);
    console.log("Connected to MongoDB for Migration");

    // Search for students with missing, null, or undefined batchId
    const students = await Student.find({ 
      $or: [
        { batchId: { $exists: false } },
        { batchId: null }
      ]
    });
    console.log(`Found ${students.length} students missing batchId. Starting backfill...`);

    let updatedCount = 0;
    let fallbackFailures = 0;

    for (const student of students) {
      const studentBatchName = student.academicInfo?.batch?.trim();
      if (studentBatchName) {
        // 1. Try Exact match first
        let matchedBatch = await Batch.findOne({ 
          name: studentBatchName,
          collegeId: student.collegeId
        });

        // 2. Try Fuzzy match (if student says "Batch 2024", search for "2024")
        if (!matchedBatch) {
          const yearMatch = studentBatchName.match(/\d{4}/);
          if (yearMatch) {
            const yearStr = yearMatch[0];
            matchedBatch = await Batch.findOne({ 
              name: { $regex: new RegExp(yearStr) },
              collegeId: student.collegeId
            });
          }
        }

        // 3. Last resort: Global name match (ignore collegeId for seed data)
        if (!matchedBatch) {
          matchedBatch = await Batch.findOne({ name: { $regex: new RegExp(studentBatchName, 'i') } });
        }

        if (matchedBatch) {
          student.batchId = matchedBatch._id;
          await student.save();
          updatedCount++;
          console.log(`[OK] Linked ${student.personalInfo.firstName} to Batch: ${matchedBatch.name}`);
        } else {
          console.warn(`[WARN] No match for student batch: "${studentBatchName}"`);
          fallbackFailures++;
        }
      }
    }

    console.log(`\nMigration Summary:`);
    console.log(`Successfully Updated: ${updatedCount}`);
    console.log(`Failures:             ${fallbackFailures}`);
    
    process.exit(0);
  } catch (err) {
    console.error("MIGRATION ERROR:", err);
    process.exit(1);
  }
}

runMigration();
