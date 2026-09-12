import express from 'express';
import { createPlacement, updatePlacement, getPlacements, getPlacementById, changeStatus, bulkAction } from '../controllers/placementController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply auth middleware to all placement routes
router.use(protect);

// =======================
// GET Routes (accessible by students for published, admins for all)
// =======================
router.get('/', getPlacements);
router.get('/:id', getPlacementById);

// =======================
// Mutation Routes (Admin / Super Admin only)
// =======================
router.use(authorize('SUPER_ADMIN', 'COLLEGE_ADMIN'));

router.post('/', createPlacement);
router.patch('/:id', updatePlacement);
router.patch('/:id/status', changeStatus);
router.post('/bulk/:action', bulkAction); // /bulk/delete, /bulk/archive, /bulk/publish

export default router;
