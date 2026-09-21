import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';
import authRoutes from './auth.routes.js';
import jobRoutes from './job.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

// Health check — no auth required.
router.get('/health', getHealth);

// Auth routes — register, login, me.
router.use('/auth', authRoutes);

// Jobs — list, create, read, update, delete.
router.use('/jobs', jobRoutes);

// Dashboard — aggregated counters for the authenticated user.
router.use('/dashboard', dashboardRoutes);

// Future routes will be mounted here:
// router.use('/applications', appsRoutes); // Phase 7
// router.use('/resume', resumeRoutes);     // Phase 8
// router.use('/ai', aiRoutes);             // Phase 9

export default router;