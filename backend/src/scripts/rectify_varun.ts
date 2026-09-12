import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Faculty from '../models/Faculty.js';
import Batch from '../models/Batch.js';
import Subject from '../models/Subject.js';
import connectDB from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const rectifyVarun = async () => {
  try {
    await connectDB();
    console.log('Database Connected...');

    const email = 'varun@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.error('User varun@gmail.com not found');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (Role: ${user.role}, ID: ${user._id})`);

    // 1. Update User Role
    user.role = 'TEACHER';
    user.name = 'Prof. Varun Sharma';
    await user.save();
    console.log('Updated user role to TEACHER');

    // 2. Delete Student Profile
    const student = await Student.findOne({ userId: user._id });
    if (student) {
      // Remove from batch
      await Batch.updateOne(
        { _id: student.batchId },
        { $pull: { students: student._id } }
      );
      await student.deleteOne();
      console.log('Deleted existing student profile and unlinked from batch');
    }

    // 3. Create Faculty Profile
    const existingFaculty = await Faculty.findOne({ userId: user._id });
    if (!existingFaculty) {
      const batch = await Batch.findOne({ name: 'Batch 2022-2026' });
      const subjects = await Subject.find({ 
        name: { $in: ['Applied Cyber Security', 'Machine Learning'] } 
      });

      if (!batch) throw new Error('Batch not found');

      await Faculty.create({
        userId: user._id,
        collegeId: user.collegeId,
        employeeId: 'EMP-VARUN',
        personalInfo: {
          name: 'Varun Sharma',
          email: user.email,
          phone: "9876543210"
        },
        assignedSubjects: subjects.map(s => ({
          subjectId: s._id,
          batchId: batch._id
        })),
        designation: 'Assistant Professor',
        status: 'Active'
      });
      console.log('Created Faculty profile with assignments');
    } else {
      console.log('Faculty profile already exists');
    }

    console.log('--- RECTIFICATION COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('Error during rectification:', error);
    process.exit(1);
  }
};

rectifyVarun();
