/**
 * OpenAI provider — direct call to OpenAI API.
 *
 * Activated when MOCK_MODE=false and N8N_ENABLED=false.
 * Requires OPENAI_API_KEY in .env.
 *
 * Exposes three functions:
 *   - analyzeJob()
 *   - generateCoverLetter()
 *   - generateRecruiterReply()
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
import {
  RECRUITER_REPLY_SYSTEM_PROMPT,
  buildRecruiterReplyPrompt,
} from './prompts/recruiterReply.prompt.js';

/* --------------------------------------------------------------------------
   Shared helpers
   -------------------------------------------------------------------------- */

/**
 * Minimal wrapper around OpenAI Chat Completions.
 *
 * options:
 *   - systemPrompt: string
 *   - userPrompt:   string
 *   - temperature:  number
 *   - jsonMode:     boolean (default false) — use response_format: json_object
 *
 * Returns the raw string content of the first choice.
 * Throws 502 on network or API errors, 400 on empty response.
 */
async function callOpenAI({ systemPrompt, userPrompt, temperature = 0.5, jsonMode = false }) {
  if (!env.OPENAI_API_KEY) {
    throw ApiError.badRequest('OPENAI_API_KEY is not configured');
  }

  const body = {
    model: env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature,
  };

  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('[openai] API error:', response.status, errText);
    throw new ApiError(502, `OpenAI API error (${response.status})`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new ApiError(502, 'OpenAI returned an empty response');
  }

  return content;
}

/* --------------------------------------------------------------------------
   Job analysis
   -------------------------------------------------------------------------- */

/**
 * Analyze a job against a resume.
 * Returns the parsed JSON object from the model (structured output).
 */
export async function analyzeJob({ resumeText, job }) {
  const userPrompt = buildJobAnalysisPrompt({ resumeText, job });

  const raw = await callOpenAI({
    systemPrompt: JOB_ANALYSIS_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.2,   // deterministic
    jsonMode: true,
  });

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
   Cover letter
   -------------------------------------------------------------------------- */

/**
 * Generate a cover letter for a job.
 */
export async function generateCoverLetter({ resumeText, job, language = 'en', tone = 'professional' }) {
  const userPrompt = buildCoverLetterPrompt({ resumeText, job, language, tone });

  const letter = await callOpenAI({
    systemPrompt: COVER_LETTER_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.7,   // variety in writing
    jsonMode: false,
  });

  return {
    letter,
    language,
    tone,
    modelUsed: env.OPENAI_MODEL || 'gpt-4o-mini',
  };
}

/* --------------------------------------------------------------------------
   Recruiter reply
   -------------------------------------------------------------------------- */

/**
 * Generate a reply to a recruiter's message.
 */
export async function generateRecruiterReply({ message, language = 'en' }) {
  const userPrompt = buildRecruiterReplyPrompt({ message, language });

  const reply = await callOpenAI({
    systemPrompt: RECRUITER_REPLY_SYSTEM_PROMPT,
    userPrompt,
    temperature: 0.5,   // balanced
    jsonMode: false,
  });

  return {
    reply,
    language,
    intent: 'general',  // OpenAI doesn't classify intent — only mock does
    modelUsed: env.OPENAI_MODEL || 'gpt-4o-mini',
  };
}