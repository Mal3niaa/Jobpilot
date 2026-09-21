/**
 * Prompt for job analysis.
 *
 * Design goals:
 *  - Force structured JSON output.
 *  - Explain the schema clearly so the model doesn't invent fields.
 *  - Keep the AI as an "advisor" — show evidence, don't decide.
 */

export const JOB_ANALYSIS_SYSTEM_PROMPT = `
You are a career advisor analyzing how well a candidate fits a job posting.

Your task: compare the candidate's CV text against the job description and
produce a structured, evidence-based analysis.

STRICT RULES:
1. NEVER tell the candidate to apply or not apply. Show facts, not verdicts.
2. Only use information present in the CV and job description.
3. Never invent skills or experience that are not in the CV.
4. Return ONLY valid JSON — no markdown, no code fences, no commentary.
5. If information is missing, use empty arrays or null — never guess.
`.trim();

/**
 * Build the user prompt with actual CV + job data.
 */
export function buildJobAnalysisPrompt({ resumeText, job }) {
  const jobTitle = job.title || 'Untitled role';
  const jobCompany = job.company || 'Unknown company';
  const jobLocation = job.location || '—';
  const jobDescription = job.description || '(no description provided)';

  return `
# JOB POSTING

Title: ${jobTitle}
Company: ${jobCompany}
Location: ${jobLocation}

Description:
"""
${jobDescription}
"""

# CANDIDATE CV

"""
${resumeText}
"""

# YOUR TASK

Analyze how well this candidate matches this job. Return a JSON object with
this EXACT structure (no additional keys):

{
  "categoryScores": {
    "technicalSkills": <0-100 integer>,
    "experience":      <0-100 integer>,
    "education":       <0-100 integer>,
    "languages":       <0-100 integer>,
    "jobRequirements": <0-100 integer>
  },
  "summary": "<2-3 sentences summarizing the fit — factual, neutral>",
  "strongMatches": ["skill1", "skill2"],
  "partialMatches": ["skill1"],
  "missingSkills": ["skill1", "skill2"],
  "requirements": ["requirement1", "requirement2"],
  "recommendations": ["actionable suggestion 1", "actionable suggestion 2"]
}

Guidelines for each field:
- categoryScores: your best estimate per category. Do not be generous —
  if evidence is weak, score lower.
- summary: neutral tone. e.g. "Strong technical background in X, but missing
  practical experience in Y."
- strongMatches: skills/technologies the CV clearly demonstrates AND the job requires.
- partialMatches: skills that overlap partially (e.g. similar frameworks, adjacent tech).
- missingSkills: skills the job requires that are NOT in the CV.
- requirements: non-skill requirements (years of experience, education, language level, location).
- recommendations: concrete actions the candidate could take (max 5).

Return ONLY the JSON object.
`.trim();
}