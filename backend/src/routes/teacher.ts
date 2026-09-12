import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as timetableController from '../controllers/timetableController.js';
import * as attendanceController from '../controllers/attendanceController.js';
import * as marksController from '../controllers/marksController.js';
import * as uploadController from '../controllers/uploadController.js';
import * as teacherStudentController from '../controllers/teacherStudentController.js';
import * as communicationController from '../controllers/communicationController.js';
import * as teacherController from '../controllers/teacherController.js';
import { uploadDocument } from '../utils/cloudinaryUploader.js';

const router = express.Router();

// Middleware stack for all routes
router.use(protect);
router.use(authorize('TEACHER'));

// --- My Assignments (Filtered) ---
router.get('/dashboard', teacherController.getTeacherDashboard);
router.get('/my-batches', teacherController.getMyBatches);
router.get('/my-subjects', teacherController.getMySubjects);
router.get('/subjects', teacherController.getAssignedSubjects);
router.get('/batches', teacherController.getAssignedBatches);
router.get('/debug-assignments', authorize('COLLEGE_ADMIN', 'SUPER_ADMIN'), teacherController.getDebugAssignments);

// --- Timetable ---
router.get('/timetable', timetableController.getTeacherTimetable);
router.get('/timetable/today', timetableController.getTodaySchedule);

// --- Attendance ---
router.post('/attendance/mark', attendanceController.markBulkAttendance);
router.get('/attendance', attendanceController.getAttendance);
router.get('/attendance/history', attendanceController.getTeacherSessionHistory);
router.get('/attendance/report/monthly', attendanceController.getMonthlyReport);
router.get('/attendance/shortage', attendanceController.getShortageAlerts);
router.get('/attendance/:classId', attendanceController.getClassAttendance);

// --- Marks ---
router.get('/marks/exams', marksController.getAssignedExams);
router.post('/marks/enter', marksController.enterMarks);
router.post('/marks/bulk', marksController.bulkEnterMarks);
router.get('/marks/:examId', marksController.getMarksByExam);
router.put('/marks/:markId', marksController.editMarks);

// --- Uploads ---
router.post('/upload', uploadDocument.single('file'), uploadController.uploadMaterial);
router.get('/materials', uploadController.getMaterials);
router.delete('/materials/:id', uploadController.deleteMaterial);

// --- Students ---
router.get('/students', teacherStudentController.getMyStudents);
router.get('/students/:studentId', teacherStudentController.getStudentProfile);

// --- Communication ---
router.post('/announcements', communicationController.createAnnouncement);
router.get('/announcements', communicationController.getAnnouncements);
router.delete('/announcements/:id', communicationController.deleteAnnouncement);
router.get('/messages', communicationController.getMessages);
router.post('/messages', communicationController.sendMessage);
router.get('/messages/:otherUserId', communicationController.getConversation);

export default router;
