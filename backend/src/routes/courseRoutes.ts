import express from 'express';
import { 
  createCourse, 
  getCourses, 
  getCourseById 
} from '../controllers/courseController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize('SUPER_ADMIN', 'COLLEGE_ADMIN'), createCourse);
router.get('/', protect, getCourses);
router.get('/:id', protect, getCourseById);

export default router;
