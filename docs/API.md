# JobPilot — API Contract

Base URL: `http://localhost:3000/api`
Auth: `Authorization: Bearer <jwt>`

## Response format

**Success:**
```json
{ "success": true, "data": { ... } }

Error:
{ "success": false, "message": "Job not found" }

Auth
POST /api/auth/register

Body:
{ "email": "user@example.com", "password": "secret123", "fullName": "John Doe" }

Response 201:
{ "success": true, "data": { "token": "jwt...", "user": { "id": 1, "email": "...", "fullName": "..." } } }
POST /api/auth/login

Body: { "email": "...", "password": "..." }
Response 200: same as register.
GET /api/auth/me 🔒

Response 200: { "success": true, "data": { "user": { ... } } }
Jobs 🔒
GET /api/jobs

Query: ?status=applied&search=react&sort=created_at&order=desc
Response 200:
{ "success": true, "data": { "jobs": [ { "id": 1, "title": "...", "matchScore": 82 } ] } }

POST /api/jobs

Body:
{
  "title": "Junior Web Developer",
  "company": "Acme",
  "location": "Warsaw",
  "salaryMin": 5000,
  "salaryMax": 8000,
  "employmentType": "full-time",
  "url": "https://...",
  "description": "...",
  "notes": "..."
}Response 201: { "success": true, "data": { "job": { ... } } }
GET /api/jobs/:id 🔒

Response 200: { "success": true, "data": { "job": { ... }, "analysis": { ... } | null } }
PUT /api/jobs/:id 🔒

Body: partial update.
Response 200: { "success": true, "data": { "job": { ... } } }
DELETE /api/jobs/:id 🔒

Response 200: { "success": true, "data": { "deleted": true } }
POST /api/jobs/:id/analyze 🔒

Response 200:
json

{
  "success": true,
  "data": {
    "analysis": {
      "matchScore": 82,
      "summary": "...",
      "strongMatches": ["HTML", "CSS", "JavaScript"],
      "partialMatches": ["REST API"],
      "missingSkills": ["React", "Docker"],
      "requirements": ["2+ years experience"],
      "recommendations": ["Learn React basics", "Try Docker in a side project"]
    }
  }
}

Resume 🔒
GET /api/resume

Response 200: { "success": true, "data": { "resume": { ... } | null } }
POST /api/resume

Content-Type: multipart/form-data, field file (PDF, max 5 MB).
Response 201: { "success": true, "data": { "resume": { "id": 1, "parsedJson": { ... } } } }
Applications 🔒
GET /api/applications

Returns jobs with a status other than saved.
Query: ?status=interview
Response 200: { "success": true, "data": { "applications": [ ... ] } }
PUT /api/applications/:id

Body: { "status": "interview", "nextStep": "Send follow-up" }
Response 200: { "success": true, "data": { "application": { ... } } }

(endpoint implemented in Phase 7)
AI 🔒
POST /api/ai/cover-letter

Body: { "jobId": 1, "language": "en", "tone": "professional" }
Response 200: { "success": true, "data": { "letter": "..." } }
POST /api/ai/recruiter-reply

Body: { "message": "...", "language": "en" }
Response 200: { "success": true, "data": { "reply": "..." } }
POST /api/ai/interview

Body: { "jobId": 1 }
Response 200: { "success": true, "data": { "questions": [ ... ] } }
Analytics 🔒
GET /api/analytics

Response 200:
json

{
  "success": true,
  "data": {
    "totalApplications": 24,
    "interviews": 8,
    "offers": 3,
    "rejected": 5,
    "averageMatchScore": 82,
    "applicationsThisWeek": 4,
    "applicationsOverTime": [ { "date": "2025-01-01", "count": 3 } ],
    "byStatus": { "applied": 10, "interview": 8 }
  }
}

HTTP Status Codes
Code	When
200	OK
201	Created
400	Validation error
401	Not authenticated
403	Not authorized (another user's resource)
404	Not found
409	Conflict (email already taken)
500	Server error
Environment Variables
text

PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/jobpilot
JWT_SECRET=change-me-in-production
OPENAI_API_KEY=
N8N_WEBHOOK_URL=
MOCK_MODE=true
N8N_ENABLED=false
CORS_ORIGIN=http://localhost:5500
UPLOAD_DIR=backend/uploads
MAX_FILE_SIZE_MB=5