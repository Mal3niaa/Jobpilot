# JobPilot — Database Schema

## Principles

1. **Do not create tables "for the future"** — only what is used now or in the next 2 phases.
2. **JSONB for flexible structures** — CV and AI analysis have unstable schemas.
3. **All tables with user_id use ON DELETE CASCADE** — delete a user, all their data goes away.
4. **All FKs are indexed** — for fast JOINs.
5. **Timestamps everywhere** — `created_at`, `updated_at` (where mutable).

## MVP Schema

### users

Stores user accounts.

| column | type | constraints | notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| email | VARCHAR(255) | UNIQUE NOT NULL | login |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt |
| full_name | VARCHAR(255) | | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `UNIQUE(email)` — for login.

### resumes

Stores uploaded CVs and their parsed structure.

| column | type | constraints | notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| user_id | INT | FK users(id) ON DELETE CASCADE | |
| file_path | VARCHAR(500) | | where the PDF is stored |
| raw_text | TEXT | | extracted text |
| parsed_json | JSONB | | {skills, experience, education, languages} |
| is_active | BOOLEAN | DEFAULT TRUE | active CV |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id)`.
**Why JSONB:** the CV structure may change; JSONB allows queries like `parsed_json->'skills'`.

### jobs

Stores the user's job postings.

| column | type | constraints | notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| user_id | INT | FK users(id) ON DELETE CASCADE | |
| title | VARCHAR(255) | NOT NULL | |
| company | VARCHAR(255) | | |
| location | VARCHAR(255) | | |
| salary_min | INT | | |
| salary_max | INT | | |
| employment_type | VARCHAR(50) | | full-time / part-time / contract |
| url | VARCHAR(1000) | | |
| description | TEXT | | |
| notes | TEXT | | |
| status | VARCHAR(50) | DEFAULT 'saved' | see statuses below |
| match_score | INT | | NULL until analyzed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(user_id, status)`.
**Why status lives in jobs, not a separate table:** simpler for MVP. Extract later if status history is needed.

**Statuses:**
- `saved`
- `applied`
- `recruiter_contacted`
- `interview`
- `technical_task`
- `offer`
- `rejected`

### job_analysis

Stores AI analysis results.

| column | type | constraints | notes |
|--------|------|-------------|-------|
| id | SERIAL | PRIMARY KEY | |
| job_id | INT | FK jobs(id) ON DELETE CASCADE | |
| resume_id | INT | FK resumes(id) | which CV was used |
| match_score | INT | | 0–100 |
| summary | TEXT | | |
| strong_matches | JSONB | | array of strings |
| partial_matches | JSONB | | |
| missing_skills | JSONB | | |
| requirements | JSONB | | |
| recommendations | JSONB | | |
| model_used | VARCHAR(50) | | gpt-4o-mini |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:** `(job_id)`.
**Why a separate table:** a job may be analyzed multiple times (different CVs, re-analysis). History is preserved.

## ERD
users ──┬──< resumes
│
└──< jobs ──< job_analysis >── resumes

- 1 user → N resumes
- 1 user → N jobs
- 1 job → N analyses
- 1 resume → N analyses

## What we do NOT create in MVP

- `skills`, `user_skills`, `job_skills` — skills live in JSONB. Normalize when search is needed.
- `interviews`, `ai_conversations`, `notifications` — Phase 12+.
- `applications` as a separate table — status lives in jobs.

**Rule:** create a table only when there is a concrete screen or endpoint using it.

## SQL Schema

Full SQL in `database/schema.sql` (created in Phase 5).