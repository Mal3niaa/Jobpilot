import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.use(requireAuth);

// Rate limit: AI endpoints are expensive.
router.use(aiLimiter);

// POST /api/ai/cover-letter
router.post('/cover-letter', aiController.coverLetter);

// POST /api/ai/recruiter-reply
router.post('/recruiter-reply', aiController.recruiterReply);

// POST /api/ai/interview-questions
router.post('/interview-questions', aiController.interviewQuestions);

export default router;