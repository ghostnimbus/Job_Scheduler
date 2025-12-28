import axios from 'axios';
import { logger } from '../utils/logger.js';
import { config } from '../config/config.js';

export class AlertService {
  constructor() {
    this.alertWebhook = config.alertWebhook;
  }

  /**
   * Send alert on job failure
   */
  async sendAlert(job, executionId, errorMessage) {
    const alert = {
      type: 'JOB_FAILURE',
      jobId: job.id,
      executionId,
      api: job.api,
      schedule: job.schedule,
      errorMessage,
      timestamp: new Date().toISOString()
    };

    logger.error('Job failure alert', alert);

    // If webhook is configured, send HTTP alert
    if (this.alertWebhook) {
      try {
        await axios.post(this.alertWebhook, alert, {
          timeout: 5000
        });
        logger.info('Alert sent to webhook', { webhook: this.alertWebhook });
      } catch (error) {
        logger.error('Failed to send alert to webhook', {
          webhook: this.alertWebhook,
          error: error.message
        });
      }
    }

    // In a production system, you might also:
    // - Send email alerts
    // - Send SMS alerts
    // - Post to Slack/Discord
    // - Write to alert queue
  }
}

