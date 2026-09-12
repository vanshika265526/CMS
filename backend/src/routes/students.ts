// FILE: backend/src/routes/students.ts
import express from "express";
import {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  bulkImportStudents,
  uploadStudentPhoto,
  getStudentStats,
  uploadDocs,
  getMyStudent,
  getMyFees,
  processMockPayment,
} from "../controllers/studentsController.js";
import { getStudentMaterials } from "../controllers/uploadController.js";
import * as timetableController from "../controllers/timetableController.js";
import * as communicationController from "../controllers/communicationController.js";
import { protect } from "../middleware/auth.js";
import { uploadPhoto, uploadDocument } from "../utils/cloudinaryUploader.js";
import multer from "multer";

const router = express.Router();
console.log("STUDENT ROUTER INITIALIZED");
router.use((req, res, next) => {
  console.log(`[STUDENT ROUTER] ${req.method} ${req.url}`);
  next();
});
const uploadCsv = multer({ dest: "uploads/temp/" }); // Direct multer for CSV

// --- Directory & Stats ---
router.get("/me", protect, getMyStudent);
router.get("/", protect, getStudents);
router.get("/stats", protect, getStudentStats);
router.get("/timetable", protect, timetableController.getStudentTimetable);
router.get("/timetable/today", protect, timetableController.getStudentTodaySchedule);
router.get("/me/fees", protect, getMyFees);
router.get("/fees", protect, getMyFees);
router.post("/pay", protect, processMockPayment);
router.get("/materials", protect, getStudentMaterials);
router.get("/materials/me", protect, getStudentMaterials);

// --- Communication ---
router.get("/announcements", protect, communicationController.getStudentAnnouncements);
router.get("/my-teachers", protect, communicationController.getStudentTeachers);
router.get("/messages/unread-count", protect, communicationController.getUnreadCount);
router.post("/messages", protect, communicationController.sendMessage);
router.put("/messages/:messageId/read", protect, communicationController.markAsRead);
router.get("/messages/:otherUserId", protect, communicationController.getConversation);

router.get("/:id", protect, getStudentById);

// --- CRUD ---
router.post("/", protect, createStudent);
router.patch("/:id", protect, updateStudent);

// --- Imports & Media ---
router.post("/import", protect, uploadCsv.single("file"), bulkImportStudents);
router.post("/:id/photo", uploadPhoto.single("photo"), uploadStudentPhoto);
router.post("/upload-docs", uploadDocument.array("files", 5), uploadDocs);

export default router;

