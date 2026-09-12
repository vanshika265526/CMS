import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function debug() {
    await mongoose.connect(process.env.MONGO_URI);
    
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false, collection: 'users' }));
    const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false, collection: 'students' }));
    const Batch = mongoose.model('Batch', new mongoose.Schema({}, { strict: false, collection: 'batches' }));
    const Timetable = mongoose.model('Timetable', new mongoose.Schema({}, { strict: false, collection: 'timetables' }));

    const data = {};

    data.students = await Student.find({}, {
        _id: 1, userId: 1, batchId: 1, 
        'academicInfo.batch': 1, 'academicInfo.section': 1, 
        'personalInfo.firstName': 1, collegeId: 1
    }).limit(5);

    data.batches = await Batch.find({}, { _id: 1, name: 1, collegeId: 1 });

    data.timetables = await Timetable.find({}, {
        _id: 1, batchId: 1, teacherId: 1, 
        dayOfWeek: 1, period: 1, startTime: 1, 
        collegeId: 1, isActive: 1
    }).limit(10);

    data.teachers = await User.find({ role: 'TEACHER' }, { _id: 1, name: 1, collegeId: 1 }).limit(3);

    console.log(JSON.stringify(data, null, 2));
    process.exit(0);
}

debug();
