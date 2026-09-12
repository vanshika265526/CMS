import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/cms_new/backend/.env' });

const testConnection = async () => {
  console.log("Connecting to:", process.env.MONGO_URI);
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || '', { serverSelectionTimeoutMS: 5000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err.message);
    process.exit(1);
  }
};

testConnection();
