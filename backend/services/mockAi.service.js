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


/* --------------------------------------------------------------------------
   Recruiter reply (mock)
   -------------------------------------------------------------------------- */

/**
 * Simple intent detection based on keywords.
 */
function detectRecruiterIntent(text) {
  const t = text.toLowerCase();

  if (/(interview|rozmow|spotkan|співбесід|зустріч|schedule|call)/i.test(t)) {
    return 'interview_invite';
  }
  if (/(unfortunat|niestety|на жаль|regret|not move forward|reject)/i.test(t)) {
    return 'rejection';
  }
  if (/(question|pytanie|питання|\?|could you|can you|would you)/i.test(t)) {
    return 'question';
  }
  if (/(salary|wynagrodzen|зарплат|expectations|rate)/i.test(t)) {
    return 'salary_question';
  }
  return 'general';
}

const REPLIES = {
  interview_invite: {
    en: 'Thank you for the invitation. I would be glad to schedule an interview and discuss the role in more detail. Please let me know which time slot works best for you, and I will confirm availability.',
    pl: 'Dziękuję za zaproszenie. Chętnie umówię się na rozmowę i omówię szczegóły stanowiska. Proszę o wskazanie dogodnego terminu — potwierdzę dostępność.',
    uk: 'Дякую за запрошення. Із задоволенням узгоджу час співбесіди та обговорю деталі ролі. Будь ласка, підкажіть зручний час — я підтверджу свою доступність.',
  },
  rejection: {
    en: 'Thank you for taking the time to review my application and for letting me know. I appreciate the opportunity and the feedback. I wish you and the team all the best.',
    pl: 'Dziękuję za poświęcony czas i informację zwrotną dotyczącą mojej aplikacji. Doceniam możliwość udziału w procesie. Życzę Państwu i zespołowi wszystkiego dobrego.',
    uk: 'Дякую за час, приділений моїй заявці, і за зворотний зв’язок. Ціную можливість взяти участь у процесі. Бажаю вам і команді всього найкращого.',
  },
  question: {
    en: 'Thank you for your message and for the questions. Please find my answers below. Let me know if you need any further details — I am happy to clarify.',
    pl: 'Dziękuję za wiadomość i pytania. Poniżej przesyłam odpowiedzi. W razie potrzeby chętnie doprecyzuję szczegóły.',
    uk: 'Дякую за повідомлення та запитання. Нижче надсилаю відповіді. За потреби з радістю уточню деталі.',
  },
  salary_question: {
    en: 'Thank you for the question. I would prefer to discuss the compensation range once we have a clearer understanding of the role and responsibilities. I am open to aligning expectations during the interview process.',
    pl: 'Dziękuję za pytanie. Wolę omówić zakres wynagrodzenia po dokładniejszym poznaniu roli i obowiązków. Jestem otwarty na dopasowanie oczekiwań podczas rozmów.',
    uk: 'Дякую за запитання. Вважаю за краще обговорити рівень винагороди після детальнішого розуміння ролі та обов’язків. Готовий узгодити очікування під час співбесіди.',
  },
  general: {
    en: 'Thank you for reaching out. I am interested in learning more about the opportunity. Please let me know the next steps.',
    pl: 'Dziękuję za kontakt. Jestem zainteresowany bliższym poznaniem oferty. Proszę o informację o kolejnych krokach.',
    uk: 'Дякую за звернення. Зацікавлений дізнатися більше про можливість. Підкажіть, будь ласка, наступні кроки.',
  },
};

/**
 * Mock recruiter reply generator. Detects intent from the recruiter's message
 * and returns a templated reply in the requested language.
 */
export async function generateRecruiterReply({ message, language = 'en' }) {
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

  const lang = ['en', 'pl', 'uk'].includes(language) ? language : 'en';
  const intent = detectRecruiterIntent(message || '');
  const reply = REPLIES[intent][lang];

  return {
    reply,
    language: lang,
    intent,
    modelUsed: 'mock',
  };
}


/* --------------------------------------------------------------------------
   Interview questions (mock)
   -------------------------------------------------------------------------- */

// Template questions for behavioral / role-specific (job-agnostic).
const BEHAVIORAL_QUESTIONS = [
  'Tell us about a project you are most proud of. What was your role and what did you learn?',
  'Describe a situation where you had to work with a difficult teammate. How did you handle it?',
  'Tell us about a time you had to learn a new technology quickly. How did you approach it?',
];

const ROLE_SPECIFIC_QUESTIONS = [
  (job) => `Why are you interested in the ${job.title || 'advertised'} position?`,
  (job) => `What do you know about ${job.company || 'our company'} and why do you want to work here?`,
  (job) => `Where do you see yourself in 3-5 years, and how does this role fit your goals?`,
];

// Template technical questions by keyword.
const TECH_QUESTIONS = {
  'html': 'What semantic HTML elements do you use most often and why?',
  'css': 'How do you decide between Flexbox and CSS Grid in a layout?',
  'javascript': 'Explain the difference between == and === in JavaScript.',
  'typescript': 'What are generics in TypeScript and when do you use them?',
  'react': 'What is the difference between state and props in React?',
  'vue': 'How does Vue\'s reactivity system work at a high level?',
  'angular': 'What is the role of services in Angular dependency injection?',
  'node': 'How does the Node.js event loop handle asynchronous I/O?',
  'node.js': 'How does the Node.js event loop handle asynchronous I/O?',
  'express': 'How do you structure middleware in an Express application?',
  'php': 'What are the differences between PHP 7 and PHP 8?',
  'laravel': 'How does Laravel\'s service container work?',
  'python': 'What are Python decorators and when would you use them?',
  'sql': 'What is the difference between INNER JOIN and LEFT JOIN?',
  'mysql': 'How would you optimize a slow SQL query?',
  'postgresql': 'When would you use a JSONB column in PostgreSQL?',
  'postgres': 'When would you use a JSONB column in PostgreSQL?',
  'mongodb': 'How do you model one-to-many relationships in MongoDB?',
  'redis': 'What are common use cases for Redis in a web application?',
  'docker': 'What is the difference between an image and a container in Docker?',
  'kubernetes': 'What is a Kubernetes pod and how does it differ from a container?',
  'aws': 'What AWS services would you use for a typical web application?',
  'git': 'What is the difference between git merge and git rebase?',
  'rest api': 'What makes an API RESTful? Give examples of RESTful conventions.',
  'graphql': 'How does GraphQL differ from REST, and when would you choose it?',
  'tailwind': 'How does Tailwind CSS differ from traditional CSS frameworks?',
};

/**
 * Mock interview questions generator.
 * Uses keywords from job description to pick relevant technical questions,
 * then adds behavioral and role-specific ones.
 */
export async function generateInterviewQuestions({ resumeText, job }) {
  // Simulate latency.
  await new Promise((r) => setTimeout(r, 500 + Math.random() * 500));

  const jobText = [job.title || '', job.description || '', job.notes || ''].join('\n');
  const keywords = extractKeywords(jobText);

  // Technical: 4-5 questions from keywords.
  const technicalQuestions = [];
  const seenQuestions = new Set();

  for (const kw of keywords) {
    if (technicalQuestions.length >= 5) break;
    const q = TECH_QUESTIONS[kw];
    if (q && !seenQuestions.has(q)) {
      technicalQuestions.push({ category: 'technical', question: q });
      seenQuestions.add(q);
    }
  }

  // If not enough keywords, add generic technical questions.
  const genericTech = [
    'Walk us through how you would debug a production issue.',
    'How do you approach code reviews and what do you look for?',
    'Describe a challenging bug you fixed recently.',
    'How do you ensure your code is testable and maintainable?',
  ];
  for (const q of genericTech) {
    if (technicalQuestions.length >= 4) break;
    if (!seenQuestions.has(q)) {
      technicalQuestions.push({ category: 'technical', question: q });
      seenQuestions.add(q);
    }
  }

  // Behavioral: 2-3 questions.
  const behavioralQuestions = BEHAVIORAL_QUESTIONS.slice(0, 3).map((q) => ({
    category: 'behavioral',
    question: q,
  }));

  // Role-specific: 2-3 questions.
  const roleSpecificQuestions = ROLE_SPECIFIC_QUESTIONS.map((fn) => ({
    category: 'role-specific',
    question: fn(job),
  }));

  // Combine and cap at 10 total.
  const all = [...technicalQuestions, ...behavioralQuestions, ...roleSpecificQuestions];

  return {
    questions: all.slice(0, 10),
    modelUsed: 'mock',
  };
}