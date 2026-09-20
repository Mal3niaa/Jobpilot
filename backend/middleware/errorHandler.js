import { env } from '../config/env.js';

export function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const isOperational = err.isOperational === true;


  if (isOperational) {
    console.warn(`[${status}] ${err.message}`);
  } else {
    console.error('[UNEXPECTED ERROR]', err);
  }

  const body = {
    success: false,
    message: isOperational ? err.message : 'Internal server error',
  };

  if (env.NODE_ENV !== 'production' && !isOperational) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}