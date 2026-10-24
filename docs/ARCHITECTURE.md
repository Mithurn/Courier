# Architecture

Courier schedules emails at exact timestamps. MySQL is the source of truth, Redis
(BullMQ) holds the delayed jobs and rate-limit counters, and Elasticsearch is a
read projection used only for search.

```
React dashboard (Vite)  ->  Express API  ->  MySQL (Prisma)
                                |   \
                                |    -> Elasticsearch (search projection)
                                v
                          Redis / BullMQ  ->  Worker process  ->  SMTP
```

The API (`backend/src/server.ts`) and the worker (`backend/src/worker.ts`) are
separate processes that share the same code and database.

## Backend (`backend/`)

| Area | Files | Role |
|---|---|---|
| HTTP | `app.ts`, `routes/emails.ts`, `routes/senders.ts`, `auth/routes.ts`, `openapi.ts` | Express 5 app with helmet, CORS limited to `FRONTEND_URL`, JSON body limit 5 MB, Swagger UI at `/docs`, Bull Board behind Basic auth |
| Auth | `auth/google.ts`, `auth/session.ts`, `auth/middleware.ts`, `auth/slack.ts` | Google OAuth code flow; HS256 JWT in an httpOnly cookie (7 days); Slack OAuth v2 for rate-limit alerts |
| Scheduling | `services/schedule-email.service.ts`, `queues/email-queue.ts`, `idempotency.ts` | Validates a request (recipients, start time, limits), writes one `ScheduledEmail` row per recipient and adds one delayed BullMQ job per row with `jobId = email.id`. An `Idempotency-Key` header makes retried requests safe |
| Worker | `worker.ts`, `mailer.ts`, `send-pacing.ts`, `rate-limit.ts` | Per job: claim the sender's pacing slot (min delay between sends), then the hourly slot (over-limit jobs are deferred to the next UTC hour, ordered by original due time), then send, then mark `sent` with a status-guarded `UPDATE`. Failures retry with backoff; exhausted jobs are marked `failed` |
| Recovery | `services/requeue-scheduled.service.ts` | On boot the worker re-adds every `scheduled` row; existing job ids are skipped, so restarts lose nothing |
| Quotas | `rate-limit.ts` | Per-sender hourly fixed window and per-user daily quota, both atomic Redis counters |
| Search | `es.ts`, `services/email-list.service.ts` | Writes a projection to Elasticsearch; reads fetch matching ids and load canonical rows from MySQL |
| Alerts | `services/slack-notify.service.ts` | One Slack message per sender per hour when a rate limit is hit |
| Data | `prisma/schema.prisma` | `User`, `SlackIntegration`, `Sender`, `ScheduledEmail` (status enum) |
| Config | `env.ts` | Zod-validated environment; the process refuses to start on invalid config |

Delivery is at-most-once per row: a stalled job that may have been mid-send is
failed rather than retried, to avoid duplicate mail.

## Frontend (`frontend/`)

Vite + React 19 + React Router + Tailwind v4. `context/AuthContext` holds the session,
`pages/` has the compose, list and detail screens, `api/` is the typed client, and
`demo/` provides an offline demo mode. The list view polls every 4 seconds. Email
bodies are sanitized with DOMPurify before being rendered.

## Deployment

`docker-compose.yml` runs the backing services locally. `deploy/` holds the production
Compose file, Caddy reverse proxy config and AWS scripts; CI builds and pushes the backend
image and rsyncs the frontend build to the host.

## Testing

Backend tests use Node's built-in runner (`npm test` in `backend/`). `unit.test.ts`,
`auth-unit.test.ts` and `redis-limits.test.ts` need only Redis; `api.test.ts` and
`scheduler.test.ts` also need MySQL and Elasticsearch and start real API and worker
processes against a fake SMTP server.
