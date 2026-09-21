import { PDFParse } from 'pdf-parse';
import { ApiError } from '../utils/ApiError.js';
import * as resumesDb from '../db/resumes.js';

/* --------------------------------------------------------------------------
   PDF → text
   -------------------------------------------------------------------------- */

/**
 * Extract plain text from a PDF buffer.
 * Uses pdf-parse@2.x API: `new PDFParse({ data: buffer })`.
 *
 * Throws 400 if the buffer is not a valid PDF or contains no text.
 */
async function extractTextFromPdf(buffer) {
  if (!buffer || buffer.length === 0) {
    throw ApiError.badRequest('Empty file');
  }

  let parser;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = (result.text || '').trim();

    if (text.length < 30) {
      throw ApiError.badRequest(
        'Could not extract enough text from the PDF. Is it a scanned image? Try a text-based PDF.'
      );
    }

    return text;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[resume.service] PDF parse failed:', err.message);
    throw ApiError.badRequest(
      'Failed to parse PDF. Make sure it is a valid PDF file.'
    );
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      try { await parser.destroy(); } catch { /* ignore */ }
    }
  }
}

/* --------------------------------------------------------------------------
   Public API
   -------------------------------------------------------------------------- */

/**
 * Save a newly uploaded resume.
 *
 * Flow:
 *  1. Extract text from PDF.
 *  2. Deactivate previous resumes.
 *  3. Insert new resume with is_active = TRUE.
 */
export async function saveResume(userId, { filePath, buffer }) {
  if (!filePath) throw ApiError.badRequest('Missing file path');

  const rawText = await extractTextFromPdf(buffer);

  await resumesDb.deactivateAll(userId);
  const resume = await resumesDb.createResume(userId, {
    filePath,
    rawText,
    parsedJson: null,
  });

  return resume;
}

/**
 * Get the user's active resume.
 */
export async function getActiveResume(userId) {
  return resumesDb.findActiveByUser(userId);
}

/**
 * Get only the raw text of the active resume (for AI service in Phase 9).
 */
export async function getActiveRawText(userId) {
  return resumesDb.findActiveRawText(userId);
}

/**
 * Delete the user's active resume.
 * Throws 404 if none.
 */
export async function deleteActiveResume(userId) {
  const deleted = await resumesDb.deleteActiveByUser(userId);
  if (!deleted) {
    throw ApiError.notFound('No active resume to delete');
  }
}

/**
 * Strip internal fields before sending to client.
 * `file_path` is a server detail — client only needs id, created_at, etc.
 */
export function toPublicResume(resume) {
  if (!resume) return null;
  const { file_path, user_id, ...publicFields } = resume;
  return publicFields;
}