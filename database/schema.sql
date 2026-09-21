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


-- ----------------------------------------------------------------------------
-- jobs
-- Stores the user's job postings.
-- Every job belongs to exactly one user (user_id).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS jobs (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  title             VARCHAR(255) NOT NULL,
  company           VARCHAR(255),
  location          VARCHAR(255),

  salary_min        INTEGER,
  salary_max        INTEGER,
  employment_type   VARCHAR(50),

  url               VARCHAR(1000),
  description       TEXT,
  notes             TEXT,

  status            VARCHAR(50) NOT NULL DEFAULT 'saved',
  match_score       INTEGER,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs (user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs (user_id, status);

-- Auto-update `updated_at` on every UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;
CREATE TRIGGER trg_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();


-- ----------------------------------------------------------------------------
-- resumes
-- Stores uploaded CVs and their parsed structure.
-- Only one resume can be active per user at a time.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resumes (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  file_path       VARCHAR(500),
  raw_text        TEXT,
  parsed_json     JSONB,

  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes (user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_active
  ON resumes (user_id)
  WHERE is_active = TRUE;