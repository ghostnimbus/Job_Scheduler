import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './database/db.js';
import { JobScheduler } from './services/jobScheduler.js';
import { AlertService } from './services/alertService.js';
import { createRoutes } from './api/routes.js';
import { config } from './config/config.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Initialize database
    logger.info('Initializing database...');
    const db = new Database();
    await db.initialize();
    logger.info('Database initialized');

    // Initialize services
    const alertService = new AlertService();
    const jobScheduler = new JobScheduler(db, alertService);

    // Start scheduler
    jobScheduler.start();

    // Initialize Express app
    const app = express();
    app.use(express.json());
    
    // CORS - Allow frontend on port 3001
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3001');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // API routes
    app.use('/api', createRoutes(jobScheduler, db));

    // API info endpoint
    app.get('/api/info', (req, res) => {
      res.json({
        message: 'High-Throughput Job Scheduler API',
        version: '1.0.0',
        endpoints: {
          'POST /api/jobs': 'Create a new job',
          'PUT /api/jobs/:jobId': 'Update a job',
          'GET /api/jobs': 'List all jobs',
          'GET /api/jobs/:jobId': 'Get job details',
          'GET /api/jobs/:jobId/executions': 'Get job executions (last 5)',
          'GET /api/metrics': 'Get system metrics',
          'GET /api/executions': 'Get recent executions',
          'GET /api/health': 'Health check'
        }
      });
    });

    // Start server
    const port = config.port;
    app.listen(port, () => {
      logger.info(`Job Scheduler API server started on port ${port}`);
      logger.info(`API available at http://localhost:${port}/api`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully...');
      jobScheduler.stop();
      await db.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully...');
      jobScheduler.stop();
      await db.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start application', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

main();

