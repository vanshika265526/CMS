import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const checkIndices = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cms');
        const db = mongoose.connection.db;
        if (!db) throw new Error("Database connection not established");
        const indexes = await db.collection('batches').indexes();
        console.log('BATCHES INDICES:', JSON.stringify(indexes, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

checkIndices();
