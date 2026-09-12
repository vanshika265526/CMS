import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import * as assignmentController from '../controllers/assignmentController.js';
import * as submissionController from '../controllers/submissionController.js';

const router = express.Router();

// Middleware stack for all routes
router.use(protect);

// --- Assignment Routes ---
router.post('/', authorize('TEACHER', 'COLLEGE_ADMIN'), assignmentController.createAssignment);
router.get('/', assignmentController.getAssignments);
router.get('/:id', assignmentController.getAssignmentDetail);

// --- Submission Routes ---
router.post('/submissions', authorize('STUDENT'), submissionController.submitAssignment);
router.get('/submissions/my', authorize('STUDENT'), submissionController.getMySubmissions);
router.get('/:id/submissions', authorize('TEACHER', 'COLLEGE_ADMIN'), submissionController.getAssignmentSubmissions);
router.patch('/submissions/:id/grade', authorize('TEACHER', 'COLLEGE_ADMIN'), submissionController.gradeSubmission);

export default router;
