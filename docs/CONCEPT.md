# JobPilot — Concept

## What it is

**JobPilot** is a web application for managing a job search.
The user uploads a CV, adds job postings, and receives **explainable AI analysis**
of how well each job matches their skills and experience.

## The problem

A junior developer searching for a job:
- spends hours browsing dozens of websites;
- manually filters out irrelevant postings;
- loses track of applications: where they applied, who replied, where interviews are;
- does not understand why they get rejected (which skills are missing);
- wastes time writing similar cover letters over and over.

## The solution

One workspace that provides:
1. **CV** — upload a PDF once, get a structured profile.
2. **Jobs** — add manually, the system tracks them.
3. **AI Analysis** — shows matches, gaps, and requirements.
4. **Applications** — a table of applications with statuses.
5. **Dashboard** — statistics and progress charts.

## Core principle

> **AI is an advisor, not a judge.**

JobPilot **does not say** "Apply" or "Don't apply".
JobPilot shows **evidence**:
- strong matches
- partial matches
- missing skills
- requirements
- recommendations

The final decision belongs to the user.

## Target audience

- Junior / Middle developers actively job hunting
- Career switchers
- Freelancers looking for long-term contracts

## How JobPilot differs from alternatives

| Alternative | What it does | What it does not do |
|-------------|--------------|---------------------|
| LinkedIn | social network, recommendations | no deep AI analysis against your CV |
| Huntr / Teal | application tracking | no explainable scoring |
| ChatGPT | letter generation | no structured tracking |
| Jobscan | keyword-based match score | no explanation and no full workflow |

**JobPilot combines all of this** — and does the key thing: **explains** its conclusion.

## Out of scope

- Automatic application submission (legal and ethical risks).
- LinkedIn scraping (ToS violation).
- Employment guarantees.
- Replacing a human recruiter or career coach.

## Success metrics (for portfolio)

The project is considered successful if:
- ✅ Works end-to-end: register → CV → job → analysis → application → dashboard.
- ✅ README allows cloning and running within 10 minutes.
- ✅ Code is separated into layers, not dumped into a single file.
- ✅ Tests cover at least critical services.
- ✅ A deployment is available at a public URL.

## Roadmap (short)

Full roadmap in `docs/ARCHITECTURE.md`.

**MVP (Phase 1–9):** Auth, Landing, Dashboard, Jobs CRUD, CV Upload, AI Analysis, Applications tracker, Dark mode, Seed data.

**Post-MVP (Phase 10–18):** n8n, Cover letter, Recruiter reply, Interview prep, Analytics, Testing, Deployment.