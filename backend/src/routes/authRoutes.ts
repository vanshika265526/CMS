import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
	loginUser,
	getUserProfile,
	logoutUser,
	changePassword,
	updateUserProfile,
	getActiveSessions,
	revokeSession,
	logoutAllSessions,
	uploadUserAsset,
	verifyAdminOtp
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
const uploadDir = path.join(process.cwd(), 'uploads', 'profile-assets');
if (!fs.existsSync(uploadDir)) {
	fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({
	storage: multer.diskStorage({
		destination: (_req, _file, cb) => cb(null, uploadDir),
		filename: (_req, file, cb) => {
			const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
			cb(null, `${unique}${path.extname(file.originalname)}`);
		}
	}),
	limits: { fileSize: 10 * 1024 * 1024 },
});

router.post('/login', loginUser);
router.post('/verify-otp', verifyAdminOtp);
router.get('/profile', protect, getUserProfile);
router.patch('/profile', protect, updateUserProfile);
router.post('/change-password', protect, changePassword);
router.post('/logout', protect, logoutUser);
router.get('/sessions', protect, getActiveSessions);
router.delete('/sessions/:sessionId', protect, revokeSession);
router.post('/sessions/logout-all', protect, logoutAllSessions);
router.post('/upload-file', protect, upload.single('file'), uploadUserAsset);

export default router;
