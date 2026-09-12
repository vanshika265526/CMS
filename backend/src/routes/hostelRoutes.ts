import express from 'express';
import {
  getHostels,
  createHostel,
  updateHostel,
  getRooms,
  createRoom,
  updateRoom,
  allocateBed,
  vacateBed,
  getAllocations,
  getMyHostel,
  getMessMenu,
  upsertMessMenu,
  createGatePass,
  getGatePasses,
  updateGatePassStatus,
  getHostelStats,
} from '../controllers/hostelController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

// =======================
// Student-facing routes
// =======================
router.get('/me', getMyHostel);
router.post('/gate-passes', createGatePass);
router.get('/gate-passes', getGatePasses); // scoped to own passes for non-admins

// =======================
// Shared read routes
// =======================
router.get('/', getHostels);
router.get('/stats', getHostelStats);
router.get('/rooms', getRooms);
router.get('/allocations', getAllocations);
router.get('/mess-menu', getMessMenu);

// =======================
// Admin / Warden only
// =======================
router.use(authorize('SUPER_ADMIN', 'COLLEGE_ADMIN', 'ADMIN', 'WARDEN'));

router.post('/', createHostel);
router.patch('/:id', updateHostel);
router.post('/rooms', createRoom);
router.patch('/rooms/:id', updateRoom);
router.post('/allocations', allocateBed);
router.patch('/allocations/:id/vacate', vacateBed);
router.post('/mess-menu', upsertMessMenu);
router.patch('/gate-passes/:id/status', updateGatePassStatus);

export default router;
