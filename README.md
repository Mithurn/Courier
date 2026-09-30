# Courier

Email scheduler service and dashboard built with TypeScript, Express 5, BullMQ, Redis, MySQL, and Elasticsearch. It schedules emails at exact timestamps using BullMQ delayed jobs (no cron), persists jobs across worker and server restarts, and enforces configurable per-sender hourly rate limits with in-order deferral.

- **Live Production URL:** https://mithurnscourier.duckdns.org
- **API Documentation (Swagger UI):** https://mithurnscourier.duckdns.org/docs
- **Queue Dashboard (Bull Board):** https://mithurnscourier.duckdns.org/admin/queues

---

## Architectural Overview

```
Client / Dashboard Browser
            │
            ▼
   Caddy Reverse Proxy (:80, :443 TLS)
      ├── /api/*  ──▶ Express API (:4000)
      ├── /admin/* ─▶ Bull Board Queue Dashboard (:4000)
      └── /*      ──▶ Vite Production Static Build
            │
            ▼
Express API & BullMQ Worker (Decoupled Processes)
      ├── MySQL 8.4 (Prisma ORM) ──────── Transactional source of truth
      ├── Redis 7 (BullMQ & Rates) ────── Delayed job sets, rate limits, send pacing
      └── Elasticsearch 8 ─────────────── Asynchronous read-projection for search
```

---

## Features Implemented

### Backend Requirements

| Requirement | Implementation | Details |
|---|---|---|
| Scheduler (No Cron) | BullMQ Delayed Jobs | One delayed job per recipient in Redis. Zero OS crontab or node-cron usage. |
| Persistence & Restarts | Redis AOF + MySQL | Resumes delayed jobs after process restarts; reconciles database rows on boot. |
| Idempotency | 3-Layer Dedup | Deterministic `jobId = email.id`, DB status guard (`UPDATE ... WHERE status = 'scheduled'`), API `Idempotency-Key` header. |
| Rate Limiting | Redis Fixed Window | Atomic counter keyed by `rl:<senderId>:<YYYYMMDDHH>` in UTC. Over-limit jobs are deferred into the next hour window (zero dropped jobs). |
| Provider Throttling | Minimum Send Delay | Enforces minimum 2-second gap per sender (`SET NX PX` in Redis) to prevent provider throttling. |
| Worker Concurrency | Configurable Concurrency | `WORKER_CONCURRENCY` defines parallel job processing capability per worker instance. |
| Slack Notification | Real Slack OAuth v2 | Webhook alert dispatched to Slack channel on rate-limit breach with 1-hour deduplication lock. |
| Search | Elasticsearch Projection | Full-text search over subjects, recipients, and body previews. Reads match IDs, canonical rows load from MySQL. |
| Observability | Bull Board Dashboard | Protected `/admin/queues` dashboard displaying queue status, job logs, progress bars, and return values. |

### Frontend Requirements

| Requirement | Implementation | Details |
|---|---|---|
| Figma Adherence | Tailwind CSS v4 Tokens | Exact reproduction of typography, color palette, sidebar navigation, and status pills. |
| Authentication | Google OAuth 2.0 | Real Google OAuth authorization code flow storing JWT in an httpOnly `SameSite=Lax` cookie. |
| Dashboard | Sidebar & Navigation | Sidebar layout with user avatar, name, email, active tab badge counters, and logout option. |
| Scheduled Emails | Dynamic Email Table | Displays scheduled time, live countdown timer for future jobs, pagination, and empty states. |
| Sent Emails | Delivery Log Table | Displays sent timestamp, sent/failed status pills, error reason tooltips, and pagination. |
| Compose Workflow | Rich Text & Attachments | ContentEditable formatting toolbar, image attachment previews, and recipient chip tokenization. |
| Bulk Lead Import | CSV & TXT Parser | Parses uploaded lead lists up to 5,000 emails with recipient count and overflow badges. |
| Real-Time Updates | Background Polling | Polls every 4 seconds to update tab counts and list status without full-page reloads. |
| User Notifications | Consolidated Toasts | Distinct warm-orange toast for scheduled jobs (2s dismiss) and green toast when background delivery finishes. |

---

## Quick Start (Single Command)

Requires Docker and Node 20+. Starts backing services (MySQL, Redis, Elasticsearch), runs database migrations, and launches the backend API, BullMQ worker, and frontend concurrently:

```bash
./run-local.sh
```

Service URLs:
* Frontend: `http://localhost:5173`
* Bull Board: `http://localhost:4000/admin/queues` (credentials: `BULLBOARD_USER` / `BULLBOARD_PASSWORD` from your `.env`)
* API Docs: `http://localhost:4000/docs`
* Health Check: `http://localhost:4000/health`

---

## Step-by-Step Local Setup

### 1. Start Backing Infrastructure
```bash
docker compose up -d
```
Starts MySQL 8.4 on port 3306, Redis 7 on port 6379, and Elasticsearch 8.15 on port 9200.

### 2. Run the Backend
```bash
cd backend
cp .env.example .env
npm ci
npx prisma migrate deploy
npm run dev                          # API server on :4000
npm run worker                       # Queue worker (in a second terminal)
```

### 3. Run the Frontend
```bash
cd frontend
npm ci
npm run dev                          # Vite development server on :5173
```

---

## Environment Configuration

Configuration variables for `backend/.env`:

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `mysql://...` | MySQL connection string for Prisma. |
| `REDIS_URL` | `redis://...` | Redis connection for BullMQ and rate limits. |
| `ELASTICSEARCH_URL` | `http://...` | Elasticsearch connection for search indexing. |
| `ELASTICSEARCH_INDEX` | `courier-emails` | Index name for email documents. |
| `WORKER_CONCURRENCY` | `5` | Maximum parallel jobs processed per worker. |
| `MIN_DELAY_BETWEEN_SENDS_MS` | `2000` | Minimum pacing interval between sends per sender. |
| `MAX_EMAILS_PER_HOUR_PER_SENDER`| `50` | Sender hourly throughput limit cap. |
| `DAILY_EMAIL_QUOTA_PER_USER` | `5000` | Maximum emails a user can schedule per UTC day. |
| `JOB_RETRY_ATTEMPTS` | `5` | Maximum retries before marking an email failed. |
| `JOB_RETRY_BACKOFF_MS` | `5000` | Exponential backoff delay for retries. |
| `GOOGLE_CLIENT_ID` | Required | Google Cloud Console OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Required | Google Cloud Console OAuth client secret. |
| `GOOGLE_CALLBACK_URL` | Required | Redirect URL for Google OAuth callback. |
| `SLACK_CLIENT_ID` | Required | Slack app client ID for webhook install. |
| `SLACK_CLIENT_SECRET` | Required | Slack app client secret. |
| `SLACK_REDIRECT_URI` | Required | Redirect URL for Slack OAuth callback. |
| `JWT_SECRET` | Required | Secret string (32+ chars) for signing session JWTs. |
| `FRONTEND_URL` | `http://localhost:5173` | Client origin for CORS and authentication redirects. |
| `TRUST_PROXY_HOPS` | `1` | Number of upstream reverse proxies. |
| `BULLBOARD_USER` | `admin` | Basic auth username for queue dashboard. |
| `BULLBOARD_PASSWORD` | Required | Basic auth password (12+ chars) for queue dashboard. |
| `BULLBOARD_PATH` | `/admin/queues` | HTTP path where Bull Board is mounted. |

---

## Ethereal Email Setup

Courier uses Ethereal Email (`https://ethereal.email`) for SMTP testing.
* Users do not need to configure SMTP credentials manually.
* Senders are auto-provisioned on demand via `nodemailer.createTestAccount()`.
* Each user receives an auto-created Ethereal identity on first login; additional senders can be provisioned via `POST /senders`.
* Outgoing emails are accepted by Ethereal and can be inspected in the Ethereal web inbox using the sender credentials stored in the `Sender` table.

---

## Architecture Deep Dive

### Scheduling Mechanics (Zero Cron)
* When a batch is submitted, rows are inserted into MySQL, and corresponding jobs are added to BullMQ using `emailQueue.addBulk()`.
* Job delays are computed as `Math.max(0, scheduledAt.getTime() - now)`.
* For batches with delays, schedules are spaced: `scheduledAt = startAt + (i * delayBetweenSendsMs)`.
* BullMQ manages job execution timestamps using Redis sorted sets (`ZSET`). No recurring cron polling is used.

### Crash Persistence and Idempotency
* Jobs are stored in Redis with Append-Only File (AOF) persistence enabled.
* If a worker is interrupted or killed, unacknowledged jobs return to the queue.
* On boot, the worker reconciliation routine queries MySQL for any rows in `scheduled` status where `trashed = false` and re-adds them to the queue.
* Because `jobId` equals the email's unique ID, BullMQ skips already-existing jobs idempotently.
* During execution, the worker acquires an atomic row lock:
  ```sql
  UPDATE ScheduledEmail
  SET status = 'sending'
  WHERE id = :id AND status = 'scheduled' AND trashed = false;
  ```
  If the row was already claimed or moved to trash, execution safely aborts without duplicate delivery.
* After a successful SMTP handshake, the record transitions to `sent` and is never reverted.

### Hourly Rate Limiting and In-Order Deferral
* Hourly counters are keyed by sender and current UTC hour: `rl:<senderId>:<YYYYMMDDHH>`.
* Counters increment atomically via `MULTI (SET NX + INCRBY)` with a 3,700-second TTL.
* When the counter exceeds the sender's configured `hourlyLimit`:
  1. The job is not failed or dropped.
  2. The next run time is calculated to the start of the next UTC hour window plus a sub-second offset (`orderOffsetMs`) to preserve relative FIFO queue order.
  3. The job is rescheduled using `job.moveToDelayed(retryAt, token)`.
  4. An alert lock (`rl-alert:<senderId>:<hour>`) is claimed via atomic `SET NX EX`. If claimed, a live Block Kit message is dispatched to the user's Slack webhook.

### Behavior Under Heavy Load (1,000+ Emails)
* 1,000 emails scheduled simultaneously are written via bulk database insert and bulk queue enqueue.
* The worker enforces the 2-second minimum delay between sends per sender via Redis atomic lock (`SET key NX PX <delay>`).
* The first batch up to the hourly limit sends sequentially at the pacing interval.
* All subsequent jobs in the hour hit the rate limit and are deferred to the next hour window in Redis within milliseconds.
* A single Slack alert is pushed for the sender.
* The remaining queue drains automatically window by window across future hours without manual intervention or memory leaks.

---

## Automated Testing & CI/CD

```bash
cd backend
npm test          # Runs 26 integration tests against live MySQL, Redis, ES, and SMTP
npm run typecheck # Strict TypeScript compilation check
```

Automated pipelines run via GitHub Actions:
* **Backend CI (`.github/workflows/backend-ci.yml`):** Runs tests against service containers, builds production Docker images, and pushes to GitHub Container Registry (GHCR).
* **Frontend CI/CD (`.github/workflows/frontend-deploy.yml`):** Runs TypeScript compilation, bundles production assets with Vite, and deploys to the AWS EC2 production instance.

---

## Assumptions and Trade-offs

1. **Email Body Storage:** Email bodies are stored per recipient row to allow independent message tracking and rendering. For larger multi-tenant volume, extracting a shared `Campaign` table would reduce storage overhead.
2. **Fixed Window vs. Sliding Window:** A fixed UTC hourly window was chosen over a sliding window because the assignment requires rescheduling excess jobs into the "next hour window". Fixed windows provide clean, predictable boundary targets.
3. **Session Cookies:** Sessions use `SameSite=Lax` cookies. In production, Caddy serves both the frontend and proxies `/api` to Express on the same origin (`mithurnscourier.duckdns.org`), eliminating cross-site cookie restrictions.
4. **Elasticsearch Projection:** MySQL is the ACID source of truth. Elasticsearch serves as an asynchronous projection for search. A temporary Elasticsearch indexing failure will never fail an email send.
