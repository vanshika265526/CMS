import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrate = async () => {
  try {
    await mongoose.connect((process.env.MONGO_URI || process.env.MONGODB_URI) as string);
    console.log('Connected to DB...');

    const db = mongoose.connection.db;
    if (!db) {
      console.error('DB not initialized');
      process.exit(1);
    }

    const collection = db.collection('departments');

    try {
      await collection.dropIndex('name_1');
      console.log('Dropped legacy global unique index: name_1');
    } catch (error: any) {
      console.log('Legacy index name_1 not found or already removed:', error.message);
    }

    await collection.createIndex({ collegeId: 1, name: 1 }, { unique: true });
    console.log('Created college-scoped unique index: { collegeId: 1, name: 1 }');

    console.log('Department index migration completed.');
    process.exit(0);
  } catch (error: any) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
};

migrate();
