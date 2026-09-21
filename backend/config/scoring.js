/**
 * Scoring weights for the final match score.
 * AI returns per-category scores; we combine them here.
 *
 * The sum must be 1.0 — validated on startup.
 */
export const SCORING_WEIGHTS = {
  technicalSkills: 0.40,
  experience:      0.20,
  education:       0.10,
  languages:       0.10,
  jobRequirements: 0.20,
};

/**
 * Compute the final score from category scores.
 * Each category score should be 0..100.
 *
 * Returns an integer 0..100.
 */
export function computeMatchScore(scores) {
  let total = 0;
  for (const [key, weight] of Object.entries(SCORING_WEIGHTS)) {
    const value = Number(scores?.[key] ?? 0);
    const clamped = Math.max(0, Math.min(100, value));
    total += clamped * weight;
  }
  return Math.round(total);
}

/**
 * Sanity check — call on startup.
 */
export function validateWeights() {
  const sum = Object.values(SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 0.0001) {
    throw new Error(`SCORING_WEIGHTS must sum to 1.0 (got ${sum})`);
  }
}