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


/* --------------------------------------------------------------------------
   Cover letter (mock)
   -------------------------------------------------------------------------- */

const GREETINGS = {
  en: 'Dear Hiring Team,',
  pl: 'Szanowni Państwo,',
  uk: 'Шановна командо,',
};

const CLOSINGS = {
  en: 'Sincerely,',
  pl: 'Z poważaniem,',
  uk: 'З повагою,',
};

const INTRO_TEMPLATES = {
  en: (job) => `I am writing to express my strong interest in the ${job.title || 'advertised'} position at ${job.company || 'your company'}. Your team's focus aligns closely with my background in software development, and I would be excited to contribute.`,
  pl: (job) => `Piszę, aby wyrazić swoje szczere zainteresowanie stanowiskiem ${job.title || 'ogłoszonym'} w firmie ${job.company || 'Państwa firmie'}. Kierunek rozwoju Państwa zespołu jest bliski mojemu doświadczeniu w tworzeniu oprogramowania i chętnie wniosę swój wkład.`,
  uk: (job) => `Пишу, щоб висловити щиру зацікавленість у позиції ${job.title || 'оголошеній'} у компанії ${job.company || 'вашій компанії'}. Напрямок розвитку вашої команди близький до мого досвіду в розробці програмного забезпечення, і я з радістю долучуся.`,
};

/**
 * Mock cover letter generator. Returns a realistic-looking letter
 * built from the job + resume keywords. Deterministic, no API calls.
 */
export async function generateCoverLetter({ resumeText, job, language = 'en', tone = 'professional' }) {
  // Simulate latency.
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

  const lang = ['en', 'pl', 'uk'].includes(language) ? language : 'en';

  // Pull top 3 tech keywords from CV.
  const resumeKeywords = extractKeywords(resumeText).slice(0, 3);
  const skillsList = resumeKeywords.length
    ? resumeKeywords.join(', ')
    : 'software development, problem-solving, teamwork';

  const greeting = GREETINGS[lang];
  const closing = CLOSINGS[lang];
  const intro = INTRO_TEMPLATES[lang](job);

  // Body differs slightly by language but is templated.
  const bodies = {
    en: `Throughout my career, I have developed strong skills in ${skillsList}. I enjoy building reliable, maintainable systems and collaborating closely with teammates to ship features that matter. I am particularly drawn to ${job.company || 'your company'} because of the emphasis on quality and continuous improvement evident in the role description.`,
    pl: `W trakcie mojej kariery rozwinąłem solidne umiejętności w zakresie: ${skillsList}. Lubię budować niezawodne i łatwe w utrzymaniu systemy oraz blisko współpracować z zespołem, aby dostarczać wartościowe funkcje. Szczególnie przyciąga mnie ${job.company || 'Państwa firma'} ze względu na nacisk na jakość i ciągłe doskonalenie, widoczny w opisie stanowiska.`,
    uk: `Протягом своєї кар'єри я розвинув(-ла) міцні навички у сфері: ${skillsList}. Мені подобається створювати надійні та зручні в підтримці системи, а також тісно співпрацювати з командою для впровадження важливих функцій. Особливо мене приваблює ${job.company || 'ваша компанія'} завдяки акценту на якості та постійному вдосконаленні, який видно з опису посади.`,
  };

  const motivations = {
    en: `I would welcome the opportunity to discuss how my experience can contribute to your team. Thank you for considering my application.`,
    pl: `Byłbym wdzięczny za możliwość rozmowy o tym, jak moje doświadczenie może wesprzeć Państwa zespół. Dziękuję za rozpatrzenie mojej kandydatury.`,
    uk: `Буду вдячний(-а) за можливість обговорити, як мій досвід може допомогти вашій команді. Дякую за розгляд моєї кандидатури.`,
  };

  const body = bodies[lang];
  const closingSentence = motivations[lang];

  const paragraphs = [greeting, intro, body, closingSentence, `${closing}`];

  return {
    letter: paragraphs.join('\n\n'),
    language: lang,
    tone,
    modelUsed: 'mock',
  };
}