# JobPilot — Architecture

## Tech Stack

### Frontend
- HTML5, CSS3 (custom, no frameworks)
- Vanilla JavaScript (ES Modules)
- Fetch API
- Chart.js (charts only)
- No React / Vue / Angular / Bootstrap / jQuery

### Backend
- Node.js 20+
- Express.js 4
- PostgreSQL 15+
- JWT (jsonwebtoken)
- bcrypt
- pdf-parse (PDF text extraction)
- dotenv
- pg (native driver, no ORM)

### AI
- OpenAI API (`gpt-4o-mini`)
- Structured JSON output
- Three modes: MOCK / DIRECT / n8n

### Automation
- n8n (optional, Phase 10+)
- Webhooks

### Dev tools
- Git + GitHub
- VS Code
- npm
- Node 20+
- PostgreSQL 15+ (local or Docker)

## High-Level Architecture
┌──────────────────────────────────────────────────────────────┐
│ BROWSER │
│ Frontend (HTML + CSS + Vanilla JS + Chart.js) │
│ • Fetch API → JWT in Authorization header │
└───────────────────────────┬──────────────────────────────────┘
│ HTTPS / REST / JSON
▼
┌──────────────────────────────────────────────────────────────┐
│ EXPRESS BACKEND │
│ │
│ routes/ → controllers/ → services/ → db/ (pg) │
│ │ │
│ ├──► middleware/auth.js (JWT verify) │
│ ├──► middleware/validate.js │
│ └──► middleware/errorHandler.js │
│ │
│ services/ai.service.js ──► MOCK_MODE=true → mockAi │
│ ──► N8N_ENABLED=true → n8n webhook │
│ ──► otherwise → OpenAI API direct │
└───────┬─────────────────────────────┬────────────────────────┘
│ │
▼ ▼
┌────────────────┐ ┌────────────────────────┐
│ PostgreSQL │ │ n8n (optional) │
│ │ │ Webhook → OpenAI │
│ │ │ → return JSON │
└────────────────┘ └────────────────────────┘


## Backend Layers

| Layer | Responsibility | Knows about |
|-------|----------------|-------------|
| `routes/` | URL + HTTP method + middleware | controllers |
| `controllers/` | req/res, call services | services |
| `services/` | Business logic | db, other services |
| `db/` | SQL queries | pg Pool |
| `middleware/` | auth, validation, errors | utils |
| `utils/` | jwt, hash, logger, ApiError | — |
| `config/` | env, db pool | dotenv |

**Rule:** each layer knows only about the layer below it. Controllers are thin — all logic lives in services.

**Example flow for `POST /api/jobs`:**
routes/jobs.routes.js → router.post('/', auth, validate(jobSchema), ctrl.create)
controllers/jobs.controller.js → const job = await jobService.create(req.user.id, req.body)
services/job.service.js → validates business rules, calls db/jobs.create
db/jobs.js → INSERT INTO jobs ... RETURNING *


## AI Modes

| Mode | Condition | Behavior |
|------|-----------|----------|
| **Mock** | `MOCK_MODE=true` | Returns fixture from `services/fixtures/`. UI development without API calls. |
| **Direct** | `MOCK_MODE=false`, `N8N_ENABLED=false` | Backend calls OpenAI API directly. |
| **n8n** | `MOCK_MODE=false`, `N8N_ENABLED=true` | Backend sends webhook to n8n → n8n calls OpenAI → returns JSON. Falls back to Direct on failure. |

Switching is done via **a single .env variable**. No code changes required.

## Match Score Formula

The AI returns **components**, the backend computes the **final score** using weights:
technicalSkills × 0.40
experience × 0.20
education × 0.10
languages × 0.10
jobRequirements × 0.20
────────────────────────
total = 100


Weights live in `config/scoring.js` — easy to change.

**Why the backend computes the final score, not the AI:**
- We control the formula → we can explain it to the user.
- We can change weights without changing the prompt.
- This is **explainable AI**.

## Frontend Architecture

**Multi-page** (not SPA). Each page is a separate HTML file.

**Shared JS modules:**
- `api.js` — fetch wrapper (JWT, error handling)
- `auth.js` — login/register/logout, token storage
- `ui.js` — toast, modal, spinner, empty state
- `theme.js` — light/dark via `[data-theme]`

**CSS:** custom, via CSS variables. Files:
- `base.css` — reset + variables (colors, spacing, shadows)
- `components.css` — buttons, cards, forms
- `layout.css` — sidebar, header, grid
- `pages/*.css` — page-specific styles

## Security

| Risk | Mitigation |
|------|------------|
| API key leakage | Only `.env`, `.env` in `.gitignore`, `.env.example` in repo |
| SQL injection | Only parameterized queries (`$1, $2`) |
| XSS | `textContent` instead of `innerHTML` for user content |
| Password leak | bcrypt, 10+ rounds |
| JWT theft | JWT in localStorage (MVP), expiry 7 days |
| Access to other users' data | Always `WHERE user_id = $1` |
| File upload attack | MIME + size check (5 MB max) |
| Rate limiting | Phase 15: express-rate-limit on /auth and /ai |
| CORS | Whitelist origins |
| Stack traces in response | errorHandler hides them in production |

## Development Phases
PHASE 1 ▸ Architecture & Requirements ← we are here
PHASE 2 ▸ Project Initialization
PHASE 3 ▸ Frontend Design (Landing + Auth UI)
PHASE 4 ▸ Authentication
PHASE 5 ▸ Database Setup
PHASE 6 ▸ Jobs CRUD
PHASE 7 ▸ Applications Tracker
PHASE 8 ▸ CV Upload & Parsing
PHASE 9 ▸ AI Job Analysis
PHASE 10 ▸ n8n Integration
PHASE 11 ▸ Cover Letter Generator
PHASE 12 ▸ Recruiter Reply Assistant
PHASE 13 ▸ Interview Preparation
PHASE 14 ▸ Analytics
PHASE 15 ▸ Security Hardening
PHASE 16 ▸ Testing
PHASE 17 ▸ Responsive & Accessibility
PHASE 18 ▸ README + Deployment


## Project Folder Structure
jobpilot/
├── .env.example
├── .gitignore
├── README.md
├── docs/
│ ├── CONCEPT.md
│ ├── ARCHITECTURE.md
│ ├── DATABASE.md
│ └── API.md
├── frontend/
├── backend/
├── database/
└── n8n/
