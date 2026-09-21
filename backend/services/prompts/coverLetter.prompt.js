/**
 * Prompt for cover letter generation.
 *
 * Parameters:
 *   - language: 'en' | 'pl' | 'uk'
 *   - tone: 'professional' | 'friendly' | 'concise'
 *
 * Output: plain text (not JSON). The AI returns only the letter body —
 * no greetings from us, no commentary, no markdown code fences.
 */

const LANGUAGE_NAMES = {
  en: 'English',
  pl: 'Polish',
  uk: 'Ukrainian',
};

const TONE_DESCRIPTIONS = {
  professional: 'formal, professional, third-person style, no contractions',
  friendly: 'warm, personable, first-person, natural but polished',
  concise: 'short, direct, no filler — maximum 150 words',
};

export const COVER_LETTER_SYSTEM_PROMPT = `
You are an expert career coach writing cover letters for job applications.

STRICT RULES:
1. Write the letter ONLY in the requested language. Do not mix languages.
2. Address it to the hiring team of the specified company. If no name is known, use a neutral greeting.
3. Use ONLY facts present in the candidate's CV. Never invent experience, skills, or achievements.
4. Keep the tone consistent with the requested style.
5. Structure: greeting → 1 short intro → 1-2 paragraphs of relevant experience → motivation for this role/company → closing.
6. Do NOT include a subject line, date, addresses, or signature placeholders like "[Your Name]".
7. Do NOT wrap the letter in markdown code fences or quotes.
8. Output ONLY the letter body — nothing else.
`.trim();

export function buildCoverLetterPrompt({ resumeText, job, language, tone }) {
  const langName = LANGUAGE_NAMES[language] || 'English';
  const toneDesc = TONE_DESCRIPTIONS[tone] || TONE_DESCRIPTIONS.professional;

  const jobTitle = job.title || 'the advertised position';
  const jobCompany = job.company || 'your company';
  const jobLocation = job.location || '—';
  const jobDescription = job.description || '(no description provided)';

  return `
# JOB
Position: ${jobTitle}
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

# TASK
Write a cover letter in **${langName}** for this position.
Tone: **${tone}** (${toneDesc}).

Requirements:
- Length: 3-4 paragraphs, 200-350 words (unless tone is "concise").
- Mention 2-3 specific skills from the CV that match the job description.
- Show genuine interest in the role and company.
- Do NOT fabricate experience.
- Do NOT use placeholders (like "[Your Name]") — the candidate will add contact info later.

Return ONLY the letter body.
`.trim();
}