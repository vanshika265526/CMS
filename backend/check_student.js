import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import bcrypt from 'bcryptjs';

dotenv.config();

const checkUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    console.log('Connected to DB');

    const user = await User.findOne({ email: 'student@git.edu' });
    if (!user) {
      console.log('User student@git.edu NOT FOUND');
    } else {
      console.log('User found:', {
        name: user.name,
        email: user.email,
        role: user.role,
        hasPassword: !!user.password,
        hashPrefix: user.password?.substring(0, 10)
      });

      const isMatch = await bcrypt.compare('password123', user.password || '');
      console.log('Password "password123" match:', isMatch);
    }

    mongoose.connection.close();
  } catch (err) {
    console.error('Check failed:', err);
    process.exit(1);
  }
};

checkUser();
