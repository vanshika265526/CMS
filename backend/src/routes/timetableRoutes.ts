import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  copySectionTimetable,
  createTimetableEntry,
  deleteTimetableEntry,
  getSectionsByBatch,
  getTimetableBySection,
  getTimetableByTeacher,
  getTimeSlots,
  updateTimetableEntry,
} from '../controllers/timetableController.js';

const router = express.Router();

router.get('/slots', getTimeSlots);

router.use(protect);

router.get('/batch/:batchId/sections', getSectionsByBatch);
router.get('/section/:sectionId', getTimetableBySection);
router.get('/teacher/:teacherId', getTimetableByTeacher);

router.post('/', authorize('COLLEGE_ADMIN', 'SUPER_ADMIN'), createTimetableEntry);
router.post('/copy', authorize('COLLEGE_ADMIN', 'SUPER_ADMIN'), copySectionTimetable);
router.put('/:id', authorize('COLLEGE_ADMIN', 'SUPER_ADMIN'), updateTimetableEntry);
router.delete('/:id', authorize('COLLEGE_ADMIN', 'SUPER_ADMIN'), deleteTimetableEntry);

export default router;