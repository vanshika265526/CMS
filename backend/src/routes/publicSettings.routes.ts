import express from 'express';
import { getPublicSystemSettings } from '../controllers/superAdminController.js';

const router = express.Router();

router.get('/public', getPublicSystemSettings);

export default router;
