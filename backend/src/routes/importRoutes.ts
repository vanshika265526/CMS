import express from 'express';
import { getImports, getScrapeJobs, approveImport, rejectImport, triggerScraper } from '../controllers/importController.js';
import { protect, authorize } from '../middleware/auth.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  message: 'Too many requests from this IP, please try again later.'
});

const triggerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, 
  message: 'Scraper can only be triggered 5 times per hour.'
});

router.use(protect);
router.use(authorize('SUPER_ADMIN', 'COLLEGE_ADMIN'));

router.get('/', limiter, getImports);
router.get('/jobs', limiter, getScrapeJobs);
router.post('/trigger-scraper', triggerLimiter, triggerScraper);
router.patch('/:id/approve', limiter, approveImport);
router.patch('/:id/reject', limiter, rejectImport);

export default router;
