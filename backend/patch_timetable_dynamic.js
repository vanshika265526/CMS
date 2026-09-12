import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function patch() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const College = mongoose.model('College', new Schema({}, { strict: false, collection: 'colleges' }));
        const Batch = mongoose.model('Batch', new Schema({}, { strict: false, collection: 'batches' }));
        const User = mongoose.model('User', new Schema({}, { strict: false, collection: 'users' }));
        const Timetable = mongoose.model('Timetable', new Schema({}, { strict: false, collection: 'timetables' }));

        function Schema(obj, options) {
            return new mongoose.Schema(obj, options);
        }

        // 1. Fetch dynamic IDs
        const college = await mongoose.connection.db.collection('colleges').findOne({});
        if (!college) throw new Error('No college found');
        const collegeId = college._id;
        console.log('Using College ID:', collegeId.toString());

        const batch = await mongoose.connection.db.collection('batches').findOne({ name: 'Batch 2022-26' });
        if (!batch) throw new Error('Batch "Batch 2022-26" not found');
        const batchId = batch._id;
        console.log('Using Batch ID:', batchId.toString());

        const teacher = await mongoose.connection.db.collection('users').findOne({ name: 'Prof. Alan Turing', role: 'TEACHER' });
        if (!teacher) throw new Error('Teacher "Prof. Alan Turing" not found');
        const teacherId = teacher._id;
        console.log('Using Teacher ID:', teacherId.toString());

        // 2. Perform updates
        const result = await Timetable.updateMany(
            {}, // Update all entries for this mock fix
            {
                $set: {
                    collegeId: collegeId,
                    batchId: batchId,
                    classId: batchId, // In this model, classId ref is Batch
                    teacherId: teacherId,
                    isActive: true
                }
            }
        );

        console.log(`Successfully patched ${result.modifiedCount} timetable entries!`);
        process.exit(0);
    } catch (err) {
        console.error('Patch failed:', err);
        process.exit(1);
    }
}

patch();
