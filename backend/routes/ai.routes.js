import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

// Cover letter generation
router.post('/cover-letter', aiController.coverLetter);

// Recruiter reply generation
router.post('/recruiter-reply', aiController.recruiterReply);

export default router;