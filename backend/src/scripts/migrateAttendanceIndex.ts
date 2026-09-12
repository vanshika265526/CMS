import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect((process.env.MONGO_URI || process.env.MONGODB_URI) as string);
    console.log("Connected to DB...");

    const db = mongoose.connection.db;
    if (!db) {
      console.log("DB not initialized");
      process.exit(1);
    }
    const collection = db.collection('attendances');

    // Add lecture field to existing ones
    const result = await collection.updateMany(
      { lecture: { $exists: false } },
      { $set: { lecture: 1 } }
    );
    console.log(`Updated ${result.modifiedCount} old attendance records to have lecture=1.`);

    // Drop old index if it exists
    try {
      await collection.dropIndex('classId_1_subjectId_1_date_1');
      console.log("Dropped old unique index successfully.");
    } catch (e: any) {
      console.log("Old index might not exist or already dropped:", e.message);
    }

    // New index will be created automatically by Mongoose upon starting the server, 
    // but we can create it here just to be safe.
    await collection.createIndex(
      { classId: 1, subjectId: 1, date: 1, lecture: 1 },
      { unique: true }
    );
    console.log("Created new compound index with lecture.");

    console.log("Done.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

migrate();
