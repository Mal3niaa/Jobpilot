import { Router } from 'express';
import * as resumeController from '../controllers/resume.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadPdfSafe } from '../middleware/upload.js';

const router = Router();

// All resume routes require authentication.
router.use(requireAuth);

// GET /api/resume — metadata + preview
router.get('/', resumeController.getResume);

// GET /api/resume/text — full text (on demand)
router.get('/text', resumeController.getResumeText);

// POST /api/resume — upload PDF
router.post('/', uploadPdfSafe, resumeController.uploadResume);

// DELETE /api/resume — remove active resume
router.delete('/', resumeController.deleteResume);

export default router;