import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import authRoutes from './auth.routes.js';

const router = Router();

// Health check — no auth required.
router.get('/health', getHealth);

// Auth routes — register, login, me.
router.use('/auth', authRoutes);

// Future routes will be mounted here:
// router.use('/jobs', jobsRoutes);        // Phase 6
// router.use('/applications', appsRoutes); // Phase 7
// router.use('/resume', resumeRoutes);    // Phase 8
// router.use('/ai', aiRoutes);            // Phase 9

export default router;