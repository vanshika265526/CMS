import express from 'express';
import { 
  createBatch, 
  getBatches, 
  getBatchById 
} from '../controllers/batchController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, authorize('SUPER_ADMIN', 'COLLEGE_ADMIN'), createBatch);
router.get('/', protect, getBatches);
router.get('/:id', protect, getBatchById);

export default router;
