import { CronParser } from '../utils/cronParser.js';
import { JobExecutor } from './jobExecutor.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config.js';

export class JobScheduler {
  constructor(db, alertService) {
    this.db = db;
    this.alertService = alertService;
    this.executor = new JobExecutor(alertService);
    this.scheduledJobs = new Map(); // jobId -> { cronFields, job, intervalId }
    this.checkInterval = null;
    this.isRunning = false;
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDrift: 0,
      driftSamples: []
    };
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting job scheduler');

    // Check every second for jobs that need to be executed
    this.checkInterval = setInterval(() => {
      this.checkAndExecuteJobs();
    }, 1000);

    // Load existing jobs from database
    this.loadJobsFromDatabase();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    logger.info('Job scheduler stopped');
  }

  /**
   * Load jobs from database
   */
  async loadJobsFromDatabase() {
    try {
      const jobs = await this.db.getAllActiveJobs();
      logger.info(`Loading ${jobs.length} jobs from database`);

      for (const job of jobs) {
        await this.scheduleJob(job);
      }
    } catch (error) {
      logger.error('Error loading jobs from database', { error: error.message });
    }
  }

  /**
   * Schedule a new job
   */
  async scheduleJob(job) {
    try {
      const cronFields = CronParser.parse(job.schedule);
      const scheduledJob = {
        cronFields,
        job,
        nextExecution: CronParser.getNextExecution(cronFields)
      };

      this.scheduledJobs.set(job.id, scheduledJob);
      logger.info(`Scheduled job ${job.id}`, {
        schedule: job.schedule,
        nextExecution: scheduledJob.nextExecution
      });
    } catch (error) {
      logger.error(`Error scheduling job ${job.id}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Check and execute jobs that are due
   */
  async checkAndExecuteJobs() {
    const now = new Date();
    const currentSecond = now.getSeconds();
    const currentMinute = now.getMinutes();
    const currentHour = now.getHours();
    const currentDay = now.getDate();
    const currentMonth = now.getMonth() + 1;
    const currentDayOfWeek = now.getDay();

    for (const [jobId, scheduledJob] of this.scheduledJobs.entries()) {
      try {
        if (CronParser.matches(scheduledJob.cronFields, now)) {
          const scheduledTime = now.getTime();
          const executionId = uuidv4();

          // Calculate drift
          const drift = Math.abs(scheduledTime - scheduledJob.nextExecution.getTime());
          this.updateDriftMetrics(drift);

          // Execute job asynchronously (non-blocking)
          this.executor.executeJobAsync(
            scheduledJob.job,
            executionId,
            scheduledTime,
            this.db
          ).catch(error => {
            logger.error(`Error in async job execution ${executionId}`, { error: error.message });
          });

          // Update next execution time
          scheduledJob.nextExecution = CronParser.getNextExecution(scheduledJob.cronFields, now);

          this.metrics.totalExecutions++;
        }
      } catch (error) {
        logger.error(`Error checking job ${jobId}`, { error: error.message });
      }
    }
  }

  /**
   * Update drift metrics
   */
  updateDriftMetrics(drift) {
    this.metrics.driftSamples.push(drift);
    // Keep only last 1000 samples
    if (this.metrics.driftSamples.length > 1000) {
      this.metrics.driftSamples.shift();
    }
    this.metrics.averageDrift = this.metrics.driftSamples.reduce((a, b) => a + b, 0) / this.metrics.driftSamples.length;
  }

  /**
   * Add a new job
   */
  async addJob(jobSpec) {
    const jobId = uuidv4();
    await this.db.createJob(jobId, jobSpec.schedule, jobSpec.api, jobSpec.type);

    const job = {
      id: jobId,
      schedule: jobSpec.schedule,
      api: jobSpec.api,
      type: jobSpec.type
    };

    await this.scheduleJob(job);
    return jobId;
  }

  /**
   * Update an existing job
   */
  async updateJob(jobId, jobSpec) {
    await this.db.updateJob(jobId, jobSpec.schedule, jobSpec.api, jobSpec.type);

    // Reschedule the job
    this.scheduledJobs.delete(jobId);

    const job = {
      id: jobId,
      schedule: jobSpec.schedule,
      api: jobSpec.api,
      type: jobSpec.type
    };

    await this.scheduleJob(job);
    logger.info(`Updated job ${jobId}`);
  }

  /**
   * Get job by ID
   */
  async getJob(jobId) {
    return await this.db.getJob(jobId);
  }

  /**
   * Get job executions
   */
  async getJobExecutions(jobId, limit = 5) {
    return await this.db.getJobExecutions(jobId, limit);
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      activeJobs: this.scheduledJobs.size,
      activeExecutions: this.executor.getActiveExecutionCount(),
      averageDrift: Math.round(this.metrics.averageDrift)
    };
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning
    };
  }

  /**
   * Get all scheduled jobs
   */
  getScheduledJobs() {
    return Array.from(this.scheduledJobs.values()).map(sj => ({
      jobId: sj.job.id,
      schedule: sj.job.schedule,
      api: sj.job.api,
      nextExecution: sj.nextExecution
    }));
  }
}

