/**
 * Mock AI service — deterministic, no external calls.
 *
 * Heuristic: parse tech keywords out of the job description,
 * check which ones appear in the CV, compute scores.
 *
 * Goal: produce realistic-looking data so we can develop the UI
 * without burning OpenAI credits.
 */

/* --------------------------------------------------------------------------
   Keyword dictionary
   -------------------------------------------------------------------------- */
// Keywords we look for in job descriptions. Grouped by family so we can
// downgrade "React" to partial if CV has "Vue" (same family, different tech).
const TECH_FAMILIES = {
  frontend: ['html', 'css', 'javascript', 'typescript', 'react', 'vue', 'angular', 'svelte', 'next.js'],
  backend: ['node', 'node.js', 'express', 'nestjs', 'php', 'laravel', 'python', 'django', 'flask', 'java', 'spring', 'c#', '.net', 'go'],
  database: ['sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'sqlite'],
  devops: ['docker', 'kubernetes', 'aws', 'azure', 'gcp', 'ci/cd', 'git', 'github actions'],
  testing: ['jest', 'vitest', 'mocha', 'cypress', 'playwright', 'phpunit'],
  ai: ['openai', 'gpt', 'llm', 'machine learning', 'tensorflow', 'pytorch'],
  tools: ['rest api', 'graphql', 'websockets', 'tailwind', 'sass', 'webpack', 'vite', 'figma'],
};

// Flattened list of all keywords we recognize.
const ALL_KEYWORDS = Object.values(TECH_FAMILIES).flat();

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */
function normalize(text) {
  return (text || '').toLowerCase();
}

function extractKeywords(text) {
  const norm = normalize(text);
  return ALL_KEYWORDS.filter((kw) => {
    // Word-boundary-ish match — avoid matching "java" inside "javascript".
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    return re.test(norm);
  });
}

function findFamilyOf(keyword) {
  for (const [family, list] of Object.entries(TECH_FAMILIES)) {
    if (list.includes(keyword)) return family;
  }
  return null;
}

/* --------------------------------------------------------------------------
   Main
   -------------------------------------------------------------------------- */

/**
 * Produce a mock analysis for { resumeText, job }.
 *
 * Returns the same shape as the real OpenAI call (see ai.service.js).
 */
export async function analyzeJob({ resumeText, job }) {
  // Simulate network latency (300-800ms) so the UI's loading state is visible.
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

  const jobText = [
    job.title || '',
    job.description || '',
    job.notes || '',
  ].join('\n');

  const jobKeywords = extractKeywords(jobText);
  const resumeNorm = normalize(resumeText);

  const strongMatches = [];
  const partialMatches = [];
  const missingSkills = [];

  for (const kw of jobKeywords) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
    const inResume = re.test(resumeNorm);

    if (inResume) {
      strongMatches.push(kw);
      continue;
    }

    // Partial match: CV has a sibling keyword in the same family.
    const family = findFamilyOf(kw);
    const hasSibling = family && TECH_FAMILIES[family].some((sib) => {
      if (sib === kw) return false;
      const sibEsc = sib.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sibRe = new RegExp(`(^|[^a-z0-9])${sibEsc}([^a-z0-9]|$)`, 'i');
      return sibRe.test(resumeNorm);
    });

    if (hasSibling) {
      partialMatches.push(kw);
    } else {
      missingSkills.push(kw);
    }
  }

  // --- Category scores ---
  const total = strongMatches.length + partialMatches.length + missingSkills.length || 1;
  const technicalSkills = Math.round(
    ((strongMatches.length + partialMatches.length * 0.5) / total) * 100
  );

  // Experience: heuristic on presence of years / job titles in CV.
  const experience = /\b(20\d{2})\b/.test(resumeText) ? 70 : 40;
  // Education: check for degree keywords.
  const education = /\b(bachelor|master|phd|b\.?sc|m\.?sc|university|degree|inżynier|magister)\b/i.test(resumeText) ? 75 : 40;
  // Languages: count language names.
  const langHits = (resumeText.match(/\b(english|polish|ukrainian|russian|german|spanish|french|angielski|polski|ukraiński|rosyjski)\b/gi) || []).length;
  const languages = Math.min(100, 40 + langHits * 15);
  // Job-specific: use overall match as proxy.
  const jobRequirements = Math.round(technicalSkills * 0.9);

  // --- Summary ---
  const totalJobs = strongMatches.length + partialMatches.length + missingSkills.length;
  const matched = strongMatches.length;
  const summary = totalJobs === 0
    ? 'No tech keywords could be extracted from the job description. Add more detail to get a meaningful analysis.'
    : `Matches ${matched} of ${totalJobs} detected requirements. ` +
      (missingSkills.length > 0
        ? `Missing ${missingSkills.length} skill${missingSkills.length > 1 ? 's' : ''} — see recommendations.`
        : 'No critical skill gaps detected.');

  // --- Requirements (extracted from description, mock) ---
  const requirements = [];
  if (/\b(\d+)\+?\s*years?\b/i.test(jobText)) {
    const m = jobText.match(/\b(\d+)\+?\s*years?\b/i);
    requirements.push(`${m[1]}+ years of experience`);
  }
  if (/\b(english|angielski)\b/i.test(jobText)) requirements.push('English language');
  if (/\b(bachelor|master|degree|wyższe)\b/i.test(jobText)) requirements.push('University degree');

  // --- Recommendations ---
  const recommendations = [];
  if (missingSkills.length > 0) {
    recommendations.push(`Focus on learning: ${missingSkills.slice(0, 3).join(', ')}`);
  }
  if (partialMatches.length > 0) {
    recommendations.push(`Strengthen existing adjacent skills: ${partialMatches.slice(0, 3).join(', ')}`);
  }
  if (recommendations.length === 0) {
    recommendations.push('Your profile is a strong fit — highlight relevant projects in your cover letter.');
  }

  return {
    categoryScores: {
      technicalSkills,
      experience,
      education,
      languages,
      jobRequirements,
    },
    summary,
    strongMatches,
    partialMatches,
    missingSkills,
    requirements,
    recommendations,
    modelUsed: 'mock',
  };
}