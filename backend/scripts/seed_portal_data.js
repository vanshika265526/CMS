import mongoose from 'mongoose';
import dotenv from 'dotenv';
import College from '../dist/models/College.js';
import Batch from '../dist/models/Batch.js';
import Course from '../dist/models/Course.js';
import Subject from '../dist/models/Subject.js';
import Faculty from '../dist/models/Faculty.js';
import Student from '../dist/models/Student.js';
import Timetable from '../dist/models/Timetable.js';
import FeeStructure from '../dist/models/FeeStructure.js';
import Payment from '../dist/models/Payment.js';

dotenv.config();

async function seedPortalData() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    await mongoose.connect(uri);
    console.log("Connected to MongoDB for Portal Seeding");

    // 1. Find Existing Context
    const college = await College.findOne({ name: /Global Institute/i });
    if (!college) {
      console.error("College not found. Run base seed first!");
      process.exit(1);
    }

    const course = await Course.findOne({ collegeId: college._id, name: /Computer Science/i });
    const batch = await Batch.findOne({ collegeId: college._id, name: /Batch 2022-26/i });
    const student = await Student.findOne({ collegeId: college._id, uniqueStudentId: 'STU2024001' });
    const faculty = await Faculty.findOne({ collegeId: college._id });
    const subjectsList = await Subject.find({ collegeId: college._id, courseId: course?._id }).limit(5);

    if (!course || !batch || !student || !faculty || subjectsList.length === 0) {
      console.error("Missing prerequisite data (Course/Batch/Student/Faculty/Subjects). Check your base seed.");
      process.exit(1);
    }

    console.log(`Seeding for College: ${college.name}, Batch: ${batch.name}, Course: ${course.name}`);

    // 2. Seed FeeStructure (Upsert)
    // IMPORTANT: FeeStructure model does NOT have collegeId in schema.
    let feeDoc = await FeeStructure.findOne({ courseId: course._id, semester: 6 });
    if (!feeDoc) {
      feeDoc = await FeeStructure.create({
        courseId: course._id,
        semester: 6,
        components: [
          { name: 'Tuition Fee', amount: 65000 },
          { name: 'Laboratory Fee', amount: 15000 },
          { name: 'Library Fee', amount: 5000 }
        ],
        dueDate: new Date('2024-06-30'),
        finePerDay: 100
      });
      console.log("✅ FeeStructure Created (Semester 6)");
    }

    // 3. Seed Timetable (Mon-Fri)
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const periods = [
      { p: 1, start: '09:00', end: '10:00' },
      { p: 2, start: '10:00', end: '11:00' },
      { p: 3, start: '11:15', end: '12:15' },
      { p: 4, start: '13:00', end: '14:00' }
    ];

    // DUMMY ID for Class (model missing in repo)
    const dummyClassId = new mongoose.Types.ObjectId();

    for (const day of days) {
      const timetableExists = await Timetable.findOne({ batchId: batch._id, dayOfWeek: day });
      if (!timetableExists) {
        const slots = periods.map((per, idx) => ({
          collegeId: college._id,
          batchId: batch._id,
          classId: dummyClassId, // Required by schema
          section: 'A',          // Required by schema
          academicYear: '2024-25', // Required by schema
          subjectId: subjectsList[idx % subjectsList.length]._id,
          teacherId: faculty.userId, // Link to teacher userId
          dayOfWeek: day,
          period: per.p,
          startTime: per.start,
          endTime: per.end,
          room: 'L-202',
          isActive: true
        }));
        await Timetable.insertMany(slots);
        console.log(`✅ Timetable Created for ${day}`);
      }
    }

    // 4. Seed Mock Payments
    const paymentsCount = await Payment.countDocuments({ studentId: student._id });
    if (paymentsCount === 0) {
      await Payment.create([
        {
          studentId: student._id,
          feeStructureId: feeDoc._id,
          amountPaid: 45000,
          mode: 'online',
          receiptNumber: 'REC-' + Math.random().toString(36).substring(7).toUpperCase(),
          status: 'Paid',
          paymentDate: new Date()
        },
        {
          studentId: student._id,
          feeStructureId: feeDoc._id,
          amountPaid: 20000,
          mode: 'online',
          receiptNumber: 'REC-' + Math.random().toString(36).substring(7).toUpperCase(),
          status: 'Paid',
          paymentDate: new Date()
        }
      ]);
      console.log("✅ Mock Payments Created");
    }

    console.log("--- SEEDING COMPLETE ---");
    process.exit(0);
  } catch (err) {
    if (err.errors) {
       console.error("VALIDATION ERROR DETAIL:", JSON.stringify(err.errors, null, 2));
    } else {
       console.error("SEEDING ERROR:", err);
    }
    process.exit(1);
  }
}

seedPortalData();
