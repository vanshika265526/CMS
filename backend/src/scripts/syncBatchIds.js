import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function sync() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || '');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Resolve Batch ID dynamically
    const batch = await db.collection('batches').findOne({ name: 'Batch 2022-26' });
    if (!batch) {
      console.error('CRITICAL: Batch "Batch 2022-26" not found in database.');
      process.exit(1);
    }
    const batchId = batch._id;
    console.log(`Resolved Batch ID for "Batch 2022-26": ${batchId}`);

    // 2. Synchronize Harsh's student record
    const studentUpdate = await db.collection('students').updateOne(
      { 'personalInfo.email': 'student@git.edu' },
      { $set: { batchId: batchId } }
    );
    console.log(`Student Sync: ${studentUpdate.modifiedCount} records updated.`);

    // 3. Synchronize "CV Submission" assignment
    const assignmentUpdate = await db.collection('assignments').updateMany(
      { title: 'CV Submission', collegeId: batch.collegeId },
      { $set: { batchId: batchId } }
    );
    console.log(`Assignment Sync: ${assignmentUpdate.modifiedCount} records updated.`);

    console.log('Synchronization completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  }
}

sync();
