import { env } from '../config/env.js';

export function getHealth(req, res) {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'jobpilot-backend',
      version: '0.1.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
}