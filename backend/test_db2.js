import 'dotenv/config';
import mongoose from 'mongoose';

mongoose.connect(process.env.MONGO_URI)
.then(async () => {
      const S = mongoose.model('Student', new mongoose.Schema({ personalInfo: Object, academicInfo: Object, collegeId: mongoose.Schema.Types.ObjectId }, {strict: false, collection: 'students'}));

      const q = 'harsh';
      // In libraryController, we did:
      // let collegeId = req.user?.collegeId;
      // if (!collegeId) { const college = await mongoose.model('College').findOne(); collegeId = college?._id; }
      
      const College = mongoose.model('College', new mongoose.Schema({}));
      const college = await College.findOne();
      const collegeId = college._id;

      const query = {
        collegeId, // This is what is passed in libraryController.ts
        'academicInfo.status': 'active',
        $or: [
          { 'personalInfo.firstName': { $regex: q, $options: 'i' } },
        ],
      };
      
      console.log('Query:', query);

      const students = await S.find(query);
      
      console.log('Results:', students.length);
      console.log(students.map(s => s.personalInfo.firstName));
      process.exit();
}).catch(e => { console.log('err', e); process.exit(1); })
