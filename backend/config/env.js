import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config({ path: path.resolve(__dirname, '../../.env') });


function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = '') {
  return process.env[name] ?? fallback;
}

function asBool(name, fallback = false) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  return v === 'true' || v === '1';
}

function asInt(name, fallback) {
  const v = process.env[name];
  if (v === undefined) return fallback;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}

export const env = {
  NODE_ENV: optional('NODE_ENV', 'development'),
  PORT: asInt('PORT', 3000),
  CORS_ORIGIN: optional('CORS_ORIGIN', 'http://localhost:5500'),

  DATABASE_URL: optional('DATABASE_URL', ''),

  JWT_SECRET: optional('JWT_SECRET', 'dev-only-secret-change-me'),
  JWT_EXPIRES_IN: optional('JWT_EXPIRES_IN', '7d'),

  MOCK_MODE: asBool('MOCK_MODE', true),
  N8N_ENABLED: asBool('N8N_ENABLED', false),
  N8N_WEBHOOK_URL: optional('N8N_WEBHOOK_URL', ''),

  OPENAI_API_KEY: optional('OPENAI_API_KEY', ''),
  OPENAI_MODEL: optional('OPENAI_MODEL', 'gpt-4o-mini'),

  UPLOAD_DIR: optional('UPLOAD_DIR', 'backend/uploads'),
  MAX_FILE_SIZE_MB: asInt('MAX_FILE_SIZE_MB', 5),
};


export function validateEnv() {
  if (env.NODE_ENV === 'production') {
    required('JWT_SECRET');
    if (env.JWT_SECRET === 'dev-only-secret-change-me') {
      throw new Error('JWT_SECRET must be changed in production');
    }
  }
}