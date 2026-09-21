# JobPilot

> AI-powered job search assistant — analyze opportunities, track applications, and prepare for interviews, all in one place.

![JobPilot dashboard](docs/screenshots/02-dashboard.png)

## Overview

JobPilot helps developers manage their job search in one place. Upload a CV, add job postings, get **explainable AI analysis** of how well each role matches your skills, and track every application through the pipeline.

**Core principle:** AI is an advisor, not a judge. JobPilot shows evidence — strong matches, missing skills, requirements — and lets you decide.

## Features

### 🤖 AI-powered (4 functions)

- **Job Analysis** — compare CV to job description, get explainable match score with strong / partial / missing skills and recommendations.
- **Cover Letter Generator** — write tailored letters in **English, Polish, or Ukrainian**, with 3 tones (professional, friendly, concise).
- **Recruiter Reply Assistant** — paste a recruiter's message, get a professional reply. Detects intent (invitation, rejection, question, salary question).
- **Interview Preparation** — generate 10 categorized questions (technical, behavioral, role-specific) from any job description.

### 📋 Job search workflow

- **CV Upload** — PDF text extraction
- **Jobs Management** — full CRUD with statuses, salaries, notes
- **Application Tracker** — Kanban with drag-and-drop (5 stages)
- **Analytics** — Chart.js dashboards

### 🎨 UX

- Dark / Light theme
- Fully responsive (desktop, tablet, mobile)
- Accessible (ARIA, keyboard, focus states)
- Custom design system (CSS variables, no frameworks)

## Screenshots

### Landing

![Landing](docs/screenshots/01-landing.png)

### Dashboard

![Dashboard](docs/screenshots/02-dashboard.png)

### Jobs

![Jobs](docs/screenshots/03-jobs.png)

### Applications (Kanban)

![Applications](docs/screenshots/04-applications.png)

Mobile view uses a vertical stack with per-card status dropdown:

![Applications mobile](docs/screenshots/05-applications-mobile.png)

### Resume upload

![Resume](docs/screenshots/06-resume.png)

### AI Assistant

![AI Assistant](docs/screenshots/07-ai-assistant.png)

### Analytics

![Analytics](docs/screenshots/08-analytics.png)

### Settings

![Settings](docs/screenshots/09-settings.png)

## Tech Stack

### Frontend

- **HTML5, CSS3** — custom design system with CSS variables, no frameworks
- **Vanilla JavaScript** (ES Modules) — no React/Vue/Angular
- **Chart.js** — for analytics visualizations
- **Multi-page architecture** — separate HTML per route

### Backend

- **Node.js 20+** + **Express.js 4**
- **PostgreSQL 16** — with a connection pool (`pg`)
- **JWT authentication** (`jsonwebtoken`) + **bcryptjs** password hashing
- **Multer** + **pdf-parse** — CV upload and text extraction
- **express-rate-limit** + **Helmet** — security hardening

### AI

- **OpenAI API** (`gpt-4o-mini`) — for all four AI features
- **Three provider modes** — `mock` (no API key needed), `direct` (calls OpenAI), or `n8n` (via webhook). Switch with a single env variable.

### Infrastructure

- **Docker Compose** — local PostgreSQL
- **GitHub Actions** — CI (planned)
- **Railway** — backend + database hosting
- **Vercel** — frontend hosting

## Architecture
Browser (HTML/CSS/Vanilla JS)
│
▼ REST / JSON
Express (routes → controllers → services → db/pg)
│
├──► PostgreSQL
└──► AI service (mock | openai | n8n)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Quick Start

### Prerequisites

- **Node.js 20+**
- **Docker** (for PostgreSQL) — or your own PostgreSQL instance
- **OpenAI API key** — optional (mock mode works without it)

### 1. Clone the repository

```bash
git clone https://github.com/Mal3niaa/Jobpilot.git
cd Jobpilot```


### 2. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5501,http://127.0.0.1:5501

DATABASE_URL=postgresql://jobpilot:jobpilot@localhost:5432/jobpilot

JWT_SECRET=<generate-with-openssl-rand-hex-32>
JWT_EXPIRES_IN=7d

MOCK_MODE=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

N8N_ENABLED=false
N8N_WEBHOOK_URL=

UPLOAD_DIR=backend/uploads
MAX_FILE_SIZE_MB=5
```

### 3. Start PostgreSQL

```bash
docker compose up -d
```

### 4. Install backend dependencies

```bash
cd backend
npm install
cd ..
```

### 5. Start the backend

```bash
npm run dev
```

Backend runs on `http://localhost:3000`.

### 6. Start the frontend

In a second terminal:

```bash
cd frontend
npx http-server -p 5501 -c-1
```

Frontend is served at `http://localhost:5501`.

### 7. Open in browser

- **Landing:** http://localhost:5501/
- **Register:** http://localhost:5501/register.html
- **Dashboard:** http://localhost:5501/app/dashboard.html

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `3000` | Backend HTTP port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `CORS_ORIGIN` | No | `http://localhost:5501` | Comma-separated list of allowed origins |
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | Secret for signing JWT (fail-fast in production) |
| `JWT_EXPIRES_IN` | No | `7d` | Token expiry |
| `MOCK_MODE` | No | `true` | If `true`, AI calls return deterministic mock data |
| `OPENAI_API_KEY` | When `MOCK_MODE=false` | — | OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model name |
| `N8N_ENABLED` | No | `false` | Use n8n webhook instead of direct OpenAI |
| `N8N_WEBHOOK_URL` | When `N8N_ENABLED=true` | — | n8n webhook URL |
| `UPLOAD_DIR` | No | `backend/uploads` | Where PDFs are stored |
| `MAX_FILE_SIZE_MB` | No | `5` | Max CV file size |

## AI Modes

| Mode | Env | Behavior |
|------|-----|----------|
| **Mock** | `MOCK_MODE=true` | Deterministic, no API calls. Uses heuristics on CV/job text. |
| **Direct** | `MOCK_MODE=false`, `N8N_ENABLED=false` | Calls OpenAI API directly. |
| **n8n** | `MOCK_MODE=false`, `N8N_ENABLED=true` | Calls n8n webhook → OpenAI. Falls back to direct on error. |

Switching modes requires **no code changes** — just the env variable.

## API Endpoints

See [docs/API.md](docs/API.md) for full details.

### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me` 🔒
- `PUT /api/auth/me` 🔒
- `PUT /api/auth/password` 🔒
- `DELETE /api/auth/me` 🔒

### Jobs
- `GET /api/jobs` 🔒
- `POST /api/jobs` 🔒
- `GET /api/jobs/:id` 🔒
- `PUT /api/jobs/:id` 🔒
- `DELETE /api/jobs/:id` 🔒

### AI Analysis
- `POST /api/jobs/:id/analyze` 🔒
- `GET /api/jobs/:id/analysis` 🔒

### Resume
- `GET /api/resume` 🔒
- `POST /api/resume` 🔒 — `multipart/form-data`, field `file`
- `DELETE /api/resume` 🔒

### AI Assistant
- `POST /api/ai/cover-letter` 🔒
- `POST /api/ai/recruiter-reply` 🔒
- `POST /api/ai/interview-questions` 🔒

### Analytics & Dashboard
- `GET /api/dashboard/stats` 🔒
- `GET /api/analytics` 🔒

**🔒 = requires JWT in `Authorization: Bearer <token>`.**

## Project Structure

```
jobpilot/
├── backend/
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   │   └── prompts/
│   ├── utils/
│   └── uploads/
│
├── frontend/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── app/
│   ├── css/
│   ├── js/
│   └── assets/
│
├── database/
│   └── schema.sql
│
├── docs/
│   ├── CONCEPT.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   └── screenshots/
│
├── docker-compose.yml
├── .env.example
├── .gitignore
├── LICENSE
└── README.md
```

## Design Decisions

### Why vanilla JS instead of React?

The project is a deliberate exercise in **fundamental web technologies**:

- **Zero build step** — files are served directly to the browser.
- **Smaller bundle** — no runtime overhead.
- **Deeper understanding** — routing, state, and rendering implemented from scratch.
- **Portfolio signal** — demonstrates I understand the platform, not just a framework.

### Why three AI provider modes?

Mock mode enables **UI development without API cost** and makes the project **testable without secrets**. `n8n` mode is prepared for automation workflows. The provider is selected at runtime based on `MOCK_MODE` and `N8N_ENABLED` — no code changes required.

### Why explainable scoring?

The AI returns **category scores** (technical skills, experience, education, languages, job requirements). The backend combines them into a final score using **weights in `config/scoring.js`**. This lets us:

- Explain the score to the user.
- Change weighting without changing the AI prompt.
- Never delegate the final verdict to the model.

## Roadmap

### Done ✅

- Auth with JWT
- Jobs CRUD
- Applications Kanban
- CV upload + PDF parsing
- AI job analysis (explainable scoring)
- Cover letter generator (3 languages)
- Recruiter reply assistant (intent detection)
- Interview preparation (10 categorized questions)
- Analytics with Chart.js
- Settings (profile, theme, password, delete account)
- Security hardening (Helmet + rate limiting)

### Planned ⏳

- [ ] Automated tests (Jest + Supertest + Playwright)
- [ ] CI/CD via GitHub Actions
- [ ] DOCX CV support
- [ ] LinkedIn / job-board imports
- [ ] Email integration
- [ ] Telegram notifications
- [ ] Browser extension

## License

MIT — see [LICENSE](LICENSE).

## Author

**Serhii Barchan**

- GitHub: [@Mal3niaa](https://github.com/Mal3niaa)
- LinkedIn: [in/serhii-barchan](https://www.linkedin.com/in/serhii-barchan)
- Email: serega.barchan@gmail.com

---

*Built as a portfolio project to demonstrate full-stack development with modern vanilla JavaScript, PostgreSQL, and AI integration.*