import fs from 'node:fs/promises';
import { ApiError } from '../utils/ApiError.js';
import * as resumeService from '../services/resume.service.js';

/**
 * GET /api/resume
 * Returns the active resume metadata (without raw_text — too large).
 */
export async function getResume(req, res, next) {
  try {
    const resume = await resumeService.getActiveResume(req.user.id);
    const publicResume = resumeService.toPublicResume(resume);

    // Don't send raw_text in the list view — it can be huge.
    // Keep only metadata + a preview (first 500 chars).
    const response = publicResume
      ? {
          ...publicResume,
          raw_text: undefined,
          preview: (resume.raw_text || '').slice(0, 500),
          textLength: (resume.raw_text || '').length,
        }
      : null;

    res.json({ success: true, data: { resume: response } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/resume/text
 * Returns the full raw text (used for preview / future AI).
 * Could be huge — used on demand.
 */
export async function getResumeText(req, res, next) {
  try {
    const text = await resumeService.getActiveRawText(req.user.id);
    if (text === null) {
      throw ApiError.notFound('No active resume');
    }
    res.json({ success: true, data: { rawText: text } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/resume
 * multipart/form-data, field "file" (PDF, max 5 MB).
 * Requires: req.file (populated by multer middleware).
 */
export async function uploadResume(req, res, next) {
  let filePathOnDisk = null;

  try {
    if (!req.file) {
      throw ApiError.badRequest('No file uploaded — expected field "file"');
    }

    filePathOnDisk = req.file.path;

    // Read the file into a Buffer (we saved it on disk; we need it in memory
    // to parse the PDF).
    const buffer = await fs.readFile(filePathOnDisk);

    // Save to DB (extract text + mark active).
    const resume = await resumeService.saveResume(req.user.id, {
      filePath: req.file.filename,
      buffer,
    });

    // Public response — strip raw_text (too large).
    const publicResume = resumeService.toPublicResume(resume);

    res.status(201).json({
      success: true,
      data: {
        resume: {
          ...publicResume,
          raw_text: undefined,
          preview: (resume.raw_text || '').slice(0, 500),
          textLength: (resume.raw_text || '').length,
        },
      },
    });
  } catch (err) {
    // Clean up the file if anything failed after it was saved.
    if (filePathOnDisk && err) {
      try {
        await fs.unlink(filePathOnDisk);
      } catch { /* ignore */ }
    }
    next(err);
  }
}

/**
 * DELETE /api/resume
 * Deletes the active resume (from DB; file left on disk for now).
 */
export async function deleteResume(req, res, next) {
  try {
    await resumeService.deleteActiveResume(req.user.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}