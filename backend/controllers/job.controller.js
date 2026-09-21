import * as jobService from '../services/job.service.js';

/**
 * GET /api/jobs
 * Query: ?status=applied&search=react&sort=created_at&order=desc
 * Protected.
 */
export async function listJobs(req, res, next) {
  try {
    const { status, search, sort, order } = req.query;
    const jobs = await jobService.listJobs(req.user.id, { status, search, sort, order });
    res.json({ success: true, data: { jobs } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/jobs
 * Body: { title, company?, location?, salaryMin?, salaryMax?,
 *         employmentType?, url?, description?, notes? }
 * Protected.
 */
export async function createJob(req, res, next) {
  try {
    const job = await jobService.createJob(req.user.id, req.body);
    res.status(201).json({ success: true, data: { job } });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/jobs/:id
 * Protected.
 */
export async function getJob(req, res, next) {
  try {
    const job = await jobService.getJob(req.user.id, req.params.id);
    res.json({ success: true, data: { job } });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/jobs/:id
 * Body: partial update.
 * Protected.
 */
export async function updateJob(req, res, next) {
  try {
    const job = await jobService.updateJob(req.user.id, req.params.id, req.body);
    res.json({ success: true, data: { job } });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/jobs/:id
 * Protected.
 */
export async function deleteJob(req, res, next) {
  try {
    await jobService.deleteJob(req.user.id, req.params.id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}