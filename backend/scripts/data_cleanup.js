// FILE: backend/scripts/data_cleanup.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("MONGO_URI not found in environment variables.");
  process.exit(1);
}

async function runCleanup() {
  try {
    console.log("--- STARTING DATA CLEANUP ---");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const db = mongoose.connection.db;
    const attendanceCollection = db.collection('attendances');

    const cursor = attendanceCollection.find({});
    let updatedCount = 0;
    let totalChecked = 0;

    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      totalChecked++;
      let modified = false;

      const updatedRecords = doc.records.map(record => {
        const currentId = record.studentId;
        const isString = typeof currentId === 'string';
        
        if (isString && mongoose.Types.ObjectId.isValid(currentId)) {
          record.studentId = new mongoose.Types.ObjectId(currentId);
          modified = true;
          console.log(`[CLEANUP] Converting ${currentId} for doc ${doc._id}`);
        }
        return record;
      });

      if (modified) {
        await attendanceCollection.updateOne(
          { _id: doc._id },
          { $set: { records: updatedRecords } }
        );
        updatedCount++;
      }
    }

    console.log(`--- CLEANUP FINISHED ---`);
    console.log(`Updated ${updatedCount} attendance documents.`);
    process.exit(0);
  } catch (error) {
    console.error("Cleanup failed:", error);
    process.exit(1);
  }
}

runCleanup();
