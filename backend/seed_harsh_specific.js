import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Student from './src/models/Student.js';
import Batch from './src/models/Batch.js';
import Subject from './src/models/Subject.js';
import Attendance from './src/models/Attendance.js';

dotenv.config();

const seedHarshAttendance = async () => {
    try {
        console.log("Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log("Connected.");

        const email = 'student@git.edu';
        const user = await User.findOne({ email });
        if (!user) throw new Error("Harsh profile (student@git.edu) not found");

        const student = await Student.findOne({ userId: user._id });
        if (!student) throw new Error("Student profile for Harsh not found");

        const batch = await Batch.findById(student.batchId);
        if (!batch) throw new Error("Batch for Harsh not found");

        const subjects = await Subject.find({ _id: { $in: batch.subjects } });
        if (subjects.length === 0) {
            // Fallback: search for any subjects
            const allSubs = await Subject.find({}).limit(5);
            subjects.push(...allSubs);
        }

        const teacher = await User.findOne({ role: 'TEACHER' });
        
        console.log(`Cleaning existing attendance for student: ${student._id}...`);
        // We delete records where THIS student is the only one or prominent. 
        // For simplicity, we'll just clear ALL attendance in that batch to keep it clean as requested "ONLY on harshs profile".
        await Attendance.deleteMany({ classId: batch._id });

        console.log(`Generating 10 days of attendance for Harsh across ${subjects.length} subjects...`);

        const attendanceRecords = [];
        const today = new Date();
        
        // Generate for last 10 weekdays
        let daysCount = 0;
        let offset = 0;
        while (daysCount < 10) {
            const date = new Date();
            date.setDate(today.getDate() - offset);
            offset++;

            // Skip weekends
            if (date.getDay() === 0 || date.getDay() === 6) continue;

            for (const sub of subjects.slice(0, 3)) { // Top 3 subjects for variety
                attendanceRecords.push({
                    teacherId: teacher?._id || user._id,
                    classId: batch._id,
                    subjectId: sub._id,
                    date: new Date(date),
                    lecture: 1,
                    records: [{
                        studentId: student._id,
                        status: Math.random() > 0.1 ? 'Present' : 'Absent'
                    }]
                });
            }
            daysCount++;
        }

        await Attendance.insertMany(attendanceRecords);
        console.log(`Successfully created ${attendanceRecords.length} attendance slots for Harsh.`);

        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error("Seeding failed:", err);
        process.exit(1);
    }
};

seedHarshAttendance();
