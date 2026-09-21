import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { env, validateEnv, isOriginAllowed } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { ApiError } from './utils/ApiError.js';
import { testConnection } from './db/pool.js';

// Validate env before anything else — fail fast on misconfiguration.
validateEnv();

const app = express();

/* --------------------------------------------------------------------------
   Security middleware
   -------------------------------------------------------------------------- */

// Helmet — standard security headers.
// CSP is enabled only in production; in dev it would block npx serve / Live Server.
app.use(
  helmet({
    contentSecurityPolicy:
      env.NODE_ENV === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:'],
              connectSrc: ["'self'"],
            },
          }
        : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS — whitelist from env (comma-separated in CORS_ORIGIN).
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin (curl, Postman, mobile apps).
      if (!origin) return callback(null, true);
      if (isOriginAllowed(origin)) return callback(null, true);
      return callback(ApiError.forbidden(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);

// Body parsers.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting on all /api routes.
app.use('/api', generalLimiter);

/* --------------------------------------------------------------------------
   Routes
   -------------------------------------------------------------------------- */
app.use('/api', routes);

/* --------------------------------------------------------------------------
   Error handling (must be last)
   -------------------------------------------------------------------------- */
app.use(notFoundHandler);
app.use(errorHandler);

/* --------------------------------------------------------------------------
   Start server (after verifying DB connectivity)
   -------------------------------------------------------------------------- */
testConnection()
  .then((now) => {
    console.log(`✅ Database connected (server time: ${now.toISOString()})`);

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 JobPilot backend running on http://localhost:${env.PORT}`);
      console.log(`   Environment: ${env.NODE_ENV}`);
      console.log(`   Health check: http://localhost:${env.PORT}/api/health`);
    });

    // Graceful shutdown — close HTTP server on SIGINT/SIGTERM.
    function shutdown(signal) {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });

      // Force exit if graceful shutdown takes too long.
      setTimeout(() => {
        console.error('Forcing shutdown after 10s timeout.');
        process.exit(1);
      }, 10_000).unref();
    }

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  })
  .catch((err) => {
    console.error('❌ Failed to connect to database:', err.message);
    console.error('   Is Postgres running? Try: docker compose up -d');
    process.exit(1);
  });