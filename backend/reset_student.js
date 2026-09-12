import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.js';

dotenv.config();

const resetStudent = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log("Connected.");

        const email = 'student@git.edu';
        const newPassword = 'password123';

        const user = await User.findOne({ email });

        if (!user) {
            console.log(`User ${email} NOT FOUND. Creating one now...`);
            await User.create({
                name: 'Harsh Kumar',
                email: email,
                password: newPassword, // This will be hashed by the pre-save hook
                role: 'STUDENT',
                registrationId: 'STU2024001',
                isActive: true
            });
            console.log(`User ${email} created with password: ${newPassword}`);
        } else {
            console.log(`User ${email} found. Resetting password...`);
            user.password = newPassword; // This will be hashed by the pre-save hook
            await user.save();
            console.log(`Password reset for ${email} to: ${newPassword}`);
        }

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error("Reset failed:", err);
        process.exit(1);
    }
};

resetStudent();
