import express from "express";
import * as examsController from "../controllers/examsController.js";
import { validate } from "../middleware/validate.js";
import * as examsValidator from "../validators/examsValidator.js";
import { protect, authorize } from "../middleware/auth.js";

const router = express.Router();

// --- GET ROUTES (Specific before Parameterized) ---
router.get("/", protect, examsController.getExams);
router.get('/stats', protect, examsController.getExamStats);
router.get("/results", protect, examsController.getResults);
router.get("/reports/exam-analysis", protect, authorize("SUPER_ADMIN", "COLLEGE_ADMIN", "TEACHER"), examsController.generateExamAnalysis);
router.get("/hall-tickets/:studentId/:examId", protect, examsController.getHallTicket);
router.get("/:examId/marks", protect, examsController.getMarks);
router.get("/:examId", protect, examsController.getExamById);

// --- POST/PUT/PATCH ROUTES ---
router.post(
  "/", 
  protect,
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN", "TEACHER"), 
  validate(examsValidator.createExam), 
  examsController.createExam
);

router.post(
  "/:examId/marks", 
  protect,
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN", "TEACHER"), 
  validate(examsValidator.enterMarks), 
  examsController.enterMarks
);

router.post(
  "/:examId/marks/bulk-import", 
  protect,
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN"), 
  validate(examsValidator.bulkImportMarks), 
  examsController.bulkImportMarks
);

router.post(
  "/:examId/publish", 
  protect,
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN", "TEACHER"), 
  validate(examsValidator.publishResults), 
  examsController.publishResults
);

router.put(
  "/:examId", 
  protect,
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN"), 
  examsController.updateExam
);

router.patch(
  "/:examId/schedule", 
  protect,
  authorize("SUPER_ADMIN", "COLLEGE_ADMIN"), 
  examsController.scheduleExam
);

export default router;
