export const config = {
  port: process.env.PORT || 3000,
  dbPath: process.env.DB_PATH || './data/jobs.db',
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '1000'),
  jobTimeout: parseInt(process.env.JOB_TIMEOUT || '30000'), // 30 seconds
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000'), // 1 second
  alertWebhook: process.env.ALERT_WEBHOOK || null,
  logLevel: process.env.LOG_LEVEL || 'info'
};

