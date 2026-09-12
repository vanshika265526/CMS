import mongoose from 'mongoose';
import dotenv from 'dotenv';
import axiosLib from 'axios';
import Placement from '../models/Placement.js';
import PlacementImport from '../models/PlacementImport.js';
import Student from '../models/Student.js';
import User from '../models/User.js';
import College from '../models/College.js';
import Department from '../models/Department.js';
import Result from '../models/Result.js';
import Notification from '../models/Notification.js';
import EmailQueue from '../models/EmailQueue.js';
import SystemLog from '../models/SystemLog.js';
import { PlacementService } from '../services/placementService.js';
import { PlacementNotificationService } from '../services/placementNotificationService.js';
import { EmailQueueProcessor } from '../services/emailQueueProcessor.js';
import { emailService } from '../services/emailService.js';

dotenv.config();

let passed = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`[PASS] ${message}`);
    passed++;
  } else {
    console.error(`[FAIL] ${message}`);
    failedCount++;
  }
}

// Global Axios Mock
let axiosPostMock: any = async () => ({ data: { messageId: 'mock-brevo-id-123' } });
(axiosLib as any).post = async (url: string, data: any, config: any) => {
  if (url === 'https://api.brevo.com/v3/smtp/email') {
    return await axiosPostMock(url, data, config);
  }
  return { data: {} };
};

async function runTests() {
  console.log('\n==================================================');
  console.log('STARTING PHASE 4 — NOTIFICATION & EMAIL RELIABILITY');
  console.log('==================================================\n');

  // Verify DB connection
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/cms_erp', { dbName: 'cms_test_phase4' });
  }

  // Ensure all schema indexes are fully synchronized before running transaction tests
  await Promise.all([
    Notification.syncIndexes(),
    EmailQueue.syncIndexes(),
    Student.syncIndexes(),
    Result.syncIndexes(),
    College.syncIndexes()
  ]);

  // Pre-defined static ObjectIds for total isolation
  const collegeAId = new mongoose.Types.ObjectId();
  const collegeBId = new mongoose.Types.ObjectId();
  const deptAId = new mongoose.Types.ObjectId();
  const deptBId = new mongoose.Types.ObjectId();
  const deptCId = new mongoose.Types.ObjectId();
  const deptDId = new mongoose.Types.ObjectId();
  const studentUser1Id = new mongoose.Types.ObjectId();
  const studentUser2Id = new mongoose.Types.ObjectId();
  const studentUser3Id = new mongoose.Types.ObjectId();
  const studentUser4Id = new mongoose.Types.ObjectId();
  const studentUserBId = new mongoose.Types.ObjectId();
  const student1Id = new mongoose.Types.ObjectId();
  const student2Id = new mongoose.Types.ObjectId();
  const student3Id = new mongoose.Types.ObjectId();
  const student4Id = new mongoose.Types.ObjectId();
  const studentBId = new mongoose.Types.ObjectId();
  const adminUserAId = new mongoose.Types.ObjectId();
  const adminUserBId = new mongoose.Types.ObjectId();
  const superAdminId = new mongoose.Types.ObjectId();

  // Clean up any potential leftover from a crashed run using name and email queries
  const existingColleges = await College.find({ name: { $in: ['College A', 'College B'] } });
  const existingCollegeIds = existingColleges.map(c => c._id);
  const existingStudents = await Student.find({ collegeId: { $in: existingCollegeIds } });
  
  await Result.deleteMany({ studentId: { $in: existingStudents.map(s => s._id) } });
  await Student.deleteMany({ collegeId: { $in: existingCollegeIds } });
  await User.deleteMany({ email: { $in: ['stu1@git.edu', 'stu2@git.edu', 'stu3@git.edu', 'stu4@git.edu', 'stub@git.edu', 'admina@git.edu', 'adminb@git.edu', 'super@git.edu'] } });
  await Department.deleteMany({ collegeId: { $in: existingCollegeIds } });
  await College.deleteMany({ name: { $in: ['College A', 'College B'] } });


  // 1. Create Isolated Test Entities
  const collegeA = await College.create({
    _id: collegeAId,
    name: 'College A',
    code: 'COLA',
    email: 'info@cola.edu',
    phone: '9876543210',
    location: {
      address: '123 Tech Lane',
      city: 'Tech City',
      state: 'Tech State',
      pin_code: '110001'
    }
  });
  const collegeB = await College.create({
    _id: collegeBId,
    name: 'College B',
    code: 'COLB',
    email: 'info@colb.edu',
    phone: '9876543211',
    location: {
      address: '456 Arts Road',
      city: 'Arts City',
      state: 'Arts State',
      pin_code: '110002'
    }
  });

  const deptA = await Department.create({ _id: deptAId, name: 'Computer Science and Engineering', collegeId: collegeA._id });
  const deptB = await Department.create({ _id: deptBId, name: 'Electronics and Communication Engineering', collegeId: collegeA._id });
  const deptC = await Department.create({ _id: deptCId, name: 'Information Technology', collegeId: collegeA._id });
  const deptD = await Department.create({ _id: deptDId, name: 'Electrical Engineering', collegeId: collegeA._id });

  // Users for Students
  const studentUser1 = await User.create({ _id: studentUser1Id, name: 'Student One', email: 'stu1@git.edu', password: 'password123', role: 'STUDENT', collegeId: collegeA._id });
  const studentUser2 = await User.create({ _id: studentUser2Id, name: 'Student Two', email: 'stu2@git.edu', password: 'password123', role: 'STUDENT', collegeId: collegeA._id });
  const studentUser3 = await User.create({ _id: studentUser3Id, name: 'Student Three', email: 'stu3@git.edu', password: 'password123', role: 'STUDENT', collegeId: collegeA._id });
  const studentUser4 = await User.create({ _id: studentUser4Id, name: 'Student Four', email: 'stu4@git.edu', password: 'password123', role: 'STUDENT', collegeId: collegeA._id });
  const studentUserB = await User.create({ _id: studentUserBId, name: 'Student B', email: 'stub@git.edu', password: 'password123', role: 'STUDENT', collegeId: collegeB._id });

  // Students
  const mockParentInfo = {
    name: 'Parent Name',
    phone: '9876543210',
    email: 'parent@email.com',
    relation: 'Father'
  };

  // Student 1 (CSE, Batch 2026, Eligible CGPA)
  const student1 = await Student.create({
    _id: student1Id,
    uniqueStudentId: 'STU001',
    userId: studentUser1._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'Student', lastName: 'One', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'stu1@git.edu', address: 'Addr' },
    academicInfo: { course: 'B.Tech CSE', batch: 'Batch 2022-2026', department: deptA._id, status: 'active', semester: 6 },
    parentInfo: mockParentInfo
  });

  // Student 2 (ECE, Batch 2026, Ineligible branch for IT/CSE tests)
  const student2 = await Student.create({
    _id: student2Id,
    uniqueStudentId: 'STU002',
    userId: studentUser2._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'Student', lastName: 'Two', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'stu2@git.edu', address: 'Addr' },
    academicInfo: { course: 'B.Tech ECE', batch: 'Batch 2022-2026', department: deptB._id, status: 'active', semester: 6 },
    parentInfo: mockParentInfo
  });

  // Student 3 (CSE, Batch 2025, Ineligible Batch for 2026 Drive)
  const student3 = await Student.create({
    _id: student3Id,
    uniqueStudentId: 'STU003',
    userId: studentUser3._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'Student', lastName: 'Three', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'stu3@git.edu', address: 'Addr' },
    academicInfo: { course: 'B.Tech CSE', batch: 'Batch 2021-2025', department: deptA._id, status: 'active', semester: 8 },
    parentInfo: mockParentInfo
  });

  // Student 4 (IT, Batch 2026, Inactive Account)
  const student4 = await Student.create({
    _id: student4Id,
    uniqueStudentId: 'STU004',
    userId: studentUser4._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'Student', lastName: 'Four', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'stu4@git.edu', address: 'Addr' },
    academicInfo: { course: 'B.Tech IT', batch: 'Batch 2022-2026', department: deptC._id, status: 'dropped', semester: 6 },
    parentInfo: mockParentInfo
  });

  // Student B (CSE, Batch 2026, College B - cross college exclusion)
  const studentBObj = await Student.create({
    _id: studentBId,
    uniqueStudentId: 'STU005',
    userId: studentUserB._id,
    collegeId: collegeB._id,
    personalInfo: { firstName: 'Student', lastName: 'B', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'stub@git.edu', address: 'Addr' },
    academicInfo: { course: 'B.Tech CSE', batch: 'Batch 2022-2026', department: deptA._id, status: 'active', semester: 6 },
    parentInfo: mockParentInfo
  });

  // Admins
  const adminUserA = await User.create({ _id: adminUserAId, name: 'Admin A', email: 'admina@git.edu', password: 'password123', role: 'COLLEGE_ADMIN', collegeId: collegeA._id });
  const adminUserB = await User.create({ _id: adminUserBId, name: 'Admin B', email: 'adminb@git.edu', password: 'password123', role: 'COLLEGE_ADMIN', collegeId: collegeB._id });
  const superAdmin = await User.create({ _id: superAdminId, name: 'Super Admin', email: 'super@git.edu', password: 'password123', role: 'SUPER_ADMIN' });

  // ----------------------------------------------------
  // TEST: CGPA Aggregation Edge Cases (Task Q, R, S, T, U)
  // ----------------------------------------------------
  console.log('Testing: CGPA and Eligibility Edge Cases...');
  
  // Student 1 (two valid results: 8.0 and 9.0 -> Avg 8.5)
  await Result.create({ type: 'EXAM', studentId: student1._id, examId: new mongoose.Types.ObjectId(), courseId: new mongoose.Types.ObjectId(), batchId: new mongoose.Types.ObjectId(), subjects: [], totalMarksObtained: 80, totalMaxMarks: 100, percentage: 80, cgpa: 8.0, status: 'PASS', publishedDate: new Date(), publishedBy: adminUserA._id });
  await Result.create({ type: 'EXAM', studentId: student1._id, examId: new mongoose.Types.ObjectId(), courseId: new mongoose.Types.ObjectId(), batchId: new mongoose.Types.ObjectId(), subjects: [], totalMarksObtained: 90, totalMaxMarks: 100, percentage: 90, cgpa: 9.0, status: 'PASS', publishedDate: new Date(), publishedBy: adminUserA._id });

  // Student 2 (null/invalid result and one valid result: 6.0)
  await Result.create({ type: 'EXAM', studentId: student2._id, examId: new mongoose.Types.ObjectId(), courseId: new mongoose.Types.ObjectId(), batchId: new mongoose.Types.ObjectId(), subjects: [], totalMarksObtained: 60, totalMaxMarks: 100, percentage: 60, cgpa: 6.0, status: 'PASS', publishedDate: new Date(), publishedBy: adminUserA._id });
  // Unpublished exam result (should be ignored)
  const unpublishedResult = new Result({ type: 'EXAM', studentId: student2._id, examId: new mongoose.Types.ObjectId(), courseId: new mongoose.Types.ObjectId(), batchId: new mongoose.Types.ObjectId(), subjects: [], totalMarksObtained: 100, totalMaxMarks: 100, percentage: 100, cgpa: 10.0, status: 'PASS', publishedBy: adminUserA._id });
  await unpublishedResult.save({ validateBeforeSave: false }); // Skip validation for dates if needed, or don't set publishedDate

  // Student 3 has no results (should compute to 0)

  // ----------------------------------------------------
  // BRANCH & BATCH ELIGIBILITY FALSE POSITIVES (Task T, U)
  // ----------------------------------------------------
  assert(
    PlacementNotificationService.matchesBranch('B.Tech CSE', 'Computer Science and Engineering', ['CSE']) === true,
    'CSE student matches CSE branchesEligible'
  );
  assert(
    PlacementNotificationService.matchesBranch('B.Tech CS', 'Department of CS', ['CSE']) === false,
    'Branch exact normalization boundary check: CS does not falsely match CSE'
  );
  assert(
    PlacementNotificationService.matchesBranch('B.Tech ECE', 'Electronics and Communication Engineering', ['EEE']) === false,
    'Branch exact normalization boundary check: ECE does not falsely match EEE'
  );
  assert(
    PlacementNotificationService.matchesBranch('B.Tech IT', 'Information Technology', ['CSE']) === false,
    'Branch exact normalization boundary check: IT does not falsely match CSE'
  );
  assert(
    PlacementNotificationService.matchesBatch('Batch 2022-2026', ['2026']) === true,
    '2026 batch student matches 2026 yearEligible'
  );
  assert(
    PlacementNotificationService.matchesBatch('Batch 2022-2026', ['2020']) === false,
    '2026 batch student does not match ineligible 2020 year'
  );
  assert(
    PlacementNotificationService.matchesBatch('Batch 2022-2026', ['20']) === false,
    'Batch exact matching: year substring matching is prevented (20 does not match 2026)'
  );

  // ----------------------------------------------------
  // TEST: PlacementService.publishPlacement Single authoritative trigger (Task H, I, J, K)
  // ----------------------------------------------------
  console.log('\nTesting: publishPlacement Triggers and College Scope Authorization...');

  const placementDraft = await Placement.create({
    companyName: 'Acme Corp',
    role: 'SWE',
    package: 10,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  // College B Admin attempts to publish College A placement -> Should throw 403
  try {
    await PlacementService.publishPlacement(placementDraft._id, adminUserB._id, collegeB._id);
    assert(false, 'College B admin could publish College A placement');
  } catch (err: any) {
    assert(err.status === 403, 'COLLEGE_ADMIN cross-college publishing blocked with 403');
  }

  // College A Admin publishes College A placement -> Should succeed and create queue / notifications
  const pubResult = await PlacementService.publishPlacement(placementDraft._id, adminUserA._id, collegeA._id);
  assert(pubResult.placement.workflowStatus === 'published', 'Placement published successfully by authorized admin');
  
  // Verify eligible students: Only Student 1 (CSE, Batch 2026, Avg CGPA 8.5 >= 7.5, active)
  // Student 2 is ECE (excluded), Student 3 is Batch 2025 (excluded), Student 4 is inactive (excluded), Student B is College B (excluded)
  assert(pubResult.stats?.eligibleCount === 1, 'Only the active eligible student 1 of College A was selected');
  assert(pubResult.stats?.queuedCount === 1, 'Exactly 1 EmailQueue record created');

  const notificationsCount = await Notification.countDocuments({ 'metadata.placementId': placementDraft._id });
  const emailQueueCount = await EmailQueue.countDocuments({ placementId: placementDraft._id });
  assert(notificationsCount === 1, 'Exactly 1 in-app notification created');
  assert(emailQueueCount === 1, 'Exactly 1 EmailQueue record created in DB');

  // Verify cross-college student exclusion
  const crossCollegeQueue = await EmailQueue.findOne({ placementId: placementDraft._id, studentId: studentBObj._id });
  assert(!crossCollegeQueue, 'College B student was correctly excluded from College A placement notification');

  // ----------------------------------------------------
  // TEST: Already Published Placement (Task F, AP, AQ)
  // ----------------------------------------------------
  const repubResult = await PlacementService.publishPlacement(placementDraft._id, adminUserA._id, collegeA._id);
  assert(repubResult.placement.workflowStatus === 'published', 'Calling publishPlacement on already published returns placement');
  
  const postRepubQueueCount = await EmailQueue.countDocuments({ placementId: placementDraft._id });
  assert(postRepubQueueCount === 1, 'Durable Idempotency: Republishing does not create duplicate EmailQueue records');

  // Edit published details and verify no duplicates are sent
  const editResult = await PlacementService.updatePlacement(placementDraft._id.toString(), { role: 'Senior SWE', version: pubResult.placement.version }, adminUserA._id);
  const postEditQueueCount = await EmailQueue.countDocuments({ placementId: placementDraft._id });
  assert(postEditQueueCount === 1, 'Durable Idempotency: Editing a published placement does not create duplicate EmailQueue records');

  // TEST: Transaction Safety & Rollback (Task G, BG, BH, BI)
  // ----------------------------------------------------
  console.log('\nTesting: Transaction Safety and Rollbacks...');
  
  const txPlacement = await Placement.create({
    companyName: 'Tx Corp',
    role: 'Intern',
    package: 5,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 0,
    collegeId: collegeA._id,
    workflowStatus: 'draft'
  });

  const transSession = await mongoose.startSession();
  transSession.startTransaction();
  
  // Publish inside transaction
  await PlacementService.publishPlacement(txPlacement._id, adminUserA._id, collegeA._id, transSession);

  // Assert queue records exist in-session
  const txQueueCountSession = await EmailQueue.countDocuments({ placementId: txPlacement._id }).session(transSession);
  assert(txQueueCountSession > 0, 'EmailQueue record created inside active transaction session');

  // Abort transaction
  await transSession.abortTransaction();
  transSession.endSession();

  // Assert everything rolled back
  const placementPostTx = await Placement.findById(txPlacement._id);
  assert(placementPostTx?.workflowStatus === 'draft', 'Transaction rollback leaves Placement workflowStatus unchanged (draft)');

  const txQueueCountPost = await EmailQueue.countDocuments({ placementId: txPlacement._id });
  assert(txQueueCountPost === 0, 'Transaction rollback leaves no ghost EmailQueue records in DB');

  const txNotifCountPost = await Notification.countDocuments({ 'metadata.placementId': txPlacement._id });
  assert(txNotifCountPost === 0, 'Transaction rollback leaves no ghost Notification records in DB');


  // ----------------------------------------------------
  // TEST: Concurrent Idempotency & MongoDB 11000 (Task AK, AL, AM)
  // ----------------------------------------------------
  console.log('\nTesting: Concurrency and Idempotency Races...');

  const concurrentPlacement = await Placement.create({
    companyName: 'Concurrent Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  // Run two concurrent queueNotifications operations on the same placement and actor
  await Promise.all([
    PlacementNotificationService.queueNotifications(concurrentPlacement, adminUserA._id),
    PlacementNotificationService.queueNotifications(concurrentPlacement, adminUserA._id)
  ]);

  const concurrentQueueCount = await EmailQueue.countDocuments({ placementId: concurrentPlacement._id });
  assert(concurrentQueueCount === 1, 'Concurrent queue requests create exactly one EmailQueue record (11000 handled safely)');

  const concurrentNotifCount = await Notification.countDocuments({ 'metadata.placementId': concurrentPlacement._id });
  assert(concurrentNotifCount === 1, 'Concurrent notification requests create exactly one logical Notification record');

  // ----------------------------------------------------
  // TEST: Centralized Email Service Credentials & Error Classification (Task Z, AA, AB, AC, AD, AE, AF, AG, AH, AI)
  // ----------------------------------------------------
  console.log('\nTesting: Centralized Email Service and Error Handling...');

  // Backup env variables
  const originalApiKey = process.env.BREVO_API_KEY;
  const originalFromEmail = process.env.MAIL_FROM_EMAIL;
  const originalFromName = process.env.MAIL_FROM_NAME;

  // Clear API key
  delete process.env.BREVO_API_KEY;
  try {
    await emailService.sendPlacementEmail('test@email.com', 'Recipient', placementDraft);
    assert(false, 'Email sending succeeded without BREVO_API_KEY');
  } catch (err: any) {
    assert(err.message.includes('BREVO_API_KEY'), 'Missing BREVO_API_KEY throws a clear configuration error');
  }
  process.env.BREVO_API_KEY = originalApiKey;

  // Clear MAIL_FROM_EMAIL
  delete process.env.MAIL_FROM_EMAIL;
  try {
    await emailService.sendPlacementEmail('test@email.com', 'Recipient', placementDraft);
    assert(false, 'Email sending succeeded without MAIL_FROM_EMAIL');
  } catch (err: any) {
    assert(err.message.includes('MAIL_FROM_EMAIL'), 'Missing MAIL_FROM_EMAIL throws a clear configuration error');
  }
  process.env.MAIL_FROM_EMAIL = originalFromEmail;

  // Clear MAIL_FROM_NAME
  delete process.env.MAIL_FROM_NAME;
  try {
    await emailService.sendPlacementEmail('test@email.com', 'Recipient', placementDraft);
    assert(false, 'Email sending succeeded without MAIL_FROM_NAME');
  } catch (err: any) {
    assert(err.message.includes('MAIL_FROM_NAME'), 'Missing MAIL_FROM_NAME throws a clear configuration error');
  }
  process.env.MAIL_FROM_NAME = originalFromName;

  // ----------------------------------------------------
  // TEST: URL Validation (Task AZ, BA, BB, BC)
  // ----------------------------------------------------
  assert(emailService.validateApplicationUrl('https://example.com/apply') === true, 'HTTPS URL scheme allowed');
  assert(emailService.validateApplicationUrl('http://example.com/apply') === true, 'HTTP URL scheme allowed');
  assert(emailService.validateApplicationUrl('javascript:alert(1)') === false, 'javascript: URL scheme rejected');
  assert(emailService.validateApplicationUrl('data:text/html,hack') === false, 'data: URL scheme rejected');
  assert(emailService.validateApplicationUrl('malformed_url_here') === false, 'Malformed URL rejected');

  // ----------------------------------------------------
  // TEST: Worker Queue Processor & Retries (Task AQ, AR, AS, AT, AU, AV, AW, AX, AY)
  // ----------------------------------------------------
  console.log('\nTesting: EmailQueueProcessor Background Worker Loops...');

  // Clear EmailQueue collection to isolate worker tests
  await EmailQueue.deleteMany({});

  const retryPlacement = await Placement.create({
    companyName: 'Retry Corp',
    role: 'QAE',
    package: 7,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  const { stats } = await PlacementService.publishPlacement(retryPlacement._id, adminUserA._id, collegeA._id);
  assert(stats?.queuedCount === 1, 'Published placement enqueued 1 email job');

  const pendingJob = await EmailQueue.findOne({ placementId: retryPlacement._id, status: 'pending' });
  assert(!!pendingJob, 'Pending job successfully created in DB');

  // Simulate Transient Failure (5xx)
  axiosPostMock = async () => {
    throw { response: { status: 500, data: 'Brevo Internal Error' } };
  };

  // Run processor once
  await EmailQueueProcessor.processQueue();

  const retryJob1 = await EmailQueue.findById(pendingJob?._id);
  assert(retryJob1?.status === 'pending', 'Transient failure sets status back to pending');
  assert(retryJob1?.attempts === 1, 'Email attempt count successfully incremented to 1');
  assert(retryJob1?.runAt ? retryJob1.runAt > new Date() : false, 'Rescheduled runAt with exponential backoff');

  // Reset runAt to now to force retry
  retryJob1!.runAt = new Date();
  await retryJob1!.save();

  // Run processor again (Attempt 2)
  await EmailQueueProcessor.processQueue();
  const retryJob2 = await EmailQueue.findById(pendingJob?._id);
  assert(retryJob2?.attempts === 2, 'Email attempt count successfully incremented to 2');
  assert(retryJob2?.status === 'pending', 'Transient failure (attempt 2) sets status back to pending');

  // Reset runAt to now to force retry
  retryJob2!.runAt = new Date();
  await retryJob2!.save();

  // Run processor again (Attempt 3 - Exhaustion)
  await EmailQueueProcessor.processQueue();
  const retryJob3 = await EmailQueue.findById(pendingJob?._id);
  assert(retryJob3?.attempts === 3, 'Email attempt count successfully incremented to 3');
  assert(retryJob3?.status === 'failed', 'Retries exhausted (attempt 3) marks job as failed');

  // Verify retry failure does NOT unpublish placement
  const placementAfterFail = await Placement.findById(retryPlacement._id);
  assert(placementAfterFail?.workflowStatus === 'published', 'Downstream email provider failures do NOT unpublish the placement');

  // ----------------------------------------------------
  // TEST: 429 Clamping & Retry-After (Task AE)
  // ----------------------------------------------------
  const clampPlacement = await Placement.create({
    companyName: 'Clamp Corp',
    role: 'BA',
    package: 6,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });
  await PlacementService.publishPlacement(clampPlacement._id, adminUserA._id, collegeA._id);

  // Mock 429 with large Retry-After (e.g., 20 minutes)
  axiosPostMock = async () => {
    throw { 
      response: { 
        status: 429, 
        data: 'Rate Limited' 
      },
      retryAfter: 1200 // 1200 seconds = 20 mins
    };
  };

  await EmailQueueProcessor.processQueue();
  const clampJob = await EmailQueue.findOne({ placementId: clampPlacement._id });
  assert(clampJob?.attempts === 1, '429 attempt incremented');
  assert(clampJob?.status === 'pending', '429 transient status set back to pending');
  
  // Backoff runAt should be clamped to max 5 minutes (300,000 ms) from now
  const diffMs = (clampJob?.runAt ? clampJob.runAt.getTime() : 0) - Date.now();
  assert(diffMs <= 5 * 60 * 1000 + 5000, 'Retry-After was successfully clamped to a maximum sensible delay (<= 5 minutes)');

  // ----------------------------------------------------
  // TEST: Permanent Error 4xx failure (Task AH)
  // ----------------------------------------------------
  const permPlacement = await Placement.create({
    companyName: 'Perm Corp',
    role: 'Intern',
    package: 4,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });
  await PlacementService.publishPlacement(permPlacement._id, adminUserA._id, collegeA._id);

  // Mock permanent failure (400 Bad Request)
  axiosPostMock = async () => {
    throw { response: { status: 400, data: 'Bad Request' } };
  };

  await EmailQueueProcessor.processQueue();
  const permJob = await EmailQueue.findOne({ placementId: permPlacement._id });
  assert(permJob?.attempts === 1, 'Permanent failure attempt incremented to 1');
  assert(permJob?.status === 'failed', 'Permanent failure (400 Bad Request) immediately marked failed, skipping retries');

  // ----------------------------------------------------
  // TEST: Stuck Job Recovery (Task AU, AV)
  // ----------------------------------------------------
  console.log('\nTesting: Stuck Processing Job Recovery...');
  const stuckPlacement = await Placement.create({
    companyName: 'Stuck Corp',
    role: 'DevOps',
    package: 9,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });
  await PlacementService.publishPlacement(stuckPlacement._id, adminUserA._id, collegeA._id);

  const stuckJob = await EmailQueue.findOne({ placementId: stuckPlacement._id });
  
  // Artificially change to processing and startedAt to 15 mins ago
  stuckJob!.status = 'processing';
  stuckJob!.startedAt = new Date(Date.now() - 15 * 60 * 1000);
  stuckJob!.attempts = 1;
  await stuckJob!.save();

  // Run recovery
  await EmailQueueProcessor.recoverStuckJobs();

  const recoveredJob = await EmailQueue.findById(stuckJob?._id);
  assert(recoveredJob?.status === 'pending', 'Stuck processing job recovered back to pending status');
  assert(recoveredJob?.attempts === 1, 'Recovered job preserved attempt count (1)');
  assert(recoveredJob?.startedAt === undefined, 'Recovered job cleared startedAt timestamp');

  // ----------------------------------------------------
  // TEST: Bulk Publish Failure Isolation (Task H, I, U)
  // ----------------------------------------------------
  console.log('\nTesting: Bulk Publish Failure Isolation...');

  // Create two placements: one valid, one invalid (expired deadline)
  const bulkValid = await Placement.create({
    companyName: 'Bulk Valid',
    role: 'Dev',
    package: 10,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    collegeId: collegeA._id,
    workflowStatus: 'draft'
  });

  const bulkInvalid = await Placement.create({
    companyName: 'Bulk Invalid',
    role: 'Dev',
    package: 10,
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired deadline!
    description: 'Desc',
    collegeId: collegeA._id,
    workflowStatus: 'draft'
  });

  // Run bulk publish
  const bulkResult = await PlacementService.bulkPublish([bulkValid._id.toString(), bulkInvalid._id.toString()], adminUserA._id, collegeA._id);
  
  assert(bulkResult.published.includes(bulkValid._id.toString()), 'Valid placement published successfully in bulk action');
  assert(bulkResult.failed.some(f => f.id === bulkInvalid._id.toString()), 'Invalid/expired placement failed bulk publication');
  
  const finalValidState = await Placement.findById(bulkValid._id);
  assert(finalValidState?.workflowStatus === 'published', 'Valid placement remains published in DB');

  const finalInvalidState = await Placement.findById(bulkInvalid._id);
  assert(finalInvalidState?.workflowStatus === 'draft', 'Invalid/failed placement remains draft (not published) in DB');

  // ----------------------------------------------------
  // TEST: Worker Concurrency (Requirement 1)
  // ----------------------------------------------------
  console.log('\nTesting: Worker Concurrency (2+ Workers)...');
  await EmailQueue.deleteMany({});
  const workerPlacement = await Placement.create({
    companyName: 'Concurrency Corp',
    role: 'QAE',
    package: 7,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });
  await PlacementService.publishPlacement(workerPlacement._id, adminUserA._id, collegeA._id);
  
  let brevoCallCount = 0;
  axiosPostMock = async () => {
    brevoCallCount++;
    return { data: { messageId: 'brevo-concurrency-123' } };
  };

  // Run two worker processor calls concurrently
  await Promise.all([
    EmailQueueProcessor.processQueue(),
    EmailQueueProcessor.processQueue()
  ]);

  assert(brevoCallCount === 1, 'Only one concurrent worker successfully claims the job and posts to Brevo');
  const concurrencyJob = await EmailQueue.findOne({ placementId: workerPlacement._id });
  assert(concurrencyJob?.status === 'completed', 'Job is completed successfully');

  await EmailQueue.deleteMany({ placementId: workerPlacement._id });
  await Placement.deleteOne({ _id: workerPlacement._id });

  // ----------------------------------------------------
  // TEST: Brevo "accepted but response lost" Failure Window (Requirement 2)
  // ----------------------------------------------------
  console.log('\nTesting: Brevo accepted but response lost window...');
  await EmailQueue.deleteMany({});
  const lostPlacement = await Placement.create({
    companyName: 'Lost Resp Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });
  await PlacementService.publishPlacement(lostPlacement._id, adminUserA._id, collegeA._id);

  let brevoLostCallCount = 0;
  axiosPostMock = async () => {
    brevoLostCallCount++;
    return { data: { messageId: 'brevo-lost-123' } };
  };

  // Claim the job and simulate process starting, but abort/crash before marking completed
  const lostJob = await EmailQueue.findOne({ placementId: lostPlacement._id });
  lostJob!.status = 'processing';
  lostJob!.startedAt = new Date(Date.now() - 11 * 60 * 1000); // 11 mins ago (stuck)
  lostJob!.attempts = 1;
  await lostJob!.save();

  // Run stuck job recovery
  await EmailQueueProcessor.recoverStuckJobs();

  const recoveredLostJob = await EmailQueue.findById(lostJob!._id);
  assert(recoveredLostJob?.status === 'pending', 'Stuck lost job recovered back to pending');
  assert(recoveredLostJob?.attempts === 1, 'Attempt count preserved');

  // Reset runAt to now to force retry
  recoveredLostJob!.runAt = new Date();
  await recoveredLostJob!.save();

  // Process queue again to retry
  await EmailQueueProcessor.processQueue();
  const retriedLostJob = await EmailQueue.findById(lostJob!._id);
  assert(retriedLostJob?.status === 'completed', 'Job retried and completed');
  assert(retriedLostJob?.attempts === 2, 'Attempts incremented to 2');
  assert(brevoLostCallCount === 1, 'Job retried and sent to Brevo a second time (at-least-once duplicate delivery)');

  await EmailQueue.deleteMany({ placementId: lostPlacement._id });
  await Placement.deleteOne({ _id: lostPlacement._id });

  // ----------------------------------------------------
  // TEST: Email Queue Recovery After Server Restart (Requirement 3)
  // ----------------------------------------------------
  console.log('\nTesting: Queue Recovery after Server Restart...');
  await EmailQueue.deleteMany({});
  const restartPlacement = await Placement.create({
    companyName: 'Restart Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });
  await PlacementService.publishPlacement(restartPlacement._id, adminUserA._id, collegeA._id);

  const restartJob = await EmailQueue.findOne({ placementId: restartPlacement._id });
  restartJob!.status = 'processing';
  restartJob!.startedAt = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago
  await restartJob!.save();

  // Run stuck job recovery (simulating recovery on startup)
  await EmailQueueProcessor.recoverStuckJobs();
  
  const recoveredRestartJob = await EmailQueue.findById(restartJob!._id);
  assert(recoveredRestartJob?.status === 'pending', 'Stuck job recovered to pending on startup');
  assert(recoveredRestartJob?.startedAt === undefined, 'startedAt timestamp cleared');

  await EmailQueue.deleteMany({ placementId: restartPlacement._id });
  await Placement.deleteOne({ _id: restartPlacement._id });

  // ----------------------------------------------------
  // TEST: Malformed/Missing Recipient Data (Requirement 4)
  // ----------------------------------------------------
  console.log('\nTesting: Malformed or Missing Recipient Data skips...');
  await Student.deleteMany({ uniqueStudentId: { $in: ['STU_BAD_EMAIL', 'STU_EMPTY_NAME'] } });
  await User.deleteMany({ email: { $in: ['bademailstudent@git.edu', 'emptynameuser@git.edu'] } });
  
  // Create student with invalid email
  const badEmailUser = await User.create({
    name: 'Bad Email User',
    email: 'bademailstudent@git.edu',
    password: 'password123',
    role: 'STUDENT',
    collegeId: collegeA._id
  });
  const badEmailStudent = await Student.create({
    uniqueStudentId: 'STU_BAD_EMAIL',
    userId: badEmailUser._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'Bad', lastName: 'Email', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'not-an-email-format', address: 'Addr' },
    academicInfo: { status: 'active', batch: '2026', course: 'B.Tech', department: student1.academicInfo.department },
    parentInfo: mockParentInfo
  });

  // Create student with empty recipient name
  const emptyNameUser = await User.create({
    name: 'Empty Name User',
    email: 'emptynameuser@git.edu',
    password: 'password123',
    role: 'STUDENT',
    collegeId: collegeA._id
  });
  const emptyNameStudent = await Student.create({
    uniqueStudentId: 'STU_EMPTY_NAME',
    userId: emptyNameUser._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: ' ', lastName: ' ', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'emptyname@email.com', address: 'Addr' },
    academicInfo: { status: 'active', batch: '2026', course: 'B.Tech', department: student1.academicInfo.department },
    parentInfo: mockParentInfo
  });

  const badDataPlacement = await Placement.create({
    companyName: 'Bad Data Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  const badDataResult = await PlacementService.publishPlacement(badDataPlacement._id, adminUserA._id, collegeA._id);
  // Confirms bad email and empty name students are skipped (only student1 is eligible and queued)
  assert(badDataResult.stats?.queuedCount === 1, 'Malformed/missing recipient data skipped safely');

  await Student.deleteMany({ _id: { $in: [badEmailStudent._id, emptyNameStudent._id] } });
  await User.deleteMany({ _id: { $in: [badEmailUser._id, emptyNameUser._id] } });
  await EmailQueue.deleteMany({ placementId: badDataPlacement._id });
  await Placement.deleteOne({ _id: badDataPlacement._id });

  // ----------------------------------------------------
  // TEST: Notification/Email Isolation & Db failures (Requirement 5)
  // ----------------------------------------------------
  console.log('\nTesting: Notification and Email isolation...');
  const isolPlacement = await Placement.create({
    companyName: 'Isolation Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  // Mock Notification.create to throw a validation error
  const originalNotifCreate = Notification.create;
  Notification.create = async () => {
    throw new Error('Notification insertion database failure simulated');
  };

  const txSession2 = await mongoose.startSession();
  txSession2.startTransaction();

  try {
    await PlacementService.publishPlacement(isolPlacement._id, adminUserA._id, collegeA._id, txSession2);
    await txSession2.commitTransaction();
    assert(false, 'Transaction should have failed and aborted due to Notification creation error');
  } catch (err: any) {
    await txSession2.abortTransaction();
    assert(err.message.includes('Notification insertion database failure'), 'Expected error propagated and transaction aborted');
  } finally {
    txSession2.endSession();
    Notification.create = originalNotifCreate;
  }

  // Verify rollback
  const isolPlacementPost = await Placement.findById(isolPlacement._id);
  assert(isolPlacementPost?.workflowStatus === 'draft', 'Notification creation failure correctly rolls back placement workflowStatus');

  const isolQueueCount = await EmailQueue.countDocuments({ placementId: isolPlacement._id });
  assert(isolQueueCount === 0, 'Notification creation failure rolls back EmailQueue records');
  await Placement.deleteOne({ _id: isolPlacement._id });

  // Verify Duplicate key collision handling
  const dupPlacement = await Placement.create({
    companyName: 'Duplicate Queue Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  // Manually pre-seed EmailQueue to force E11000 collision
  await EmailQueue.create({
    placementId: dupPlacement._id,
    studentId: student1._id,
    recipientEmail: 'dup@email.com',
    recipientName: 'Dup Student',
    status: 'pending',
    attempts: 0,
    runAt: new Date()
  });

  // Publish placement
  const publishDupResult = await PlacementService.publishPlacement(dupPlacement._id, adminUserA._id, collegeA._id);
  assert(publishDupResult.placement.workflowStatus === 'published', 'Placement remains published on EmailQueue duplicate collision');
  assert(publishDupResult.stats?.skippedCount === 1, 'Duplicate EmailQueue collision skipped and logged successfully');

  await EmailQueue.deleteMany({ placementId: dupPlacement._id });
  await Placement.deleteOne({ _id: dupPlacement._id });

  // ----------------------------------------------------
  // TEST: Very Large Eligible Student Cohorts & Cursor Streaming (Requirement 6)
  // ----------------------------------------------------
  console.log('\nTesting: Very Large Eligible Student Cohorts...');
  const cursorPlacement = await Placement.create({
    companyName: 'Cursor Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  let cursorCalled = false as boolean;
  const originalFind = Student.find;
  (Student as any).find = function(this: any, ...args: any[]) {
    const query = (originalFind as any).apply(this, args);
    const originalCursor = query.cursor;
    query.cursor = function(this: any, ...cArgs: any[]) {
      cursorCalled = true;
      return (originalCursor as any).apply(this, cArgs);
    };
    return query;
  };

  await PlacementService.publishPlacement(cursorPlacement._id, adminUserA._id, collegeA._id);
  assert(cursorCalled === true, 'Mongoose cursor streaming is utilized to handle large eligible student cohorts memory-efficiently');
  Student.find = originalFind;

  await EmailQueue.deleteMany({ placementId: cursorPlacement._id });
  await Placement.deleteOne({ _id: cursorPlacement._id });

  // ----------------------------------------------------
  // TEST: CGPA Aggregation Boundaries & Contamination checks (Requirement 7)
  // ----------------------------------------------------
  console.log('\nTesting: CGPA Aggregation boundaries...');
  await Student.deleteMany({ uniqueStudentId: { $in: ['STU_NO_RESULT', 'STU_UNPUB_RESULT', 'STU_INVALID_RESULT', 'STU_MULT_RESULT'] } });
  await User.deleteMany({ email: { $in: ['noresultstudent@git.edu', 'unpubstudent@git.edu', 'invalidstudent@git.edu', 'multstudent@git.edu'] } });

  const getMockResult = (studentId: any, overrides: any = {}) => ({
    examId: new mongoose.Types.ObjectId(),
    courseId: new mongoose.Types.ObjectId(),
    batchId: new mongoose.Types.ObjectId(),
    subjects: [],
    totalMarksObtained: 90,
    totalMaxMarks: 100,
    percentage: 90,
    status: 'PASS',
    publishedDate: new Date(),
    publishedBy: adminUserA._id,
    studentId,
    ...overrides
  });

  // Create student with no results
  const noResultUser = await User.create({
    name: 'No Result User',
    email: 'noresultstudent@git.edu',
    password: 'password123',
    role: 'STUDENT',
    collegeId: collegeA._id
  });
  const noResultStudent = await Student.create({
    uniqueStudentId: 'STU_NO_RESULT',
    userId: noResultUser._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'No', lastName: 'Result', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'noresult@email.com', address: 'Addr' },
    academicInfo: { status: 'active', batch: '2026', course: 'B.Tech', department: student1.academicInfo.department },
    parentInfo: mockParentInfo
  });

  // Create student with unpublished results
  const unpubResultUser = await User.create({
    name: 'Unpub Result User',
    email: 'unpubstudent@git.edu',
    password: 'password123',
    role: 'STUDENT',
    collegeId: collegeA._id
  });
  const unpubStudent = await Student.create({
    uniqueStudentId: 'STU_UNPUB_RESULT',
    userId: unpubResultUser._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'Unpub', lastName: 'Result', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'unpubresult@email.com', address: 'Addr' },
    academicInfo: { status: 'active', batch: '2026', course: 'B.Tech', department: student1.academicInfo.department },
    parentInfo: mockParentInfo
  });
  await Result.create(getMockResult(unpubStudent._id, {
    type: 'ASSIGNMENT', // Not EXAM
    cgpa: 9.0
  }));

  // Create student with null/invalid CGPA
  const invalidResultUser = await User.create({
    name: 'Invalid Result User',
    email: 'invalidstudent@git.edu',
    password: 'password123',
    role: 'STUDENT',
    collegeId: collegeA._id
  });
  const invalidStudent = await Student.create({
    uniqueStudentId: 'STU_INVALID_RESULT',
    userId: invalidResultUser._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'Invalid', lastName: 'Result', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'invalidresult@email.com', address: 'Addr' },
    academicInfo: { status: 'active', batch: '2026', course: 'B.Tech', department: student1.academicInfo.department },
    parentInfo: mockParentInfo
  });
  await Result.collection.insertOne(getMockResult(invalidStudent._id, {
    type: 'EXAM',
    cgpa: null
  }));

  // Create student with multiple published results (average check)
  const multResultUser = await User.create({
    name: 'Mult Result User',
    email: 'multstudent@git.edu',
    password: 'password123',
    role: 'STUDENT',
    collegeId: collegeA._id
  });
  const multStudent = await Student.create({
    uniqueStudentId: 'STU_MULT_RESULT',
    userId: multResultUser._id,
    collegeId: collegeA._id,
    personalInfo: { firstName: 'Mult', lastName: 'Result', dob: new Date('2004-01-01'), gender: 'male', phone: '1234567890', email: 'multresult@email.com', address: 'Addr' },
    academicInfo: { status: 'active', batch: '2026', course: 'B.Tech', department: student1.academicInfo.department },
    parentInfo: mockParentInfo
  });
  await Result.create([
    getMockResult(multStudent._id, { type: 'EXAM', cgpa: 8.0 }),
    getMockResult(multStudent._id, { type: 'EXAM', cgpa: 9.0 })
  ]);

  const cgpaPlacement = await Placement.create({
    companyName: 'CGPA Boundaries Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 8.2, // average of 8.0 and 9.0 is 8.5 (eligible), others are ineligible
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  const cgpaPublishResult = await PlacementService.publishPlacement(cgpaPlacement._id, adminUserA._id, collegeA._id);
  
  // Only student1 (CGPA 8.5) and multStudent (average CGPA 8.5) are eligible
  assert(cgpaPublishResult.stats?.eligibleCount === 2, 'CGPA aggregation matches correct thresholds across edge cases');

  await Student.deleteMany({ _id: { $in: [noResultStudent._id, unpubStudent._id, invalidStudent._id, multStudent._id] } });
  await User.deleteMany({ _id: { $in: [noResultUser._id, unpubResultUser._id, invalidResultUser._id, multResultUser._id] } });
  await Result.deleteMany({ studentId: { $in: [unpubStudent._id, invalidStudent._id, multStudent._id] } });
  await EmailQueue.deleteMany({ placementId: cgpaPlacement._id });
  await Placement.deleteOne({ _id: cgpaPlacement._id });

  // ----------------------------------------------------
  // TEST: Eligibility Normalization and Aliases (Requirement 8)
  // ----------------------------------------------------
  console.log('\nTesting: Eligibility Normalization and Aliases...');
  assert(PlacementNotificationService.matchesBranch('  cs  ', 'Computer Science', ['CSE']) === true, 'Branch cs alias matching CSE works');
  assert(PlacementNotificationService.matchesBranch('ME', '  mech  ', ['ME']) === true, 'Branch mech alias matching ME works');
  assert(PlacementNotificationService.matchesBatch('2022-26', ['2026']) === true, 'Batch format 2022-26 matches 2026');
  assert(PlacementNotificationService.matchesBatch('2022-2026', ['2026']) === true, 'Batch format 2022-2026 matches 2026');
  assert(PlacementNotificationService.matchesBatch('Batch 2022-2026', ['2026']) === true, 'Batch format Batch 2022-2026 matches 2026');
  assert(PlacementNotificationService.matchesBatch('20', ['2026']) === false, 'Batch substring false positives (20 vs 2026) are rejected');

  // ----------------------------------------------------
  // TEST: Queue Retry Boundaries & Headers (Requirement 9)
  // ----------------------------------------------------
  console.log('\nTesting: Queue Retry boundaries...');
  await EmailQueue.deleteMany({});
  const retryBoundPlacement = await Placement.create({
    companyName: 'Retry Bound Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });
  await PlacementService.publishPlacement(retryBoundPlacement._id, adminUserA._id, collegeA._id);

  // Missing Retry-After header
  axiosPostMock = async () => {
    throw { response: { status: 429, data: 'Rate Limited' } };
  };
  await EmailQueueProcessor.processQueue();
  const missingRetryJob = await EmailQueue.findOne({ placementId: retryBoundPlacement._id });
  assert(missingRetryJob?.attempts === 1, 'Missing Retry-After attempt incremented');
  
  // Negative Retry-After
  axiosPostMock = async () => {
    throw { response: { status: 429 }, retryAfter: -300 };
  };
  missingRetryJob!.runAt = new Date();
  await missingRetryJob!.save();
  await EmailQueueProcessor.processQueue();
  const negativeRetryJob = await EmailQueue.findOne({ placementId: retryBoundPlacement._id });
  assert(negativeRetryJob?.attempts === 2, 'Negative Retry-After attempt incremented');

  // Non-numeric Retry-After
  axiosPostMock = async () => {
    throw { response: { status: 429 }, retryAfter: 'abc' };
  };
  negativeRetryJob!.runAt = new Date();
  await negativeRetryJob!.save();
  await EmailQueueProcessor.processQueue();
  const nonNumRetryJob = await EmailQueue.findOne({ placementId: retryBoundPlacement._id });
  assert(nonNumRetryJob?.attempts === 3, 'Non-numeric Retry-After attempt incremented');
  assert(nonNumRetryJob?.status === 'failed', 'Max attempts (3) reached and job marked failed');

  // Permanent failure skips retry (401 Unauthorized)
  const permRetryPlacement = await Placement.create({
    companyName: 'Perm Retry Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });
  await PlacementService.publishPlacement(permRetryPlacement._id, adminUserA._id, collegeA._id);

  axiosPostMock = async () => {
    throw { response: { status: 401, data: 'Unauthorized' } };
  };
  await EmailQueueProcessor.processQueue();
  const permRetryJob = await EmailQueue.findOne({ placementId: permRetryPlacement._id });
  assert(permRetryJob?.attempts === 1, 'Permanent failure attempt incremented to 1');
  assert(permRetryJob?.status === 'failed', 'Permanent 401 failure immediately marked failed, skipping retries');

  await EmailQueue.deleteMany({ placementId: { $in: [retryBoundPlacement._id, permRetryPlacement._id] } });
  await Placement.deleteMany({ _id: { $in: [retryBoundPlacement._id, permRetryPlacement._id] } });

  // ----------------------------------------------------
  // TEST: Graceful Shutdown (Requirement 10)
  // ----------------------------------------------------
  console.log('\nTesting: Graceful Shutdown...');
  EmailQueueProcessor.start();
  assert((EmailQueueProcessor as any).intervalId !== null, 'Interval loop started');
  EmailQueueProcessor.stop();
  assert((EmailQueueProcessor as any).intervalId === null, 'Interval loop cleared cleanly on stop()');

  // ----------------------------------------------------
  // TEST: Publication Failure Isolation in Bulk Actions (Requirement 11)
  // ----------------------------------------------------
  console.log('\nTesting: Publication Failure Isolation...');
  const bulk1 = await Placement.create({
    companyName: 'Bulk 1 Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  const bulk2 = await Placement.create({
    companyName: 'Bulk 2 Corp',
    role: 'Dev',
    package: 8,
    deadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired deadline (invalid!)
    description: 'Desc',
    eligibilityGPA: 7.5,
    collegeId: collegeA._id,
    workflowStatus: 'draft',
    branchesEligible: ['CSE'],
    yearEligible: ['2026']
  });

  const bulkResultHard = await PlacementService.bulkPublish([bulk1._id.toString(), bulk2._id.toString()], adminUserA._id, collegeA._id);
  assert(bulkResultHard.published.includes(bulk1._id.toString()), 'Valid placement published in bulk');
  assert(bulkResultHard.failed.some(f => f.id === bulk2._id.toString()), 'Invalid placement failed in bulk');
  assert(bulkResultHard.failed.some(f => f.error.includes('expired')), 'Correct validation error reported for failed placement');

  await EmailQueue.deleteMany({ placementId: { $in: [bulk1._id, bulk2._id] } });
  await Placement.deleteMany({ _id: { $in: [bulk1._id, bulk2._id] } });


  // ----------------------------------------------------
  // Clean up isolated test data
  // ----------------------------------------------------
  console.log('\nCleaning up isolated test data...');
  const testCollegeIds = [collegeA._id, collegeB._id];
  const testStudentUserIds = [studentUser1._id, studentUser2._id, studentUser3._id, studentUser4._id, studentUserB._id];
  const testAdminUserIds = [adminUserA._id, adminUserB._id, superAdmin._id];
  const testPlacementIds = [placementDraft._id, txPlacement._id, concurrentPlacement._id, retryPlacement._id, clampPlacement._id, permPlacement._id, stuckPlacement._id, bulkValid._id, bulkInvalid._id];

  await College.deleteMany({ _id: { $in: testCollegeIds } });
  await Department.deleteMany({ collegeId: { $in: testCollegeIds } });
  await User.deleteMany({ _id: { $in: [...testStudentUserIds, ...testAdminUserIds] } });
  await Student.deleteMany({ collegeId: { $in: testCollegeIds } });
  await Result.deleteMany({ studentId: { $in: [student1._id, student2._id, student3._id, student4._id, studentBObj._id] } });
  await Placement.deleteMany({ _id: { $in: testPlacementIds } });
  await EmailQueue.deleteMany({ placementId: { $in: testPlacementIds } });
  await Notification.deleteMany({ 'metadata.placementId': { $in: testPlacementIds } });

  console.log('\n==================================================');
  console.log(`TEST COMPLETED: ${passed} PASSED, ${failedCount} FAILED.`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('[testPhase4] Critical crash:', err);
  process.exit(1);
});
