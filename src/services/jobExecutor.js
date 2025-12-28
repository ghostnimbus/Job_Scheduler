import axios from 'axios';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

export class JobExecutor {
  constructor(alertService) {
    this.alertService = alertService;
    this.activeExecutions = new Map();
    this.pendingQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Execute a job with at-least-once semantics
   */
  async executeJob(job, executionId, scheduledTime) {
    const startTime = Date.now();
    let retryCount = 0;
    const maxRetries = config.retryAttempts;

    while (retryCount <= maxRetries) {
      try {
        logger.info(`Executing job ${job.id}, execution ${executionId}, attempt ${retryCount + 1}`);

        const response = await axios.post(job.api, {}, {
          timeout: config.jobTimeout,
          validateStatus: () => true // Don't throw on any status code
        });

        const duration = Date.now() - startTime;
        const isSuccess = response.status >= 200 && response.status < 300;

        logger.info(`Job ${job.id} execution ${executionId} completed`, {
          status: response.status,
          duration,
          retryCount
        });

        return {
          status: isSuccess ? 'SUCCESS' : 'FAILED',
          httpStatus: response.status,
          duration,
          errorMessage: isSuccess ? null : `HTTP ${response.status}: ${response.statusText}`
        };
      } catch (error) {
        retryCount++;
        const duration = Date.now() - startTime;

        if (retryCount > maxRetries) {
          logger.error(`Job ${job.id} execution ${executionId} failed after ${maxRetries} retries`, {
            error: error.message,
            retryCount
          });

          // Alert on failure
          await this.alertService.sendAlert(job, executionId, error.message);

          return {
            status: 'FAILED',
            httpStatus: null,
            duration,
            errorMessage: error.message
          };
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, config.retryDelay * retryCount));
        logger.warn(`Retrying job ${job.id} execution ${executionId}, attempt ${retryCount + 1}`);
      }
    }
  }

  /**
   * Execute job asynchronously (non-blocking)
   * Enforces MAX_CONCURRENT_JOBS limit by queuing when at capacity
   */
  async executeJobAsync(job, executionId, scheduledTime, db) {
    // Check if we're at capacity
    const currentActive = this.activeExecutions.size;
    const maxConcurrent = config.maxConcurrentJobs;

    if (currentActive >= maxConcurrent) {
      // Queue the execution
      logger.warn(`Concurrency limit reached (${currentActive}/${maxConcurrent}), queuing execution ${executionId}`);
      this.pendingQueue.push({ job, executionId, scheduledTime, db });
      this.processQueue();
      return;
    }

    // Execute immediately
    await this._executeJobInternal(job, executionId, scheduledTime, db);
  }

  /**
   * Internal method to execute a job
   */
  async _executeJobInternal(job, executionId, scheduledTime, db) {
    // Mark execution as started
    await db.createExecution(executionId, job.id, scheduledTime);

    // Execute in background
    this.activeExecutions.set(executionId, { job, startTime: Date.now() });

    try {
      const result = await this.executeJob(job, executionId, scheduledTime);
      await db.updateExecution(
        executionId,
        result.status,
        result.httpStatus,
        result.duration,
        result.errorMessage,
        result.retryCount || 0
      );
      return result;
    } catch (error) {
      logger.error(`Unexpected error executing job ${job.id}`, { error: error.message });
      await db.updateExecution(
        executionId,
        'FAILED',
        null,
        Date.now() - this.activeExecutions.get(executionId)?.startTime || 0,
        error.message,
        0
      );
      throw error;
    } finally {
      this.activeExecutions.delete(executionId);
      // Process next queued job
      this.processQueue();
    }
  }

  /**
   * Process queued jobs when capacity is available
   */
  async processQueue() {
    if (this.isProcessingQueue) return;
    if (this.pendingQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.pendingQueue.length > 0 && this.activeExecutions.size < config.maxConcurrentJobs) {
      const { job, executionId, scheduledTime, db } = this.pendingQueue.shift();
      // Execute without awaiting (fire and forget)
      this._executeJobInternal(job, executionId, scheduledTime, db).catch(error => {
        logger.error(`Error processing queued execution ${executionId}`, { error: error.message });
      });
    }

    this.isProcessingQueue = false;
  }

  getActiveExecutionCount() {
    return this.activeExecutions.size;
  }
}

