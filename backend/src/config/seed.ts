import mongoose from 'mongoose';
import dotenv from 'dotenv';
import College from '../models/College.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Course from '../models/Course.js';
import Batch from '../models/Batch.js';
import Subject from '../models/Subject.js';
import Student from '../models/Student.js';
import Parent from '../models/Parent.js';
import Faculty from '../models/Faculty.js';
import Attendance from '../models/Attendance.js';
import Exam from '../models/Exam.js';
import Result from '../models/Result.js';
import connectDB from './db.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data for a clean reset
    console.log('Cleaning existing data...');
    await Promise.all([
      User.deleteMany(),
      College.deleteMany(),
      Department.deleteMany(),
      Course.deleteMany(),
      Batch.deleteMany(),
      Subject.deleteMany(),
      Student.deleteMany(),
      Parent.deleteMany(),
      Faculty.deleteMany(),
      Attendance.deleteMany(),
      Exam.deleteMany(),
      Result.deleteMany()
    ]);

    // 1. Create Default College
    const college = await College.create({
      name: 'Global Institute of Technology',
      address: '123 Academic Way, Tech City',
      contactEmail: 'info@git.edu',
      contactPhone: '1234567890',
      status: 'active',
    });
    console.log('College Created');

    // 2. Create Departments & Courses
    const dept = await Department.create({
      name: 'Computer Science & Engineering',
      collegeId: college._id,
      hod: 'Dr. Alan Turing',
      courses: ['B.Tech Computer Science']
    });

    const course = await Course.create({
      name: 'B.Tech Computer Science',
      code: 'CS-BTECH',
      department: dept._id,
      collegeId: college._id,
      duration: 4,
      totalSeats: 60
    });
    console.log('Department & Course Created');

    // 3. Create Batch & Subjects
    const batch = await Batch.create({
      name: 'Batch 2022-2026',
      courseId: course._id,
      collegeId: college._id,
      startYear: 2022,
      endYear: 2026,
      sections: ['A', 'B']
    });

    const subjects = await Subject.create([
      { name: 'Advanced Algorithms', code: 'CS601', creditHours: 4, courseId: course._id, collegeId: college._id },
      { name: 'Database Systems', code: 'CS602', creditHours: 3, courseId: course._id, collegeId: college._id },
      { name: 'Software Engineering', code: 'CS603', creditHours: 3, courseId: course._id, collegeId: college._id },
      { name: 'Applied Cyber Security', code: 'CS604', creditHours: 3, courseId: course._id, collegeId: college._id },
      { name: 'Machine Learning', code: 'CS605', creditHours: 4, courseId: course._id, collegeId: college._id },
      { name: 'Data Structures', code: 'CS606', creditHours: 4, courseId: course._id, collegeId: college._id },
      { name: 'Computer Networks', code: 'CS607', creditHours: 3, courseId: course._id, collegeId: college._id },
      { name: 'Operating Systems', code: 'CS608', creditHours: 3, courseId: course._id, collegeId: college._id },
      { name: 'Distributed Systems', code: 'CS609', creditHours: 3, courseId: course._id, collegeId: college._id },
      { name: 'Quantum Computing', code: 'CS610', creditHours: 4, courseId: course._id, collegeId: college._id }
    ]);
    console.log('Batch & Subjects Created');

    // 4. Create Users (Roles)
    const extraStudents = [
      { name: 'Ananya Iyer', email: 'ananya@gmail.com', password: 'password123', regId: 'STU2024003' },
      { name: 'Rohan Mehta', email: 'rohan@gmail.com', password: 'password123', regId: 'STU2024004' },
      { name: 'Sanya Gupta', email: 'sanya@gmail.com', password: 'password123', regId: 'STU2024005' },
      { name: 'Ishaan Verma', email: 'ishaan@gmail.com', password: 'password123', regId: 'STU2024006' },
      { name: 'Kavya Nair', email: 'kavya@gmail.com', password: 'password123', regId: 'STU2024007' },
      { name: 'Aditya Singh', email: 'aditya@gmail.com', password: 'password123', regId: 'STU2024008' },
      { name: 'Riya Kapoor', email: 'riya@gmail.com', password: 'password123', regId: 'STU2024009' },
      { name: 'Zoya Khan', email: 'zoya@gmail.com', password: 'password123', regId: 'STU2024010' },
      { name: 'Kabir Das', email: 'kabir@gmail.com', password: 'password123', regId: 'STU2024011' }
    ];

    const usersData = [
      { name: 'Global Super Admin', email: 'superadmin@ngcms.edu', password: 'password123', role: 'SUPER_ADMIN' },
      { name: 'Dr. Rajesh Khanna', email: 'admin@git.edu', password: 'password123', role: 'COLLEGE_ADMIN', collegeId: college._id },
      { name: 'Prof. Alan Turing', email: 'teacher@git.edu', password: 'password123', role: 'TEACHER', collegeId: college._id },
      { name: 'Prof. Grace Hopper', email: 'hopper@git.edu', password: 'password123', role: 'TEACHER', collegeId: college._id },
      { name: 'Dr. Richard Feynman', email: 'feynman@git.edu', password: 'password123', role: 'TEACHER', collegeId: college._id },
      { name: 'Prof. Nikola Tesla', email: 'tesla@git.edu', password: 'password123', role: 'TEACHER', collegeId: college._id },
      { name: 'Prof. Varun Sharma', email: 'varun@gmail.com', password: 'password123', role: 'TEACHER', collegeId: college._id },
      { name: 'Margaret Hamilton', email: 'librarian@git.edu', password: 'password123', role: 'LIBRARIAN', collegeId: college._id, employeeId: 'EMP-LIBRARIAN' },
      { name: 'Harsh Kumar', email: 'student@git.edu', password: 'password123', role: 'STUDENT', collegeId: college._id, registrationId: 'STU2024001' },
      { name: 'Mr. Sharma', email: 'parent@git.edu', password: 'password123', role: 'PARENT', collegeId: college._id, registrationId: 'PAR2024001' },
      ...extraStudents.map(s => ({ 
        name: s.name, email: s.email, password: s.password, role: 'STUDENT', collegeId: college._id, registrationId: s.regId 
      })),
      ...extraStudents.map(s => ({
        name: `Parent of ${s.name.split(' ')[0]}`, email: `p.${s.email}`, password: 'password123', role: 'PARENT', collegeId: college._id, registrationId: `PAR-${s.regId}`
      }))
    ];

    const users: any = {};
    for (const u of usersData) {
      users[u.email] = await User.create(u);
    }
    console.log('Users Created (Total: ' + usersData.length + ')');

    // 5. Create Student Profiles
    const studentEmails = ['student@git.edu', ...extraStudents.map(s => s.email)];
    const studentsArr = [];

    for (const email of studentEmails) {
      const u = users[email];
      const parentName = email === 'student@git.edu' ? 'Mr. Sharma' : `Parent of ${u.name.split(' ')[0]}`;
      const parentEmail = email === 'student@git.edu' ? 'parent@git.edu' : `p.${email}`;

      const s = await Student.create({
        uniqueStudentId: u.registrationId,
        userId: u._id,
        collegeId: college._id,
        batchId: batch._id,
        personalInfo: {
          firstName: u.name.split(' ')[0],
          lastName: u.name.split(' ')[1] || 'Kumar',
          dob: new Date('2004-05-15'),
          gender: 'male',
          phone: '9876543210',
          email: u.email,
          address: '123 Student Housing, Tech City'
        },
        academicInfo: {
          course: 'B.Tech Computer Science',
          batch: 'Batch 2022-2026',
          department: dept._id,
          status: 'active',
          semester: 6,
          rollNumber: `CS220${studentEmails.indexOf(email) + 1}`.padEnd(7, '0')
        },
        parentInfo: {
          name: parentName,
          phone: "9123456780",
          email: parentEmail,
          relation: "Father"
        }
      });
      studentsArr.push(s);
      batch.students.push(s._id);
    }
    await batch.save();
    console.log('11 Student Profiles Created & Linked to Batch');

    // 6. Create Parent Profiles & Link
    for (const s of studentsArr) {
      const u = users[s.personalInfo.email];
      const parentEmail = s.personalInfo.email === 'student@git.edu' ? 'parent@git.edu' : `p.${s.personalInfo.email}`;
      await Parent.create({
        userId: users[parentEmail]._id,
        students: [s._id],
        relation: 'Father',
        phone: '9123456780',
        address: '123 Parental Circle, Tech City'
      });
    }
    console.log('11 Parent Profiles Created & Linked to Students');

    // 7. Create Faculty Profiles & Wire Assignments
    const facultyConfigs = [
      { email: 'teacher@git.edu', subjects: subjects.slice(0, 3) },
      { email: 'hopper@git.edu', subjects: [subjects[4], subjects[5]] },
      { email: 'feynman@git.edu', subjects: [subjects[8], subjects[9]] },
      { email: 'tesla@git.edu', subjects: [subjects[6], subjects[7]] },
      { email: 'varun@gmail.com', subjects: [subjects[3], subjects[4]] }
    ];

    for (const f of facultyConfigs) {
      await Faculty.create({
        userId: users[f.email]._id,
        collegeId: college._id,
        employeeId: `EMP-${f.email.split('@')[0].toUpperCase()}`,
        personalInfo: { 
          name: users[f.email].name, 
          email: f.email 
        },
        assignedSubjects: f.subjects.map(s => ({ subjectId: s._id, batchId: batch._id }))
      });
    }
    console.log('Faculty Profiles Created & Assignments Wired');

    // 8. Generate Mock Attendance (30 days)
    const attendanceRecords = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      if (date.getDay() === 0) continue;

      for (const sub of subjects) {
        attendanceRecords.push({
          classId: batch._id,
          subjectId: sub._id,
          teacherId: users['teacher@git.edu']._id,
          collegeId: college._id,
          date: date,
          records: studentsArr.map(s => ({
            studentId: s._id,
            status: Math.random() > 0.15 ? 'Present' : 'Absent'
          }))
        });
      }
    }
    await Attendance.insertMany(attendanceRecords);
    console.log('Mock Attendance Generated for 11 Students (30 Days)');
    
    // 9. Create Mock Exam & Result
    const exam = await Exam.create({
      collegeId: college._id,
      code: 'SEM-FIN-2024',
      name: 'Semester Final Examination - 2024',
      examType: 'EXTERNAL',
      scheduleDate: new Date(),
      duration: 180,
      courses: [course._id],
      subjects: subjects.map(s => s._id),
      totalMarks: 100,
      passingMarks: 40,
      gradingScheme: [
        { grade: 'A+', minMarks: 90, maxMarks: 100, gradePoint: 10 },
        { grade: 'A', minMarks: 80, maxMarks: 89, gradePoint: 9 },
        { grade: 'B+', minMarks: 70, maxMarks: 79, gradePoint: 8 },
        { grade: 'B', minMarks: 60, maxMarks: 69, gradePoint: 7 },
        { grade: 'C', minMarks: 50, maxMarks: 59, gradePoint: 6 },
        { grade: 'D', minMarks: 40, maxMarks: 49, gradePoint: 5 },
        { grade: 'F', minMarks: 0, maxMarks: 39, gradePoint: 0 }
      ],
      status: 'PUBLISHED',
      publishedDate: new Date(),
      createdBy: users['admin@git.edu']._id
    });

    for (const s of studentsArr) {
      await Result.create({
        examId: exam._id,
        studentId: s._id,
        courseId: course._id,
        batchId: batch._id,
        subjects: subjects.map(sub => ({
          subjectId: sub._id,
          subjectName: sub.name,
          marks: 60 + Math.floor(Math.random() * 35),
          maxMarks: 100,
          grade: 'B',
          gradePoint: 8,
          status: 'PASS'
        })),
        totalMarksObtained: 240 + Math.floor(Math.random() * 50),
        totalMaxMarks: 300,
        percentage: 80 + Math.floor(Math.random() * 15),
        cgpa: 8.0 + (Math.random() * 1.5),
        status: 'PASS',
        publishedDate: new Date(),
        publishedBy: users['admin@git.edu']._id
      });
    }
    console.log('Mock Exam & Results Created for 11 Students');
    console.log('Mock Exam & Result Created');

    console.log('--- SEEDING COMPLETE ---');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

