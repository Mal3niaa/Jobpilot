import { Router } from 'express';
import * as jobController from '../controllers/job.controller.js';
import * as jobAnalysisController from '../controllers/jobAnalysis.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Every route here requires authentication.
router.use(requireAuth);

// GET /api/jobs
router.get('/', jobController.listJobs);

// POST /api/jobs
router.post('/', jobController.createJob);

// GET /api/jobs/:id
router.get('/:id', jobController.getJob);

// PUT /api/jobs/:id
router.put('/:id', jobController.updateJob);

// DELETE /api/jobs/:id
router.delete('/:id', jobController.deleteJob);

// AI analysis — POST to run, GET to fetch the latest result.
router.post('/:id/analyze', jobAnalysisController.analyze);
router.get('/:id/analysis', jobAnalysisController.getAnalysis);

export default router;