import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import multer from "multer";
import path from 'path';
import fs from 'fs';
import {
  createEnquiry,
  getEnquiries,
  updateEnquiryStatus,
  submitApplication,
  getApplications,
  updateApplicationStatus,
  enrollStudent,
  getAdmissionsReport
} from "../controllers/admissionsController.js";
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  updateStudentEnrollmentId,
  softDeleteStudent,
  bulkImportStudents,
  updateStudentStatus,
  resetStudentPasswordsBulk
} from "../controllers/studentsController.js";
import {
  getFaculties,
  getFacultyById,
  createFaculty,
  updateFaculty,
  softDeleteFaculty,
  assignSubjects,
  getFacultyAttendanceStats
} from "../controllers/facultyController.js";
import {
  getCourses,
  createCourse,
  updateCourse,
  getSubjects,
  createSubject,
  getBatches,
  createBatch,
  updateBatch,
  addBatchSection,
  removeBatchSection,
  getBatchStudents,
  removeStudentFromBatch,
  assignStudentsToSection,
  assignTeacherToSection
} from "../controllers/academicsController.js";
import {
  getAttendanceOverview,
  getAttendanceReports,
  getShortageList,
  getStudentWiseAttendance,
  getStudentAttendanceDetail,
  adminOverrideAttendance
} from "../controllers/adminAttendanceController.js";
import {
  createExam,
  getExams,
  getExamStats,
  getExamById,
  updateExam,
  publishResults,
  getMarks,
  getResults,
  generateExamAnalysis
} from "../controllers/examsController.js";
import {
  getFeeStructures,
  createFeeStructure,
  updateFeeStructure,
  deleteFeeStructure,
  getScholarships,
  createScholarship,
  updateScholarship,
  deleteScholarship,
  getFeeAdjustments,
  createFeeAdjustment,
  getPayments,
  recordPayment,
  getFinancialSummary,
  getStudentFeeLedger
} from "../controllers/feeController.js";
import {
  getAnnouncements,
  createAnnouncement,
  getMessages,
  sendMessage,
  getConversation,
  uploadMessageAttachment,
} from "../controllers/communicationController.js";
import { updateUserProfile } from "../controllers/authController.js";
import {
  getNaacDocuments,
  uploadNaacDocument,
  updateDocumentStatus,
  getComplianceStats
} from "../controllers/naacController.js";
import { getDashboardStats, getEnrollmentActivity } from "../controllers/adminDashboardController.js";
import {
  assignTeacher,
  assignStudentToBatch,
  bulkAssignStudentsToBatch,
  removeTeacherAssignment,
  getAssignments
} from "../controllers/adminAssignmentController.js";
import {
  createTimetableEntry,
  getFullTimetable,
  getConflicts,
  deleteTimetableEntry,
  updateTimetableEntry,
  getTimeSlots
} from "../controllers/timetableController.js";

const router = express.Router();
const uploadCsv = multer({ dest: "uploads/temp/" });
const messageUploadDir = path.join(process.cwd(), 'uploads', 'messages');
if (!fs.existsSync(messageUploadDir)) {
  fs.mkdirSync(messageUploadDir, { recursive: true });
}
const messageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, messageUploadDir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// All routes require protection and Admin authorization (uppercase normalized in middleware)
router.use(protect);
router.use(authorize("COLLEGE_ADMIN", "SUPER_ADMIN"));

// Modules Registry
// -------------------------------------------------------------

// Dashboard Stats
router.get("/stats", getDashboardStats);
router.get('/dashboard/enrollment-activity', getEnrollmentActivity);
router.patch('/profile', updateUserProfile);

// Module 0: Academic Assignments
router.get("/assignments", getAssignments);
router.post("/assign-teacher", assignTeacher);
router.delete("/assign-teacher", removeTeacherAssignment);
router.post("/assign-student-batch", assignStudentToBatch);
router.post("/bulk-assign-students-batch", bulkAssignStudentsToBatch);

// Module 1: Admissions
router.post("/enquiries", createEnquiry);
router.get("/enquiries", getEnquiries);
router.put("/enquiries/:id", updateEnquiryStatus);

router.post("/applications", submitApplication);
router.get("/applications", getApplications);
router.put("/applications/:id", updateApplicationStatus);
router.post("/applications/enroll", enrollStudent);

router.get("/admissions/reports", getAdmissionsReport);

// Module 2: SIS (Student Information System)
router.get("/students", getStudents);
router.get("/students/:id", getStudentById);
router.post("/students", createStudent);
router.put("/students/:id", updateStudent);
router.put("/students/:id/enrollment-id", updateStudentEnrollmentId);
router.delete("/students/:id", softDeleteStudent);
router.post("/students/bulk-import", uploadCsv.single("file"), bulkImportStudents);
router.put("/students/:id/status", updateStudentStatus);
router.post("/students/reset-passwords", resetStudentPasswordsBulk);

// Module 3: Faculty Management
router.get("/faculty", getFaculties);
router.get("/faculty/:id", getFacultyById);
router.post("/faculty", createFaculty);
router.put("/faculty/:id", updateFaculty);
router.delete("/faculty/:id", softDeleteFaculty);
router.put("/faculty/:id/assign", assignSubjects);
router.get("/faculty/:id/attendance-stats", getFacultyAttendanceStats);

// Module 4: Academics
router.get("/courses", getCourses);
router.post("/courses", createCourse);
router.put("/courses/:id", updateCourse);

router.get("/subjects", getSubjects);
router.post("/subjects", createSubject);

router.get("/batches", getBatches);
router.post("/batches", createBatch);
router.put("/batches/:id", updateBatch);
router.get("/batches/:id/students", getBatchStudents);
router.delete("/batches/:id/students/:studentId", removeStudentFromBatch);
router.put("/batches/:id/sections/:section/students", assignStudentsToSection);
router.put("/batches/:id/sections/:section/teacher", assignTeacherToSection);
router.post("/batches/:id/sections", addBatchSection);
router.delete("/batches/:id/sections/:section", removeBatchSection);

// Module 5: Attendance
router.get("/attendance/overview", getAttendanceOverview);
router.get("/attendance/reports", getAttendanceReports);
router.get("/attendance/shortage", getShortageList);
router.get("/attendance/student-wise", getStudentWiseAttendance);
router.get("/attendance/student/:studentId", getStudentAttendanceDetail);
router.put("/attendance/override", adminOverrideAttendance);

// Module 6: Exams & Results
router.get("/exams", getExams);
router.get('/exams/stats', getExamStats);
router.get("/exams/:examId", getExamById);
router.post("/exams", createExam);
router.put("/exams/:examId", updateExam);
router.post("/exams/:examId/publish", publishResults);
router.get("/exams/:examId/marks", getMarks);
router.get("/results", getResults);
router.get("/exams/reports/analysis", generateExamAnalysis);

// Module 7: Fee Management
router.get("/fees/structures", getFeeStructures);
router.post("/fees/structures", createFeeStructure);
router.put("/fees/structures/:id", updateFeeStructure);
router.delete("/fees/structures/:id", deleteFeeStructure);
router.get("/fees/scholarships", getScholarships);
router.post("/fees/scholarships", createScholarship);
router.put("/fees/scholarships/:id", updateScholarship);
router.delete("/fees/scholarships/:id", deleteScholarship);
router.get("/fees/adjustments", getFeeAdjustments);
router.post("/fees/adjustments", createFeeAdjustment);
router.get("/fees/payments", getPayments);
router.post("/fees/payments", recordPayment);
router.get("/fees/summary", getFinancialSummary);
router.get("/fees/ledger", getStudentFeeLedger);

// Module 8: Communication
router.get("/communication/announcements", getAnnouncements);
router.post("/communication/announcements", createAnnouncement);
router.get("/communication/messages", getMessages);
router.get('/communication/messages/:otherUserId', getConversation);
router.post("/communication/messages", sendMessage);
router.post('/communication/messages/upload', messageUpload.single('file'), uploadMessageAttachment);

// Module 9: NAAC Compliance
router.get("/naac/documents", getNaacDocuments);
router.post("/naac/documents", uploadNaacDocument);
router.put("/naac/documents/:id/status", updateDocumentStatus);
router.get("/naac/stats", getComplianceStats);

// Module 10: Timetable
router.get("/timetable/slots", getTimeSlots);
router.get("/timetable", getFullTimetable);
router.post("/timetable", createTimetableEntry);
router.put("/timetable/:id", updateTimetableEntry);
router.delete("/timetable/:id", deleteTimetableEntry);
router.get("/timetable/conflicts", getConflicts);

export default router;
