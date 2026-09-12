import express from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  replyToTicket,
  updateTicket,
  getSupportStats,
} from '../controllers/supportController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// Any authenticated user can raise and track their own tickets.
router.post('/tickets', createTicket);
router.get('/tickets', getTickets);
router.get('/stats', getSupportStats);
router.get('/tickets/:id', getTicketById);
router.post('/tickets/:id/replies', replyToTicket);

// Triage (status, priority, assignment) is staff-only.
router.patch(
  '/tickets/:id',
  authorize('SUPER_ADMIN', 'COLLEGE_ADMIN', 'ADMIN', 'SUPPORT'),
  updateTicket
);

export default router;
