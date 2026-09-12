import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const main = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not configured in backend .env');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const batches = await db.collection('batches').find({}, {
    projection: { _id: 1, collegeId: 1, name: 1, students: 1 }
  }).toArray();

  let updates = 0;

  for (const batch of batches) {
    const studentIds = Array.isArray(batch.students) ? batch.students : [];
    if (studentIds.length === 0) continue;

    const result = await db.collection('students').updateMany(
      { _id: { $in: studentIds } },
      {
        $set: {
          batchId: batch._id,
          collegeId: batch.collegeId,
          'academicInfo.batch': batch.name,
        }
      }
    );

    updates += result.modifiedCount || 0;
  }

  console.log('Student batch linkage sync completed');
  console.log(`Batches scanned        : ${batches.length}`);
  console.log(`Student docs modified  : ${updates}`);

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Sync failed:', error.message);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});
