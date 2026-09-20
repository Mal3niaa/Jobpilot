import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

const router = Router();

// Health check — no auth required.
router.get('/health', getHealth);

// Future routes will be mounted here:
// router.use('/auth', authRoutes);        // Phase 4
// router.use('/jobs', jobsRoutes);        // Phase 6
// router.use('/applications', appsRoutes); // Phase 7
// router.use('/resume', resumeRoutes);    // Phase 8
// router.use('/ai', aiRoutes);            // Phase 9

export default router;