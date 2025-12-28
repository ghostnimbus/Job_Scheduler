# High-Throughput Job Scheduler

A scalable, production-ready job scheduler system capable of executing thousands of scheduled HTTP POST requests per second with high accuracy and reliability.

## Table of Contents

- [System Overview](#system-overview)
- [Features](#features)
- [API Design](#api-design)
- [Data Flow](#data-flow)
- [Installation](#installation)
- [Usage](#usage)
- [Configuration](#configuration)
- [Docker Deployment](#docker-deployment)
- [Trade-offs and Design Decisions](#trade-offs-and-design-decisions)

## System Overview

The High-Throughput Job Scheduler is designed to:

1. **Create Jobs**: Accept job specifications with CRON schedules and API endpoints
2. **Modify Jobs**: Update existing job configurations
3. **Track Executions**: Maintain complete history of all job executions
4. **Alert on Failures**: Notify users when jobs fail
5. **Scale**: Handle thousands of job executions per second
6. **Minimize Drift**: Execute jobs with minimal delay from scheduled time


## Features

### Functional Requirements

**Job Management**
- Create jobs with CRON schedules (including seconds)
- Update existing jobs
- View all job execution instances
- Alert on job failures

**High Throughput**
- Designed to handle thousands of executions per second
- Asynchronous, non-blocking job execution
- Configurable concurrency limits

**Reliability**
- At-least-once execution semantics
- Automatic retry on failure
- Persistent execution history
- Fault-tolerant design

**Accuracy**
- Second-level precision scheduling
- Drift tracking and minimization
- Real-time schedule matching

### Non-Functional Requirements

**Modularity**
- Clear separation of concerns
- Layered architecture (API, Service, Data)
- Reusable components

**Observability**
- Comprehensive logging
- Metrics collection (latency, success/failure rates, drift)
- Debug endpoints

**Scalability**
- Efficient job checking algorithm
- Database indexing for performance
- Configurable resource limits

## API Design

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### 1. Create Job
```http
POST /api/jobs
Content-Type: application/json

{
  "schedule": "31 10-15 1 * * MON-FRI",
  "api": "https://localhost:4444/foo",
  "type": "ATLEAST_ONCE"
}
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Job created successfully"
}
```

#### 2. Update Job
```http
PUT /api/jobs/:jobId
Content-Type: application/json

{
  "schedule": "0 */5 * * * *",
  "api": "https://localhost:4444/bar",
  "type": "ATLEAST_ONCE"
}
```

**Response:**
```json
{
  "message": "Job updated successfully"
}
```

#### 3. Get Job Details
```http
GET /api/jobs/:jobId
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "schedule": "31 10-15 1 * * MON-FRI",
  "api": "https://localhost:4444/foo",
  "type": "ATLEAST_ONCE",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "active": true,
  "stats": {
    "total": 100,
    "success": 95,
    "failed": 5,
    "avgDuration": 1250
  }
}
```

#### 4. Get Job Executions
```http
GET /api/jobs/:jobId/executions?limit=5
```

**Response:**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "executions": [
    {
      "executionId": "660e8400-e29b-41d4-a716-446655440001",
      "scheduledTime": "2024-01-01T01:10:31.000Z",
      "executedTime": "2024-01-01T01:10:31.050Z",
      "status": "SUCCESS",
      "httpStatus": 200,
      "duration": 1250,
      "errorMessage": null,
      "retryCount": 0
    }
  ]
}
```

#### 5. List All Jobs
```http
GET /api/jobs
```

#### 6. Get Metrics (Observability)
```http
GET /api/metrics
```

**Response:**
```json
{
  "scheduler": {
    "isRunning": true,
    "activeJobs": 10,
    "activeExecutions": 5,
    "totalExecutions": 1000,
    "averageDrift": 50
  },
  "jobs": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440000",
      "schedule": "31 10-15 1 * * MON-FRI",
      "nextExecution": "2024-01-01T01:11:31.000Z"
    }
  ]
}
```

#### 7. Get Recent Executions (Observability)
```http
GET /api/executions?limit=100
```

#### 8. Health Check
```http
GET /api/health
```

## Data Flow

### Job Creation Flow

```
1. Client → POST /api/jobs
2. API Layer → Validate request
3. JobScheduler → Parse CRON expression
4. Database → Store job definition
5. JobScheduler → Schedule job
6. Response → Return jobId
```

### Job Execution Flow

```
1. Scheduler → Check current time every second
2. CronParser → Match jobs against current time
3. JobExecutor → Create execution record (PENDING)
4. JobExecutor → Execute HTTP POST (async)
5. JobExecutor → Update execution record (SUCCESS/FAILED)
6. AlertService → Send alert if failed
7. Database → Persist execution details
```

### At-Least-Once Semantics

```
1. Job scheduled → Execution record created (PENDING)
2. HTTP POST attempt
3. If success → Mark SUCCESS
4. If failure → Retry (up to N times)
5. If all retries fail → Mark FAILED, send alert
6. Execution record always persisted
```

## Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Steps

1. **Clone or navigate to the project directory**
```bash
cd /path/to/project
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment (optional)**
```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Start the server**
```bash
npm start
```

5. **Open the Web UI**
```
http://localhost:3000
```

The API will be available at `http://localhost:3000/api`  
The Web UI will be available at `http://localhost:3000`

## Usage

### Web UI (Recommended)

Open `http://localhost:3000` in your browser to access the beautiful web interface:
- 📊 Real-time metrics dashboard
- ➕ Create jobs with a simple form
- 📋 View all jobs and their details
- 📈 Monitor executions in real-time
- 🔄 Auto-refreshes every 5 seconds

See [UI_GUIDE.md](UI_GUIDE.md) for detailed UI documentation.

### API Usage (Command Line)

#### Example: Create a Job

```bash
curl -X POST http://localhost:3000/api/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 */5 * * * *",
    "api": "https://httpbin.org/post",
    "type": "ATLEAST_ONCE"
  }'
```

#### Example: Get Job Executions

```bash
curl http://localhost:3000/api/jobs/{jobId}/executions
```

#### Example: View Metrics

```bash
curl http://localhost:3000/api/metrics
```

## Configuration

Environment variables (see `.env.example`):

- `PORT`: Server port (default: 3000)
- `DB_PATH`: SQLite database path (default: ./data/jobs.db)
- `MAX_CONCURRENT_JOBS`: Maximum concurrent executions (default: 1000)
- `JOB_TIMEOUT`: HTTP request timeout in ms (default: 30000)
- `RETRY_ATTEMPTS`: Number of retries on failure (default: 3)
- `RETRY_DELAY`: Delay between retries in ms (default: 1000)
- `ALERT_WEBHOOK`: Webhook URL for failure alerts (optional)
- `LOG_LEVEL`: Logging level (default: info)

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

### Using Docker

```bash
docker build -t job-scheduler .
docker run -p 3000:3000 job-scheduler
```

The application will be available at `http://localhost:3000`

## Trade-offs and Design Decisions

### 1. SQLite vs. PostgreSQL/MySQL
**Decision**: SQLite for simplicity
**Trade-off**: 
- Simple deployment, no external dependencies
- Sufficient for moderate scale
- Limited concurrent writes, not ideal for extreme scale
**Alternative**: Use PostgreSQL for production at scale

### 2. Second-by-Second Checking
**Decision**: Check every second for due jobs
**Trade-off**:
- Simple, accurate for most use cases
- Minimal CPU overhead
- May miss sub-second precision (acceptable for this use case)

### 3. In-Memory Scheduling
**Decision**: Keep scheduled jobs in memory
**Trade-off**:
- Fast job matching
- Low latency
- Jobs lost on restart (mitigated by loading from DB on startup)

### 4. Asynchronous Execution
**Decision**: Execute jobs asynchronously without blocking scheduler
**Trade-off**:
- High throughput
- Scheduler not blocked by slow jobs
- Requires careful resource management (handled via config)

### 5. At-Least-Once Semantics
**Decision**: Retry on failure, persist all attempts
**Trade-off**:
- Reliable execution
- Complete audit trail
- Potential duplicate executions (acceptable for HTTP POST idempotency)

### 6. Single-Process Architecture
**Decision**: Single Node.js process
**Trade-off**:
- Simple deployment
- No distributed coordination needed
- Limited horizontal scaling (can be extended with message queue)


## High Availability

For high availability, consider:

1. **Multi-Instance Deployment**: Use a distributed lock (Redis) to coordinate job execution
2. **Message Queue**: Offload job execution to a queue (RabbitMQ, Kafka)
3. **Database Replication**: Use PostgreSQL with replication
4. **Health Checks**: Implement health endpoints for load balancers
5. **Graceful Shutdown**: Already implemented for clean restarts

## Testing

**Run the API test script:**

Node.js (cross-platform):
```bash
node test-api.js
```

PowerShell (Windows):
```powershell
.\test-api.ps1
```

This will test all API endpoints including job creation, execution tracking, and metrics.

## Logging

Logs are written to:
- Console (with colors)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

