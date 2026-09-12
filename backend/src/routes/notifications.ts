import express from 'express';
import { protect } from '../middleware/auth.js';
import * as communicationController from '../controllers/communicationController.js';

const router = express.Router();

router.use(protect);

// --- Generic Notifications ---
router.get('/', communicationController.getNotifications);
router.get('/unread-count', communicationController.getNotificationUnreadCount);
router.put('/read-all', communicationController.markAllNotificationsAsRead);
router.put('/:notifId/read', communicationController.markNotificationAsRead);

export default router;
