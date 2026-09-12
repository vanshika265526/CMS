import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();

const DEFAULT_PASSWORD = 'Student@123';

const buildAuthDefaults = () => ({
  two_factor_enabled: false,
  two_factor_method: 'email',
  login_count: 0,
  failed_login_attempts: 0,
  account_locked_until: null,
});

const buildPermissionDefaults = () => ({
  role_based: [],
  custom_permissions: [],
});

const main = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not configured in backend .env');
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const studentsCol = db.collection('students');
  const usersCol = db.collection('users');

  const students = await studentsCol.find({}, {
    projection: {
      _id: 1,
      userId: 1,
      collegeId: 1,
      uniqueStudentId: 1,
      'personalInfo.firstName': 1,
      'personalInfo.lastName': 1,
      'personalInfo.email': 1,
    },
  }).toArray();

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let createdUsers = 0;
  let updatedUsers = 0;
  let linkedStudents = 0;
  let skipped = 0;

  for (const student of students) {
    const emailRaw = student?.personalInfo?.email || '';
    const email = String(emailRaw).trim().toLowerCase();
    const firstName = String(student?.personalInfo?.firstName || '').trim();
    const lastName = String(student?.personalInfo?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim() || email;

    if (!email) {
      skipped += 1;
      continue;
    }

    const user = await usersCol.findOne({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, $options: 'i' } });

    if (!user) {
      const created = await usersCol.insertOne({
        name: fullName,
        email,
        password: passwordHash,
        role: 'STUDENT',
        collegeId: student.collegeId || null,
        isActive: true,
        authentication: buildAuthDefaults(),
        permissions: buildPermissionDefaults(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await studentsCol.updateOne({ _id: student._id }, { $set: { userId: created.insertedId } });
      createdUsers += 1;
      linkedStudents += 1;
      continue;
    }

    const updateDoc = {
      role: 'STUDENT',
      isActive: true,
      password: passwordHash,
      name: fullName,
      updatedAt: new Date(),
      authentication: {
        ...buildAuthDefaults(),
        ...(user.authentication || {}),
        failed_login_attempts: 0,
        account_locked_until: null,
      },
      permissions: user.permissions || buildPermissionDefaults(),
    };

    if (!user.collegeId && student.collegeId) {
      updateDoc.collegeId = student.collegeId;
    }

    await usersCol.updateOne({ _id: user._id }, { $set: updateDoc });
    updatedUsers += 1;

    if (!student.userId || String(student.userId) !== String(user._id)) {
      await studentsCol.updateOne({ _id: student._id }, { $set: { userId: user._id } });
      linkedStudents += 1;
    }
  }

  console.log('\nStudent login sync completed');
  console.log(`Students scanned      : ${students.length}`);
  console.log(`Users created         : ${createdUsers}`);
  console.log(`Users updated         : ${updatedUsers}`);
  console.log(`Students linked       : ${linkedStudents}`);
  console.log(`Students skipped      : ${skipped}`);
  console.log(`Default password set  : ${DEFAULT_PASSWORD}`);

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error('Sync failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
