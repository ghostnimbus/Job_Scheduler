import express from 'express';
import { logger } from '../utils/logger.js';

export function createRoutes(jobScheduler, db) {
  const router = express.Router();

  /**
   * Create a new job
   * POST /api/jobs
   * Body: { schedule, api, type }
   */
  router.post('/jobs', async (req, res) => {
    try {
      const { schedule, api, type } = req.body;

      if (!schedule || !api || !type) {
        return res.status(400).json({
          error: 'Missing required fields: schedule, api, type'
        });
      }

      if (type !== 'ATLEAST_ONCE') {
        return res.status(400).json({
          error: 'Invalid type. Only ATLEAST_ONCE is supported'
        });
      }

      const jobId = await jobScheduler.addJob({ schedule, api, type });

      logger.info('Job created', { jobId, schedule, api });

      res.status(201).json({
        jobId,
        message: 'Job created successfully'
      });
    } catch (error) {
      logger.error('Error creating job', { error: error.message });
      res.status(400).json({
        error: error.message
      });
    }
  });

  /**
   * Update an existing job
   * PUT /api/jobs/:jobId
   * Body: { schedule, api, type }
   */
  router.put('/jobs/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const { schedule, api, type } = req.body;

      if (!schedule || !api || !type) {
        return res.status(400).json({
          error: 'Missing required fields: schedule, api, type'
        });
      }

      const existingJob = await jobScheduler.getJob(jobId);
      if (!existingJob) {
        return res.status(404).json({
          error: 'Job not found'
        });
      }

      await jobScheduler.updateJob(jobId, { schedule, api, type });

      logger.info('Job updated', { jobId });

      res.json({
        message: 'Job updated successfully'
      });
    } catch (error) {
      logger.error('Error updating job', { error: error.message });
      res.status(400).json({
        error: error.message
      });
    }
  });

  /**
   * Get job executions
   * GET /api/jobs/:jobId/executions?limit=5
   */
  router.get('/jobs/:jobId/executions', async (req, res) => {
    try {
      const { jobId } = req.params;
      const limit = parseInt(req.query.limit) || 5;

      const job = await jobScheduler.getJob(jobId);
      if (!job) {
        return res.status(404).json({
          error: 'Job not found'
        });
      }

      const executions = await jobScheduler.getJobExecutions(jobId, limit);

      res.json({
        jobId,
        executions: executions.map(exec => ({
          executionId: exec.id,
          scheduledTime: new Date(exec.scheduled_time).toISOString(),
          executedTime: exec.executed_time ? new Date(exec.executed_time).toISOString() : null,
          status: exec.status,
          httpStatus: exec.http_status,
          duration: exec.duration,
          errorMessage: exec.error_message,
          retryCount: exec.retry_count
        }))
      });
    } catch (error) {
      logger.error('Error fetching job executions', { error: error.message });
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * Get job details
   * GET /api/jobs/:jobId
   */
  router.get('/jobs/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await jobScheduler.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          error: 'Job not found'
        });
      }

      const stats = await db.getExecutionStats(jobId);

      res.json({
        jobId: job.id,
        schedule: job.schedule,
        api: job.api,
        type: job.type,
        createdAt: new Date(job.created_at).toISOString(),
        updatedAt: new Date(job.updated_at).toISOString(),
        active: job.active === 1,
        stats: {
          total: stats?.total || 0,
          success: stats?.success || 0,
          failed: stats?.failed || 0,
          avgDuration: stats?.avg_duration ? Math.round(stats.avg_duration) : null
        }
      });
    } catch (error) {
      logger.error('Error fetching job', { error: error.message });
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * List all jobs
   * GET /api/jobs
   */
  router.get('/jobs', async (req, res) => {
    try {
      const jobs = await db.getAllActiveJobs();
      res.json({
        jobs: jobs.map(job => ({
          jobId: job.id,
          schedule: job.schedule,
          api: job.api,
          type: job.type,
          createdAt: new Date(job.created_at).toISOString()
        }))
      });
    } catch (error) {
      logger.error('Error fetching jobs', { error: error.message });
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * Get metrics and observability data
   * GET /api/metrics
   */
  router.get('/metrics', async (req, res) => {
    try {
      const metrics = jobScheduler.getMetrics();
      const scheduledJobs = jobScheduler.getScheduledJobs();

      res.json({
        scheduler: {
          isRunning: jobScheduler.isRunning,
          activeJobs: metrics.activeJobs,
          activeExecutions: metrics.activeExecutions,
          totalExecutions: metrics.totalExecutions,
          averageDrift: metrics.averageDrift
        },
        jobs: scheduledJobs.map(sj => ({
          jobId: sj.jobId,
          schedule: sj.schedule,
          nextExecution: sj.nextExecution.toISOString()
        }))
      });
    } catch (error) {
      logger.error('Error fetching metrics', { error: error.message });
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * Get recent executions (observability)
   * GET /api/executions?limit=100
   */
  router.get('/executions', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const executions = await db.getAllExecutions(limit);

      res.json({
        executions: executions.map(exec => ({
          executionId: exec.id,
          jobId: exec.job_id,
          scheduledTime: new Date(exec.scheduled_time).toISOString(),
          executedTime: exec.executed_time ? new Date(exec.executed_time).toISOString() : null,
          status: exec.status,
          httpStatus: exec.http_status,
          duration: exec.duration,
          errorMessage: exec.error_message,
          retryCount: exec.retry_count
        }))
      });
    } catch (error) {
      logger.error('Error fetching executions', { error: error.message });
      res.status(500).json({
        error: error.message
      });
    }
  });

  /**
   * Health check endpoint
   * GET /api/health
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

