# Courier — Backend Service

The backend is an asynchronous email scheduling service built with Express 5, BullMQ, Redis, MySQL, and Elasticsearch. It provides exact-time job scheduling without cron, enforces per-sender hourly throughput limits with in-order rescheduling, and guarantees persistence across server restarts.

## Architectural Overview

```
Client Requests
      │
      ▼
Express API (:4000)
      │
      ├── MySQL 8.4 (Prisma ORM) ────────── Source of truth for accounts, senders, emails
      ├── Redis 7 (BullMQ Delayed Queue) ── Execution timers, job deduplication, rate limits
      └── Elasticsearch 8 ───────────────── Read-only projection for full-text search
      │
      ▼
BullMQ Worker Process
      ├── Pacing Slot Check (Redis SET NX PX)
      ├── Hourly Rate Limit Check (Redis fixed-window counter)
      ├── Guarded State Transition (scheduled -> sending)
      ├── Ethereal SMTP Transport (Fake SMTP delivery)
      └── Post-Send Persistence (status -> sent, ES re-index, Slack alert if over limit)
```

## Features Implemented

| Category | Implementation | Description |
|---|---|---|
| Scheduler | BullMQ Delayed Jobs | One delayed job per recipient. No cron or polling loops. |
| Persistence | Redis AOF + MySQL | Resumes delayed jobs after restarts; reconciles database rows on boot. |
| Idempotency | 3-Layer Protection | `jobId = email.id`, DB guarded claim (`UPDATE ... WHERE status = 'scheduled'`), API `Idempotency-Key` header. |
| Rate Limiting | Redis Fixed Window | Keyed by `rl:<senderId>:<YYYYMMDDHH>` in UTC; atomically reschedules excess jobs into next hour window. |
| Provider Throttling | Minimum Send Gap | 2-second minimum delay between sends per sender via Redis atomic lock. |
| Concurrency | Configurable Workers | `WORKER_CONCURRENCY` controls parallel job processing per worker instance. |
| Real-time Alerts | Slack OAuth v2 | Webhook alert dispatched on sender limit breach with 1-hour deduplication lock. |
| Search | Elasticsearch Projection | Asynchronous read projection over MySQL; does not block core transactional dispatch. |
| Observability | Bull Board Dashboard | Protected `/admin/queues` UI showing job payloads, progress bars, logs, and return values. |

## Core Mechanisms

### 1. Scheduling Without Cron
* Every scheduling request (`POST /emails/schedule`) inserts one row per recipient in MySQL with `status = 'scheduled'`.
* Concurrently, BullMQ schedules a delayed job for each row with `jobId = row.id` and delay calculated as `scheduledAt - now`.
* When multiple recipients are provided, sends are staggered: `scheduledAt = startAt + (i * delay)`.

### 2. Restart Persistence and Idempotency
* If the process crashes or restarts, BullMQ preserves delayed jobs in Redis.
* On boot, `requeueScheduledEmails()` scans MySQL for any rows in `scheduled` state with `trashed = false` and re-adds them to BullMQ. BullMQ's deterministic `jobId` deduplication guarantees no duplicate jobs are created.
* When a worker executes a job, it executes a guarded transition:
  `UPDATE ScheduledEmail SET status = 'sending' WHERE id = :id AND status = 'scheduled' AND trashed = false`
* If the row was already taken, cancelled, or missing, the worker immediately aborts execution.
* Once the SMTP handshake completes, the status is marked `sent` and is never reverted to prevent duplicate deliveries.

### 3. Rate Limiting and Ordered Deferral
* Each sender has an hourly cap stored in Redis under `rl:<senderId>:<YYYYMMDDHH>`.
* The counter increments atomically via a Redis transaction.
* When an email exceeds the sender's limit, it is not dropped or failed. It is rescheduled to the next UTC hour window:
  `retryAt = nextHourBoundary + orderOffsetMs`
* The `orderOffsetMs` maintains the original relative FIFO ordering among deferred emails.
* A Redis lock `rl-alert:<senderId>:<hour>` ensures only one Slack notification is sent per sender per hour.

### 4. Search via Elasticsearch Projection
* Writes always land in MySQL first.
* Emails are indexed into Elasticsearch on creation and re-indexed on status changes.
* Search queries (`GET /emails/search?q=...`) match document IDs in Elasticsearch and retrieve canonical rows from MySQL scoped by `ownerId`.
* An Elasticsearch downtime or failure degrades search functionality but never disrupts email scheduling or delivery.

## Local Setup

### Prerequisites
* Node.js 22 or newer
* Docker and Docker Compose

### Step 1: Start Backing Services
```bash
docker compose up -d
```
Starts MySQL (3306), Redis (6379), and Elasticsearch (9200).

### Step 2: Configure Environment
```bash
cd backend
cp .env.example .env
```
Fill in the required environment variables:
* `DATABASE_URL`: `mysql://root:courier@localhost:3306/courier`
* `REDIS_URL`: `redis://localhost:6379`
* `ELASTICSEARCH_URL`: `http://localhost:9200`
* `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`: Google OAuth credentials.
* `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI`: Slack OAuth credentials.
* `JWT_SECRET`: 32+ character signing string.
* `BULLBOARD_USER`, `BULLBOARD_PASSWORD`: Basic auth credentials for queue dashboard.

### Step 3: Run Database Migrations
```bash
npx prisma migrate deploy
```

### Step 4: Start API and Worker
In terminal 1 (API server):
```bash
npm run dev
```

In terminal 2 (Queue worker):
```bash
npm run worker
```

## Ethereal Fake SMTP Setup

Sender mailboxes use Ethereal Email (`https://ethereal.email`), a hosted fake SMTP service.
* No manual account configuration is required.
* Senders are automatically provisioned on demand using `nodemailer.createTestAccount()`.
* Each user receives a default sender identity upon first login.
* Additional senders can be created with `POST /senders`.
* Mail dispatched by Courier is delivered to the Ethereal testing sandbox and can be viewed using the sender's SMTP credentials stored in the `Sender` table.

## API Specification

All endpoints except `/health` and `/auth/*` require the `courier_session` httpOnly cookie.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service liveness probe. |
| `GET` | `/auth/google` | Initiates Google OAuth 2.0 authentication flow. |
| `GET` | `/auth/me` | Returns authenticated user profile. |
| `POST` | `/auth/logout` | Clears session cookie. |
| `GET` | `/auth/slack` | Initiates Slack OAuth v2 authorization flow. |
| `GET` | `/auth/slack/status` | Returns Slack connection status and team name. |
| `POST` | `/auth/slack/disconnect` | Disconnects Slack integration. |
| `GET` | `/senders` | Lists provisioned sender identities for current user. |
| `POST` | `/senders` | Provisions a new Ethereal sender identity. |
| `POST` | `/emails/schedule` | Schedules email batch (recipients, delay, hourly limit). |
| `GET` | `/emails/scheduled` | Paginated scheduled and sending emails. |
| `GET` | `/emails/sent` | Paginated sent and failed emails. |
| `GET` | `/emails/counts` | Active counts for Scheduled and Sent tabs. |
| `GET` | `/emails/:id` | Full email details and sanitized HTML body. |
| `PATCH` | `/emails/:id` | Updates flags (starred, archived, trashed). |
| `GET` | `/emails/search` | Full-text search powered by Elasticsearch. |
| `GET` | `/docs` | Interactive OpenAPI / Swagger UI documentation. |
| `GET` | `/admin/queues` | Bull Board real-time queue observability dashboard. |

## Automated Testing

```bash
npm test          # Runs 26 integration tests against real service containers
npm run typecheck # Strict TypeScript compiler verification
```

The test suite covers:
* Authentication scoping and multi-tenant isolation
* Request schema validation and 4xx status handling
* Batch scheduling and quota enforcement
* Exactly-once delivery and idempotency
* Worker restart recovery and lost job re-enqueueing
* Hourly rate limiting with in-order deferral
* Live Slack alert dispatch and deduplication
