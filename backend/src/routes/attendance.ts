// FILE: backend/src/routes/attendance.ts
import express from "express";
import * as attendanceController from "../controllers/attendanceController.js";
import { protect } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js"; // Assume this middleware exists or is standard
import * as attendanceValidator from "../validators/attendanceValidator.js";

const router = express.Router();

// Attendance Records
router.post(
  "/bulk", 
  protect,
  validate(attendanceValidator.bulkMark), 
  attendanceController.markBulkAttendance
);

router.get("/me", protect, attendanceController.getMyAttendance);
router.get("/", attendanceController.getAttendance);
router.get("/stats/:batchId", attendanceController.getAttendanceStats);
router.get("/hub-stats", attendanceController.getHubStats);
router.get("/schedule", attendanceController.getTodaySchedule);

// Leave Requests
router.post(
  "/leaves", 
  validate(attendanceValidator.leaveRequest), 
  attendanceController.submitLeaveRequest
);

router.get("/leaves", attendanceController.getLeaveRequests);

router.patch(
  "/leaves/:id", 
  validate(attendanceValidator.reviewLeave), 
  attendanceController.reviewLeaveRequest
);

export default router;
