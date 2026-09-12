import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getTrustedSources,
  createTrustedSource,
  updateTrustedSource,
  deleteTrustedSource,
  testTrustedSource,
  triggerScrape
} from '../controllers/trustedSourceController.js';

const router = express.Router();

// Apply auth middleware to all routes in this sub-router
router.use(protect);
router.use(authorize('SUPER_ADMIN', 'COLLEGE_ADMIN'));

router.get('/', getTrustedSources);
router.post('/', createTrustedSource);
router.patch('/:id', updateTrustedSource);
router.delete('/:id', deleteTrustedSource);
router.post('/:id/test', testTrustedSource);
router.post('/:id/scrape', triggerScrape);

export default router;
