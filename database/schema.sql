-- ============================================================================
-- JobPilot — Database Schema
-- Applied automatically on first Postgres container start.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- users
-- Stores user accounts. Email is the login identifier.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(255),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by email (used on every login).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);