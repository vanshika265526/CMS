import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    // 1. Get Harsh's true batch ID (the target batch)
    const Student = mongoose.model('Student', new mongoose.Schema({ batchId: mongoose.Schema.Types.ObjectId, 'personalInfo.firstName': String }, { collection: 'students' }));
    const s = await Student.findOne({'personalInfo.firstName': 'Harsh'});
    if (!s) return console.log('Harsh not found');
    const targetId = s.batchId;

    console.log('Target ID for mapping: ', targetId.toString());

    // 2. Patch Announcements
    const Announcement = mongoose.model('Announcement', new mongoose.Schema({ targetClass: String }, { collection: 'announcements' }));
    await Announcement.updateMany(
        { targetClass: '65e1234567890abcdef12345' },
        { $set: { targetClass: targetId.toString() } }
    );

    // 3. Patch Materials
    const Material = mongoose.model('Material', new mongoose.Schema({ classId: mongoose.Schema.Types.ObjectId }, { collection: 'materials' }));
    await Material.updateMany(
        { classId: new mongoose.Types.ObjectId('65e1234567890abcdef12345') },
        { $set: { classId: targetId } }
    );
    
    console.log('Database updated: Mapped legacy mock IDs to actual batch ID!');
    process.exit(0);
});
