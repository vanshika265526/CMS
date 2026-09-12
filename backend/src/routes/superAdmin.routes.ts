import express from 'express';
import {
  createCollege,
  getAllColleges,
  getCollegeById,
  updateCollege,
  deleteCollege,
  getCollegeAnalytics,
  exportCollegesCsv,
  bulkImportColleges,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  exportUsersCsv,
  bulkImportUsers,
  getDashboardAnalytics,
  getCollegeAnalyticsComparison,
  getUserAnalytics,
  getAuditLogs,
  exportAuditLogs,
  getUserActivityLog,
  exportAnalytics,
  getSystemSettings,
  updateSystemSettings
} from '../controllers/superAdminController.js';
import { protect, authorize } from '../middleware/auth.js';
import { uploadPhoto } from '../utils/cloudinaryUploader.js';

const router = express.Router();

// Protect all super admin routes
router.use(protect);
router.use(authorize('SUPER_ADMIN'));

// =====================
// COLLEGE MANAGEMENT
// =====================
router.post('/colleges', createCollege);
router.get('/colleges', getAllColleges);
router.get('/colleges/export/csv', exportCollegesCsv);
router.post('/colleges/bulk-import', bulkImportColleges);
router.get('/colleges/:id', getCollegeById);
router.put('/colleges/:id', updateCollege);
router.delete('/colleges/:id', deleteCollege);
router.get('/colleges/:collegeId/analytics', getCollegeAnalytics);

// =====================
// USER MANAGEMENT
// =====================
router.post('/users', createUser);
router.get('/users', getAllUsers);
router.get('/users/export/csv', exportUsersCsv);
router.post('/users/bulk-import', bulkImportUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', uploadPhoto.single('profilePictureFile'), updateUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/reset-password', resetUserPassword);

// =====================
// ANALYTICS & REPORTING
// =====================
router.get('/analytics/dashboard', getDashboardAnalytics);
router.get('/analytics/colleges-comparison', getCollegeAnalyticsComparison);
router.get('/analytics/users', getUserAnalytics);
router.get('/analytics/export', exportAnalytics);

// =====================
// AUDIT LOGS
// =====================
router.get('/audit-logs', getAuditLogs);
router.get('/audit-logs/export', exportAuditLogs);
router.get('/audit-logs/user/:userId', getUserActivityLog);

// =====================
// SYSTEM SETTINGS
// =====================
router.get('/settings', getSystemSettings);
router.put('/settings', updateSystemSettings);

export default router;
