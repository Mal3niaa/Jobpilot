import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to backend/uploads/
const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads');

// Ensure the upload directory exists.
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* --------------------------------------------------------------------------
   Storage — write files to disk with randomized names
   -------------------------------------------------------------------------- */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Never trust the original filename.
    // Generate a random name + keep the extension.
    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${randomName}${ext}`);
  },
});

/* --------------------------------------------------------------------------
   File filter — only PDFs
   -------------------------------------------------------------------------- */
function fileFilter(_req, file, cb) {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

  if (isPdfMime && isPdfExt) {
    return cb(null, true);
  }
  cb(ApiError.badRequest('Only PDF files are allowed'));
}

/* --------------------------------------------------------------------------
   Exported middleware
   -------------------------------------------------------------------------- */
export const uploadPdf = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024, // MB → bytes
    files: 1,
  },
}).single('file');

/**
 * Wrapper that converts multer's errors into our ApiError.
 * Use in routes: `uploadPdfSafe, ctrl.upload`
 */
export function uploadPdfSafe(req, res, next) {
  uploadPdf(req, res, (err) => {
    if (!err) return next();

    if (err instanceof ApiError) return next(err);

    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(
        ApiError.badRequest(`File is too large (max ${env.MAX_FILE_SIZE_MB} MB)`)
      );
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(ApiError.badRequest('Only one file is allowed'));
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(ApiError.badRequest('Unexpected file field — expected "file"'));
    }

    next(ApiError.badRequest('File upload failed'));
  });
}