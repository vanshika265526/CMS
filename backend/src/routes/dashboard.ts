import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getEnrollmentActivity } from '../controllers/adminDashboardController.js';

const router = express.Router();

router.get('/enrollment-activity', protect, authorize('COLLEGE_ADMIN', 'SUPER_ADMIN'), getEnrollmentActivity);

export default router;
