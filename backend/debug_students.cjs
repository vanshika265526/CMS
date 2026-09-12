const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env') });

const mongoURI = process.env.MONGO_URI;

const StudentSchema = new mongoose.Schema({
    collegeId: mongoose.Schema.Types.ObjectId,
    uniqueStudentId: String,
    "academicInfo.status": String
}, { strict: false });

async function debugData() {
    try {
        await mongoose.connect(mongoURI);
        const Student = mongoose.model('Student', StudentSchema);
        const students = await Student.find({}, { uniqueStudentId: 1, collegeId: 1, academicInfo: 1 });
        console.log(`TOTAL_STUDENTS_IN_DB: ${students.length}`);
        students.forEach(s => {
            console.log(`STUDENT: ${s.uniqueStudentId} | COLLEGE: ${s.collegeId} | STATUS: ${s.academicInfo?.status}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugData();
