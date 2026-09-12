import express from 'express';
import { askAssistant, getAssistantContext } from '../controllers/assistantController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/context', getAssistantContext);
router.post('/ask', askAssistant);

export default router;
