import { ApiError } from '../utils/ApiError.js';
import * as jobsDb from '../db/jobs.js';

/**
 * Allowed job statuses.
 * Keep in sync with the frontend status list.
 */
export const JOB_STATUSES = [
  'saved',
  'applied',
  'recruiter_contacted',
  'interview',
  'technical_task',
  'offer',
  'rejected',
];

/**
 * Allowed employment types.
 */
export const EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  'freelance',
];

/* --------------------------------------------------------------------------
   Validation helpers
   -------------------------------------------------------------------------- */

function assertStatus(status) {
  if (!JOB_STATUSES.includes(status)) {
    throw ApiError.badRequest(
      `Invalid status. Allowed: ${JOB_STATUSES.join(', ')}`
    );
  }
}

function assertEmploymentType(type) {
  if (type !== undefined && type !== null && !EMPLOYMENT_TYPES.includes(type)) {
    throw ApiError.badRequest(
      `Invalid employment type. Allowed: ${EMPLOYMENT_TYPES.join(', ')}`
    );
  }
}

function assertSalaryRange(min, max) {
  if (min !== undefined && max !== undefined && min !== null && max !== null) {
    if (typeof min !== 'number' || typeof max !== 'number') {
      throw ApiError.badRequest('Salary min and max must be numbers');
    }
    if (min < 0 || max < 0) {
      throw ApiError.badRequest('Salary cannot be negative');
    }
    if (min > max) {
      throw ApiError.badRequest('Salary min cannot be greater than max');
    }
  }
}

/* --------------------------------------------------------------------------
   Public API
   -------------------------------------------------------------------------- */

/**
 * Create a new job for the user.
 * The title is required; everything else is optional.
 */
export async function createJob(userId, data) {
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    throw ApiError.badRequest('Job title is required');
  }
  if (data.title.length > 255) {
    throw ApiError.badRequest('Job title is too long (max 255 characters)');
  }
  assertEmploymentType(data.employmentType);
  assertSalaryRange(data.salaryMin, data.salaryMax);

  return jobsDb.createJob(userId, {
    ...data,
    title: data.title.trim(),
  });
}

/**
 * List the user's jobs with optional filters.
 */
export async function listJobs(userId, filters = {}) {
  const { status, search, sort, order } = filters;

  if (status) assertStatus(status);

  return jobsDb.findJobsByUser(userId, { status, search, sort, order });
}

/**
 * Get one job by id, scoped to the user.
 * Throws 404 if not found or if it belongs to another user.
 */
export async function getJob(userId, jobId) {
  const id = Number(jobId);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('Invalid job id');
  }

  const job = await jobsDb.findJobById(userId, id);
  if (!job) {
    throw ApiError.notFound('Job not found');
  }
  return job;
}

/**
 * Update a job. Only whitelisted fields are applied.
 * Throws 404 if the job doesn't exist or belongs to another user.
 */
export async function updateJob(userId, jobId, patch) {
  const id = Number(jobId);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('Invalid job id');
  }

  // Validate fields that are present in the patch.
  if (patch.title !== undefined) {
    if (typeof patch.title !== 'string' || patch.title.trim().length === 0) {
      throw ApiError.badRequest('Job title cannot be empty');
    }
    if (patch.title.length > 255) {
      throw ApiError.badRequest('Job title is too long (max 255 characters)');
    }
    patch = { ...patch, title: patch.title.trim() };
  }
  if (patch.status !== undefined) assertStatus(patch.status);
  if (patch.employmentType !== undefined) assertEmploymentType(patch.employmentType);
  if (patch.salaryMin !== undefined || patch.salaryMax !== undefined) {
    assertSalaryRange(patch.salaryMin, patch.salaryMax);
  }

  const updated = await jobsDb.updateJob(userId, id, patch);
  if (!updated) {
    throw ApiError.notFound('Job not found');
  }
  return updated;
}

/**
 * Delete a job.
 * Throws 404 if the job doesn't exist or belongs to another user.
 */
export async function deleteJob(userId, jobId) {
  const id = Number(jobId);
  if (!Number.isInteger(id) || id <= 0) {
    throw ApiError.badRequest('Invalid job id');
  }

  const deleted = await jobsDb.deleteJob(userId, id);
  if (!deleted) {
    throw ApiError.notFound('Job not found');
  }
}

/**
 * Get status counters for the user's dashboard.
 */
export async function getStatusCounts(userId) {
  return jobsDb.getStatusCounts(userId);
}