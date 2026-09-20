import express from 'express';
import cors from 'cors';

import { env, validateEnv } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';


validateEnv();

const app = express();


app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));


app.use('/api', routes);


app.use(notFoundHandler);
app.use(errorHandler);


const server = app.listen(env.PORT, () => {
  console.log(`🚀 JobPilot backend running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(`   Health check: http://localhost:${env.PORT}/api/health`);
});


function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));