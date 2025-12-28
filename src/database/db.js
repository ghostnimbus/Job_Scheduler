import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { config } from '../config/config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    // Ensure data directory exists
    const dbDir = path.dirname(config.dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(config.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const run = promisify(this.db.run.bind(this.db));

    // Jobs table
    await run(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        schedule TEXT NOT NULL,
        api TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        active INTEGER DEFAULT 1
      )
    `);

    // Job executions table
    await run(`
      CREATE TABLE IF NOT EXISTS job_executions (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        scheduled_time INTEGER NOT NULL,
        executed_time INTEGER,
        status TEXT NOT NULL,
        http_status INTEGER,
        duration INTEGER,
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        FOREIGN KEY (job_id) REFERENCES jobs(id)
      )
    `);

    // Create indexes for performance
    await run(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_job_id ON job_executions(job_id)
    `);
    await run(`
      CREATE INDEX IF NOT EXISTS idx_job_executions_scheduled_time ON job_executions(scheduled_time)
    `);
    await run(`
      CREATE INDEX IF NOT EXISTS idx_jobs_active ON jobs(active)
    `);
  }

  async createJob(jobId, schedule, api, type) {
    const run = promisify(this.db.run.bind(this.db));
    const now = Date.now();
    await run(
      'INSERT INTO jobs (id, schedule, api, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [jobId, schedule, api, type, now, now]
    );
    return jobId;
  }

  async updateJob(jobId, schedule, api, type) {
    const run = promisify(this.db.run.bind(this.db));
    const now = Date.now();
    await run(
      'UPDATE jobs SET schedule = ?, api = ?, type = ?, updated_at = ? WHERE id = ?',
      [schedule, api, type, now, jobId]
    );
  }

  async getJob(jobId) {
    const get = promisify(this.db.get.bind(this.db));
    return await get('SELECT * FROM jobs WHERE id = ?', [jobId]);
  }

  async getAllActiveJobs() {
    const all = promisify(this.db.all.bind(this.db));
    return await all('SELECT * FROM jobs WHERE active = 1');
  }

  async deactivateJob(jobId) {
    const run = promisify(this.db.run.bind(this.db));
    await run('UPDATE jobs SET active = 0 WHERE id = ?', [jobId]);
  }

  async createExecution(executionId, jobId, scheduledTime) {
    const run = promisify(this.db.run.bind(this.db));
    await run(
      'INSERT INTO job_executions (id, job_id, scheduled_time, status) VALUES (?, ?, ?, ?)',
      [executionId, jobId, scheduledTime, 'PENDING']
    );
  }

  async updateExecution(executionId, status, httpStatus, duration, errorMessage, retryCount = 0) {
    const run = promisify(this.db.run.bind(this.db));
    const executedTime = Date.now();
    await run(
      `UPDATE job_executions 
       SET executed_time = ?, status = ?, http_status = ?, duration = ?, error_message = ?, retry_count = ?
       WHERE id = ?`,
      [executedTime, status, httpStatus, duration, errorMessage, retryCount, executionId]
    );
  }

  async getJobExecutions(jobId, limit = 5) {
    const all = promisify(this.db.all.bind(this.db));
    return await all(
      `SELECT * FROM job_executions 
       WHERE job_id = ? 
       ORDER BY scheduled_time DESC 
       LIMIT ?`,
      [jobId, limit]
    );
  }

  async getExecutionStats(jobId) {
    const get = promisify(this.db.get.bind(this.db));
    return await get(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
        AVG(duration) as avg_duration
       FROM job_executions 
       WHERE job_id = ?`,
      [jobId]
    );
  }

  async getAllExecutions(limit = 100) {
    const all = promisify(this.db.all.bind(this.db));
    return await all(
      `SELECT * FROM job_executions 
       ORDER BY scheduled_time DESC 
       LIMIT ?`,
      [limit]
    );
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

