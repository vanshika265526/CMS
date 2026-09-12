import express from 'express';
import {
  getOverview,
  getEnrollmentTrend,
  getAttendanceTrend,
  getDepartmentPerformance,
  getAtRiskStudents,
  getGradeDistribution,
} from '../controllers/analyticsController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Institutional analytics are leadership-facing only.
router.use(protect);
router.use(authorize('SUPER_ADMIN', 'COLLEGE_ADMIN', 'ADMIN', 'HOD', 'PRINCIPAL'));

router.get('/overview', getOverview);
router.get('/enrollment-trend', getEnrollmentTrend);
router.get('/attendance-trend', getAttendanceTrend);
router.get('/department-performance', getDepartmentPerformance);
router.get('/at-risk', getAtRiskStudents);
router.get('/grade-distribution', getGradeDistribution);

export default router;
