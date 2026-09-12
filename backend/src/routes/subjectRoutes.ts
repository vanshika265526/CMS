import express from 'express';
import { getSubjects, createSubject } from '../controllers/subjectController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, getSubjects);
router.post('/', protect, authorize('SUPER_ADMIN', 'COLLEGE_ADMIN'), createSubject);

export default router;
