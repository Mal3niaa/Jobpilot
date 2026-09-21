/**
 * Prompt for interview question generation.
 *
 * Input: resume + job.
 * Output: JSON { questions: [{ category, question }, ...] }
 */

export const INTERVIEW_PREP_SYSTEM_PROMPT = `
You are an interview coach helping a candidate prepare for a job interview.

Your task: generate a set of relevant interview questions based on the job
description and the candidate's CV.

STRICT RULES:
1. Generate exactly 10 questions.
2. Split them into three categories:
   - "technical" (4-5 questions): about the technologies and skills mentioned
     in the job description (e.g. specific frameworks, languages, concepts).
   - "behavioral" (2-3 questions): about experience, teamwork, projects,
     problem-solving — using the candidate's CV as context.
   - "role-specific" (2-3 questions): about motivation, fit with the company,
     understanding of the role, domain knowledge.
3. Questions must be specific to the job — avoid generic questions.
4. Use the candidate's CV to make questions relevant (mention specific projects
   or skills if the CV provides them).
5. Output ONLY valid JSON — no markdown, no code fences, no commentary.
6. Do not answer the questions — only generate them.
`.trim();

export function buildInterviewPrepPrompt({ resumeText, job }) {
  const jobTitle = job.title || 'Untitled role';
  const jobCompany = job.company || 'Unknown company';
  const jobDescription = job.description || '(no description provided)';

  return `
# JOB POSTING

Title: ${jobTitle}
Company: ${jobCompany}

Description:
"""
${jobDescription}
"""

# CANDIDATE CV

"""
${resumeText}
"""

# TASK

Generate 10 interview questions for this candidate applying to this job.

Return a JSON object with this EXACT structure:

{
  "questions": [
    { "category": "technical", "question": "..." },
    { "category": "behavioral", "question": "..." },
    { "category": "role-specific", "question": "..." }
  ]
}

Categories must be exactly one of: "technical", "behavioral", "role-specific".

Return ONLY the JSON object.
`.trim();
}