# Architecture Documentation

## System Architecture

### High-Level Overview

The High-Throughput Job Scheduler follows a layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                               │
│              (HTTP REST API Clients)                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ HTTP/REST
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                   API Layer (Express)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REST Endpoints                                       │   │
│  │  - POST   /api/jobs                                  │   │
│  │  - PUT    /api/jobs/:jobId                           │   │
│  │  - GET    /api/jobs/:jobId                           │   │
│  │  - GET    /api/jobs/:jobId/executions                │   │
│  │  - GET    /api/metrics                               │   │
│  │  - GET    /api/executions                            │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                Service Layer                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │JobScheduler  │  │JobExecutor    │  │AlertService  │     │
│  │              │  │               │  │              │     │
│  │- CRON parse  │  │- HTTP POST    │  │- Failure     │     │
│  │- Schedule    │  │- Retry logic  │  │  alerts      │     │
│  │- Drift mgmt  │  │- Async exec   │  │- Webhooks    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                  Data Layer                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              SQLite Database                         │   │
│  │                                                       │   │
│  │  jobs table:                                         │   │
│  │  - id, schedule, api, type, timestamps              │   │
│  │                                                       │   │
│  │  job_executions table:                               │   │
│  │  - id, job_id, scheduled_time, executed_time,       │   │
│  │    status, http_status, duration, error_message      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTP POST
                           │
┌──────────────────────────▼──────────────────────────────────┐
│              External APIs (Job Targets)                     │
└─────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. API Layer (`src/api/routes.js`)

**Responsibilities:**
- HTTP request/response handling
- Request validation
- Error handling and status codes
- JSON serialization

**Key Features:**
- RESTful design
- Input validation
- Consistent error responses
- Observability endpoints

### 2. Service Layer

#### JobScheduler (`src/services/jobScheduler.js`)

**Responsibilities:**
- Parse and validate CRON expressions
- Maintain in-memory schedule of active jobs
- Check every second for due jobs
- Trigger job execution
- Track metrics (drift, execution counts)

**Key Algorithms:**
- **Schedule Matching**: Uses CronParser to match current time against all job schedules
- **Drift Calculation**: Tracks difference between scheduled and actual execution time
- **Next Execution Calculation**: Pre-computes next execution time for each job

**Performance Optimizations:**
- In-memory job storage for fast lookups
- Efficient CRON matching (O(n) where n = number of jobs)
- Asynchronous job execution (non-blocking)

#### JobExecutor (`src/services/jobExecutor.js`)

**Responsibilities:**
- Execute HTTP POST requests
- Implement at-least-once semantics
- Retry logic with exponential backoff
- Track execution state

**Key Features:**
- Concurrent execution support
- Configurable retry attempts
- Timeout handling
- Execution tracking

#### AlertService (`src/services/alertService.js`)

**Responsibilities:**
- Send failure alerts
- Support webhook notifications
- Log all alerts

### 3. Data Layer (`src/database/db.js`)

**Responsibilities:**
- Job persistence
- Execution history tracking
- Query optimization

**Database Schema:**

```sql
-- Jobs table
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  schedule TEXT NOT NULL,
  api TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  active INTEGER DEFAULT 1
);

-- Executions table
CREATE TABLE job_executions (
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
);

-- Indexes for performance
CREATE INDEX idx_job_executions_job_id ON job_executions(job_id);
CREATE INDEX idx_job_executions_scheduled_time ON job_executions(scheduled_time);
CREATE INDEX idx_jobs_active ON jobs(active);
```

### 4. Utilities

#### CronParser (`src/utils/cronParser.js`)

**Extended CRON Format:**
```
second minute hour day month dayOfWeek
```

**Supported Features:**
- Wildcards (*)
- Ranges (10-15)
- Lists (MON,FRI)
- Steps (*/5)
- Day names (MON-FRI)

**Example:**
```
"31 10-15 1 * * MON-FRI"
```
Executes at 31st second of every minute between 01:10-01:15 AM on weekdays.

#### Logger (`src/utils/logger.js`)

**Features:**
- Structured logging with Winston
- Multiple transports (console, file)
- Log levels (error, warn, info, debug)
- JSON format for machine parsing

## Data Flow

### Job Creation Flow

```
1. Client sends POST /api/jobs with job spec
2. API validates request (schedule, api, type)
3. JobScheduler.addJob():
   a. Generate unique jobId (UUID)
   b. Parse CRON expression
   c. Store in database
   d. Add to in-memory schedule
4. Return jobId to client
```

### Job Execution Flow

```
1. Scheduler checks every second:
   a. Get current time
   b. For each scheduled job:
      - Check if CRON matches current time
      - If match:
         * Generate executionId
         * Create execution record (PENDING)
         * Trigger async execution
         * Update next execution time

2. JobExecutor.executeJobAsync():
   a. Execute HTTP POST (with retries)
   b. Update execution record:
      - SUCCESS: httpStatus, duration
      - FAILED: errorMessage, retryCount
   c. If failed: AlertService.sendAlert()

3. Execution persisted in database
```

### At-Least-Once Semantics

```
Execution Attempt:
├─ Try HTTP POST
├─ If success → Mark SUCCESS, done
├─ If failure:
│  ├─ Retry (up to N times)
│  ├─ Exponential backoff
│  └─ If all retries fail:
│     ├─ Mark FAILED
│     └─ Send alert
└─ Execution record always persisted
```

## Scalability Considerations

### Current Design

1. **Single Process**: All scheduling in one Node.js process
2. **In-Memory Scheduling**: Fast job matching
3. **Async Execution**: Non-blocking HTTP requests
4. **SQLite**: Simple, file-based database

### Limitations

1. **Horizontal Scaling**: Not natively supported (single process)
2. **Database Bottleneck**: SQLite has write concurrency limits
3. **Memory**: All jobs loaded in memory

### Scaling Strategies

For higher scale, consider:

1. **Distributed Scheduler**:
   - Use Redis for distributed locking
   - Leader election for job scheduling
   - Multiple worker processes

2. **Message Queue**:
   - Offload execution to queue (RabbitMQ, Kafka)
   - Separate scheduler from executors
   - Better horizontal scaling

3. **Database Upgrade**:
   - PostgreSQL for better concurrency
   - Read replicas for queries
   - Partitioning for large datasets

4. **Caching**:
   - Redis for frequently accessed data
   - Reduce database load

## Fault Tolerance

### Current Mechanisms

1. **Database Persistence**: Jobs survive restarts
2. **Retry Logic**: Automatic retries on failure
3. **Graceful Shutdown**: Clean process termination
4. **Error Handling**: Comprehensive try-catch blocks

### Failure Scenarios

1. **Process Crash**:
   - Jobs reloaded from database on restart
   - Executions in progress may be lost (marked as PENDING)

2. **Database Failure**:
   - System cannot create/update jobs
   - Existing scheduled jobs continue (in-memory)

3. **Network Failure**:
   - Retry logic handles transient failures
   - Alerts sent on persistent failures

4. **External API Failure**:
   - Retries with exponential backoff
   - Alert sent after max retries

## Performance Characteristics

### Throughput

- **Job Checking**: O(n) per second where n = number of jobs
- **Execution**: Asynchronous, limited by MAX_CONCURRENT_JOBS
- **Database**: Indexed queries for fast lookups

### Latency

- **API Response**: < 10ms (typical)
- **Job Execution**: Depends on external API
- **Schedule Drift**: Typically < 100ms

### Resource Usage

- **Memory**: ~1KB per job (in-memory)
- **CPU**: Minimal (1 check per second)
- **Database**: Grows with execution history

## Security Considerations

1. **Input Validation**: All API inputs validated
2. **SQL Injection**: Parameterized queries
3. **HTTP Timeouts**: Prevent hanging requests
4. **Error Messages**: Don't expose internal details

## Monitoring and Observability

### Metrics Collected

1. **Scheduler Metrics**:
   - Total executions
   - Active jobs
   - Active executions
   - Average drift

2. **Job Metrics**:
   - Success/failure rates
   - Average duration
   - Retry counts

3. **System Metrics**:
   - API latency
   - Database query time
   - Error rates

### Logging

- Structured JSON logs
- Multiple log levels
- File and console output
- Error tracking

### Debug Endpoints

- `/api/metrics`: System-wide metrics
- `/api/executions`: Recent executions
- `/api/health`: Health check

