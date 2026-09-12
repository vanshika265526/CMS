import mongoose from 'mongoose';

const uri = 'mongodb+srv://hargun134340_db_user:RnhUPTv6BnFiakvw@cms.wptkagn.mongodb.net/?appName=cms';

async function dynamicSync() {
  try {
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Resolve Batch ID dynamically
    const batch = await db.collection('batches').findOne({ name: 'Batch 2022-26' });
    if (!batch) {
      console.error('✗ Error: Batch "Batch 2022-26" not found.');
      process.exit(1);
    }
    const batchId = batch._id;
    console.log(`✓ Resolved Batch "${batch.name}" ID: ${batchId}`);

    // 2. Synchronize Harsh's student record
    const sUpdate = await db.collection('students').updateOne(
      { 'personalInfo.email': 'student@git.edu' },
      { $set: { batchId: batchId } }
    );
    console.log(`✓ Student Sync: ${sUpdate.modifiedCount} records updated.`);

    // 3. Synchronize "CV Submission" assignment
    const aUpdate = await db.collection('assignments').updateMany(
      { title: 'CV Submission' },
      { $set: { batchId: batchId } }
    );
    console.log(`✓ Assignment Sync: ${aUpdate.modifiedCount} records updated.`);

    console.log('--- Dynamic Sync Completed Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('✗ Sync failed:', err);
    process.exit(1);
  }
}

dynamicSync();
