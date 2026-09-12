import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Batch from '../src/models/Batch.js';
import Student from '../src/models/Student.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

mongoose.connect(process.env.MONGO_URI as string).then(async () => {
  console.log('Connected to DB. Running sync...');
  const batches = await Batch.find();
  let updatedCount = 0;

  for (const batch of batches) {
    if (batch.students && batch.students.length > 0) {
      const res = await Student.updateMany(
        { _id: { $in: batch.students }, batchId: { $ne: batch._id } },
        { $set: { batchId: batch._id } }
      );
      updatedCount += res.modifiedCount;
    }
  }

  console.log(`Synchronization complete. Migrated mapped missing batchIds for ${updatedCount} students.`);
  process.exit(0);
}).catch(console.error);
