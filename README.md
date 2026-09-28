# Courier

Email scheduler and dashboard. Schedules emails with BullMQ delayed jobs (no cron), sends them through Ethereal SMTP, and survives restarts without losing or duplicating a send.

Stack: TypeScript, Express 5, BullMQ + Redis, MySQL + Prisma, Elasticsearch, Ethereal SMTP. The React + Tailwind frontend lives in `frontend/`.

## Run the backend

Requires Node 22 and Docker.

```bash
docker compose up -d                 # MySQL, Redis, Elasticsearch
cd backend
cp .env.example .env                 # fill in the blanks, see below
npm ci
npx prisma migrate deploy
npm run dev                          # API on :4000
npm run worker                       # in a second terminal
```

Bull Board is at `http://localhost:4000/admin/queues` (basic auth from `BULLBOARD_USER` / `BULLBOARD_PASSWORD`).

### Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL`, `REDIS_URL`, `ELASTICSEARCH_URL`, `ELASTICSEARCH_INDEX` | Infrastructure |
| `WORKER_CONCURRENCY` | Parallel jobs per worker (default 5) |
| `MIN_DELAY_BETWEEN_SENDS_MS` | Minimum gap between two sends from one sender (default 2000) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Hourly cap per sender (default 50) |
| `DAILY_EMAIL_QUOTA_PER_USER` | Emails a user can schedule per UTC day (default 5000) |
| `JOB_RETRY_ATTEMPTS`, `JOB_RETRY_BACKOFF_MS` | BullMQ retries with exponential backoff |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` | Google OAuth |
| `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_REDIRECT_URI` | Slack OAuth |
| `JWT_SECRET` | Session signing, 32+ characters |
| `FRONTEND_URL` | CORS origin and post-login redirect |
| `TRUST_PROXY_HOPS` | Number of reverse proxies in front of the API |
| `BULLBOARD_USER`, `BULLBOARD_PASSWORD` (12+ chars), `BULLBOARD_PATH` | Queue dashboard |

### Ethereal

No setup. Senders are Ethereal test mailboxes created through `nodemailer.createTestAccount()`: one on first login, more with `POST /senders` (max 10 per user). Users never enter SMTP details. Sent mail is viewable in the Ethereal web inbox with the sender's credentials.

### OAuth apps

- Google: create a Web OAuth client and add `GOOGLE_CALLBACK_URL` as an authorized redirect URI.
- Slack: create an app with the `incoming-webhook` scope, turn on Public Distribution, and add `SLACK_REDIRECT_URI` as a redirect URL.

## How it works

```
POST /emails/schedule
   -> validate, check sender ownership, reserve daily quota
   -> insert one row per recipient (MySQL, status=scheduled)
   -> add one BullMQ delayed job per row (jobId = row id)
   -> index rows in Elasticsearch (best effort)

Worker (separate process)
   pacing claim  ->  hourly window check  ->  scheduled->sending guard  ->  sendMail  ->  sent
```

- **Scheduling:** one delayed job per email. Recipients in a batch are spaced by the requested delay: `scheduledAt = startAt + i * delay`. There is no cron, no repeatable job and no polling loop.
- **Persistence:** jobs live in Redis and rows in MySQL. After a restart BullMQ resumes the delayed jobs. On boot the API and the worker also re-add every `scheduled` row with `jobId = row id`, which BullMQ dedupes. This covers a crash between the DB insert and the enqueue.
- **Idempotency:** three layers. The job id equals the email id, so re-adding is a no-op. The worker claims the row with `UPDATE ... WHERE status = 'scheduled'`, so only one attempt proceeds. After a successful `sendMail` the row is never reset, so a database failure cannot cause a retry and a second send. A worker crash mid-send marks the row `failed` (at-most-once). `POST /emails/schedule` also accepts an `Idempotency-Key` header, and a repeat returns 409.
- **Concurrency:** `WORKER_CONCURRENCY` jobs run in parallel per worker. All shared state (pacing, hourly counters) is in Redis and updated atomically, so several workers are safe.

### Delay between sends

Minimum 2 seconds per sender (`MIN_DELAY_BETWEEN_SENDS_MS`). A request can ask for a longer delay, never a shorter one. The worker claims a per-sender slot with `SET key NX PX <delay>`. If the slot is taken the job is moved back to the delayed set for the remaining time, and it does not use an hourly slot.

### Hourly rate limit

- Counter key: `rl:<senderId>:<YYYYMMDDHH>` in UTC. `SET NX EX` and `INCR` run in one Redis transaction, so the counter always has a TTL and works across workers and instances.
- The limit is `MAX_EMAILS_PER_HOUR_PER_SENDER` by default. A request can lower it for its own batch, never raise it above the sender's cap.
- When the counter passes the limit the job is moved to the next UTC hour boundary with `moveToDelayed`. It is never dropped and never marked failed. Deferred jobs land on the boundary plus 1 ms per second of their original due time, so they keep their relative order (best effort, as the brief allows).
- Trade-off: a fixed window allows a burst at the boundary (a full quota at 10:59 and again at 11:00). A sliding window is smoother but has no clean "next window" to reschedule into.

### Behaviour under load

1000 emails for the same instant with a limit of 50 per hour:
- All 1000 rows and jobs are created up front (one batch insert, one bulk enqueue).
- Each sender is paced to one email per delay. The first 50 in the hour send. Every later job hits the limit and is moved to the start of the next hour. Nothing is dropped, and one Slack alert is sent per sender per hour.
- Each following hour releases the next 50, in order, until the queue drains.
- Load stays bounded by Redis: two small keys per sender per hour, independent of the number of emails.

### Slack alert

`Connect Slack` runs a real OAuth v2 install and stores the incoming webhook per user. When a sender first hits its hourly limit in a window, the worker posts a live message to that user's channel (5 second timeout, never throws, once per sender per hour). Without a connection the alert is skipped. Connecting later works immediately, and `POST /auth/slack/disconnect` removes it.

### Search

Elasticsearch is a projection. Emails are indexed when scheduled and re-indexed on every status change. A failure to index never blocks a send. `GET /emails/search` asks Elasticsearch which ids match (filtered to the caller's senders), then returns the rows from MySQL, so MySQL stays the source of truth.

## API

All routes except `/health` and `/auth/*` need the session cookie. Every query is scoped to the logged-in user.

| Method and path | Purpose |
|---|---|
| `GET /auth/google`, `/auth/google/callback` | Google login |
| `GET /auth/me`, `POST /auth/logout` | Current user, logout |
| `GET /auth/slack`, `/auth/slack/callback` | Slack install |
| `GET /auth/slack/status`, `POST /auth/slack/disconnect` | Slack state |
| `GET /senders`, `POST /senders` | List senders, create an Ethereal sender |
| `POST /emails/schedule` | Schedule a batch: `senderId, subject, body (HTML), recipients[], startAt?, delayBetweenSendsMs?, hourlyLimit?` |
| `GET /emails/scheduled`, `GET /emails/sent?status=` | Paginated lists (`page`, `pageSize`) |
| `GET /emails/counts` | Sidebar counts |
| `GET /emails/:id` | One email with its full body |
| `GET /emails/search?q=` | Search |
| `GET /health` | Liveness |

## Security and limits

- httpOnly `SameSite=Lax` session cookie, JWT pinned to HS256, OAuth state cookie, `helmet`, CORS locked to `FRONTEND_URL`.
- Redis-backed request rate limits: 300 requests per minute on reads, 20 per minute on schedule, 10 sender creations per hour, 30 login attempts per 15 minutes.
- Per-user daily quota, 5000 recipients per request, 1 MB request body limit.
- Senders can only be Ethereal accounts, so there is no user-supplied SMTP host.

## Tests, CI and Docker

```bash
cd backend
npm test          # migrates a courier_test database, then runs 25 tests
npm run typecheck # src and tests
```

The tests run against real MySQL, Redis and Elasticsearch (from `docker compose up -d`), a fake local SMTP server and a fake Slack webhook. They cover access control and tenant isolation, validation, batch scheduling, quota and idempotency, exactly-once sending, retries, failure handling, worker restarts, lost-job recovery, the hourly limit with in-order deferral, and the Slack alert.

GitHub Actions (`.github/workflows/backend-ci.yml`) runs typecheck, build, a production dependency audit and the tests against service containers. On `main` it also builds `backend/Dockerfile` and pushes it to GHCR. The same image runs the API (`node dist/server.js`) and the worker (`node dist/worker.js`). The image contains no Prisma CLI, so run `npx prisma migrate deploy` from the repo or a CI step against the target database before starting a new version.

## Deploying

Run the same image twice: the API (`node dist/server.js`) and the worker (`node dist/worker.js`). Both need the same environment. Backing services: MySQL 8, Redis 7 or newer, Elasticsearch 8. Run `npx prisma migrate deploy` from the repo or CI against the target database before the first start, then start the API, then the worker.

Checklist:
1. Set every variable in `backend/.env.example` on both processes. `JWT_SECRET` needs 32+ characters and `BULLBOARD_PASSWORD` 12+. Set `FRONTEND_URL` to the deployed frontend and `TRUST_PROXY_HOPS` to the number of proxies in front of the API.
2. Add the production callback URLs (`GOOGLE_CALLBACK_URL`, `SLACK_REDIRECT_URI`) to the Google and Slack app consoles.
3. Serve the frontend and API on one site, for example by proxying `/api` and `/auth` to the API, so the `SameSite=Lax` cookie is sent.
4. Recreate the Elasticsearch index if one already exists from before the explicit mapping.
5. Check `GET /health`, load `/admin/queues`, log in with Google, schedule an email, restart the worker before it is due, and trigger one rate-limit alert.

## Assumptions and trade-offs

- The body is stored once per recipient row. A separate campaign table would save space but needs more schema.
- Cookies are `SameSite=Lax`, so the frontend and API must share a site in production (for example the frontend proxying `/api`).
- Existing Elasticsearch indices created before the explicit mapping must be deleted and recreated.
