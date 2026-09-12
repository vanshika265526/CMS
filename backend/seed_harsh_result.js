import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Student from './src/models/Student.js';
import Result from './src/models/Result.js';
import Subject from './src/models/Subject.js';
import Batch from './src/models/Batch.js';
import Exam from './src/models/Exam.js';

dotenv.config();

const seed = async () => {
    try {
        console.log("Connecting...");
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log("Connected.");

        const user = await User.findOne({ email: 'student@git.edu' });
        if (!user) throw new Error("User student@git.edu not found");

        const student = await Student.findOne({ userId: user._id });
        if (!student) throw new Error("Student profile not found");

        const batch = await Batch.findById(student.batchId);
        if (!batch) throw new Error("Batch not found");

        const subjects = await Subject.find({}).limit(5);
        if (subjects.length === 0) throw new Error("No subjects found");

        const exam = await Exam.findOne({ status: 'PUBLISHED' });

        const subjectResults = subjects.map((sub, i) => ({
            subjectId: sub._id,
            subjectName: sub.name,
            marks: [86, 85, 87, 84, 86][i] ?? 85,
            maxMarks: 100,
            grade: 'A',
            gradePoint: [8.6, 8.5, 8.7, 8.4, 8.6][i] ?? 8.5,
            status: 'PASS'
        }));

        const totalObtained = subjectResults.reduce((s, r) => s + r.marks, 0);
        const totalMax = subjectResults.length * 100;
        const percentage = parseFloat(((totalObtained / totalMax) * 100).toFixed(2));

        // Clear old results for this student
        await Result.deleteMany({ studentId: student._id });
        console.log("Cleared old results.");

        await Result.create({
            type: 'EXAM',
            examId: exam?._id ?? new mongoose.Types.ObjectId(),
            studentId: student._id,
            courseId: batch.courseId,
            batchId: batch._id,
            subjects: subjectResults,
            totalMarksObtained: totalObtained,
            totalMaxMarks: totalMax,
            percentage,
            cgpa: 8.56,
            status: 'PASS',
            reAppearSubjects: [],
            publishedDate: new Date(),
            publishedBy: user._id
        });

        console.log(`CGPA: 8.56, Percentage: ${percentage}%`);
        console.log("Done.");
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error("Failed:", err.message);
        process.exit(1);
    }
};

seed();
