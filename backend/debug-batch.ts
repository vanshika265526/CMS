import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Batch from './src/models/Batch.js';
import Student from './src/models/Student.js';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  console.log('Connected to DB');
  const batch = await Batch.findOne().populate('students');
  if (!batch) return console.log('No batch found');
  
  console.log(`Batch: ${batch.name}, Students: ${batch.students.length}`);
  const studentsWithBatchId = await Student.countDocuments({ batchId: batch._id });
  console.log(`Students with batchId matching: ${studentsWithBatchId}`);
  
  const sectionCounts = await Student.aggregate([
    { $match: { batchId: batch._id } },
    { $group: { _id: "$academicInfo.section", count: { $sum: 1 } } }
  ]);
  console.log('Section counts:', sectionCounts);
  
  process.exit();
});
