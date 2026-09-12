const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoURI = process.env.MONGO_URI;

const StudentSchema = new mongoose.Schema({
    collegeId: mongoose.Schema.Types.ObjectId,
    "academicInfo.status": String
}, { strict: false });

const UserSchema = new mongoose.Schema({
    role: String,
    collegeId: mongoose.Schema.Types.ObjectId
}, { strict: false });

async function fixData() {
    try {
        await mongoose.connect(mongoURI);
        console.log("Connected to MongoDB");

        const User = mongoose.model('User', UserSchema);
        const Student = mongoose.model('Student', StudentSchema);

        const admin = await User.findOne({ role: 'COLLEGE_ADMIN' });
        if (!admin || !admin.collegeId) {
            console.log("No COLLEGE_ADMIN with collegeId found.");
            process.exit(1);
        }

        console.log(`Found Admin with collegeId: ${admin.collegeId}`);

        // Update orphaned students
        const result = await Student.updateMany(
            { collegeId: { $exists: false } },
            { $set: { collegeId: admin.collegeId } }
        );

        console.log(`Updated ${result.modifiedCount} orphaned students.`);

        // Fix status case if needed
        const statusResult = await Student.updateMany(
            { "academicInfo.status": "Active" },
            { $set: { "academicInfo.status": "active" } }
        );
        console.log(`Updated ${statusResult.modifiedCount} status cases.`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

fixData();
