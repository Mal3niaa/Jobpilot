import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// POST /api/ai/cover-letter
router.post('/cover-letter', aiController.coverLetter);

export default router;