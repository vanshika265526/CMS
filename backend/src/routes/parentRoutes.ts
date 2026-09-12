import express from "express";
import { protect, authorize } from "../middleware/auth.js";
import * as parentController from "../controllers/parentController.js";
import * as communicationController from "../controllers/communicationController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("PARENT"));

/**
 * @route   GET /api/parent/me/student
 * @desc    Get linked student profile
 */
router.get("/me/student", parentController.getMyStudentProfile);

/**
 * @route   GET /api/parent/me/attendance
 * @desc    Get linked student attendance
 */
router.get("/me/attendance", parentController.getMyStudentAttendance);

/**
 * @route   GET /api/parent/me/results
 * @desc    Get linked student results
 */
router.get("/me/results", parentController.getMyStudentResults);

/**
 * @route   GET /api/parent/me/timetable
 * @desc    Get linked student timetable
 */
router.get("/me/timetable", parentController.getMyStudentTimetable);

/**
 * @route   GET /api/parent/me/fees
 * @desc    Get linked student fees & payment history
 */
router.get("/me/fees", parentController.getMyStudentFees);

// --- Communication ---

/**
 * @route   GET /api/parent/me/announcements
 * @desc    Get announcements relevant to linked child's batch
 */
router.get("/me/announcements", communicationController.getParentAnnouncements);

/**
 * @route   GET /api/parent/me/teachers
 * @desc    Get teachers assigned to linked child's batch
 */
router.get("/me/teachers", communicationController.getParentTeachers);

/**
 * @route   GET /api/parent/me/messages/unread-count
 * @desc    Get count of unread messages for the parent
 */
router.get("/me/messages/unread-count", communicationController.getUnreadCount);

/**
 * @route   POST /api/parent/me/messages
 * @desc    Send a message to a teacher
 */
router.post("/me/messages", communicationController.parentSendMessage);

/**
 * @route   PUT /api/parent/me/messages/:messageId/read
 * @desc    Mark a message as read
 */
router.put("/me/messages/:messageId/read", communicationController.markAsRead);

/**
 * @route   GET /api/parent/me/messages/:otherUserId
 * @desc    Get conversation thread with a teacher
 */
router.get("/me/messages/:otherUserId", communicationController.getConversation);

export default router;
