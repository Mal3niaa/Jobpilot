/**
 * OpenAI provider — direct call to OpenAI API.
 *
 * Activated when MOCK_MODE=false and N8N_ENABLED=false.
 * Requires OPENAI_API_KEY in .env.
 */

import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import {
  JOB_ANALYSIS_SYSTEM_PROMPT,
  buildJobAnalysisPrompt,
} from './prompts/jobAnalysis.prompt.js';
import {
  COVER_LETTER_SYSTEM_PROMPT,
  buildCoverLetterPrompt,
} from './prompts/coverLetter.prompt.js';
/**
 * Analyze a job against a resume using OpenAI Chat Completions.
 *
 * Returns the parsed JSON object from the model.
 * Throws 502 if the model returns invalid JSON.
 */
export async function analyzeJob({ resumeText, job }) {
  if (!env.OPENAI_API_KEY) {
    throw ApiError.badRequest('OPENAI_API_KEY is not configured');
  }

  const userPrompt = buildJobAnalysisPrompt({ resumeText, job });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: JOB_ANALYSIS_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('[openai] API error:', response.status, errText);
    throw new ApiError(502, `OpenAI API error (${response.status})`);
  }

  const payload = await response.json();
  const raw = payload?.choices?.[0]?.message?.content;

  if (!raw) {
    throw new ApiError(502, 'OpenAI returned an empty response');
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(502, 'OpenAI returned invalid JSON');
  }

  return {
    ...parsed,
    modelUsed: env.OPENAI_MODEL || 'gpt-4o-mini',
  };
}


/* --------------------------------------------------------------------------
   Cover letter (real OpenAI)
   -------------------------------------------------------------------------- */

export async function generateCoverLetter({ resumeText, job, language = 'en', tone = 'professional' }) {
  if (!env.OPENAI_API_KEY) {
    throw ApiError.badRequest('OPENAI_API_KEY is not configured');
  }

  const userPrompt = buildCoverLetterPrompt({ resumeText, job, language, tone });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: COVER_LETTER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7, // higher than analysis — we want variety in writing
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('[openai] cover letter API error:', response.status, errText);
    throw new ApiError(502, `OpenAI API error (${response.status})`);
  }

  const payload = await response.json();
  const letter = payload?.choices?.[0]?.message?.content?.trim();

  if (!letter) {
    throw new ApiError(502, 'OpenAI returned an empty cover letter');
  }

  return {
    letter,
    language,
    tone,
    modelUsed: env.OPENAI_MODEL || 'gpt-4o-mini',
  };
}