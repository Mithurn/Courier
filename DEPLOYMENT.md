# Deployment guide

Two parts. Hand this file to Claude to start or stop the live backend.

| Part | Where | Cost | Always on |
| --- | --- | --- | --- |
| Landing page and `/demo` (sample data, runs in the browser) | Vercel, root directory `frontend` | free | yes |
| Real app (API, worker, MySQL, Redis, Elasticsearch, Google sign-in) | AWS EC2 `Courier` (`t3.medium`, `ap-south-1`) | about $0.05/hour running, disk only while stopped | no, sleeps |

Real app URL: https://mithurnscourier.duckdns.org (Swagger at `/docs`, health at `/api/health`)

## Commands (run from the repo root)

| Do | Command |
| --- | --- |
| Wake the backend (about 2 to 3 minutes, waits until healthy) | `deploy/aws/start.sh` |
| Put it to sleep | `deploy/aws/stop.sh` |
| State and health | `deploy/aws/status.sh` |
| Ship new code to the running server | `deploy/aws/push.sh` |
| Create the server from scratch (one time) | `deploy/aws/up.sh` |

## How it works

- The server is found by the EC2 tag `Name=Courier`. The public IP changes on every start, so a boot service on the server repoints the DuckDNS name `mithurnscourier` (token from SSM `/recoveryops/duckdns`) and brings the containers up.
- Server env lives in the encrypted SSM parameter `/courier/env` (never in git). Code is shipped as a tarball through a private S3 bucket `courier-deploy-<account id>`.
- `deploy/aws/release.sh` runs on the server: pulls the tarball, writes `.env` from SSM, builds the frontend, then runs `deploy/deploy.sh` (migrations, then compose up).
- Change an env var: update `/courier/env` in SSM, then run `deploy/aws/push.sh`.

## Known limits

- The real app's frontend CI (`frontend-deploy.yml`) rsyncs to the `EC2_HOST` secret. Set it to `mithurnscourier.duckdns.org` and expect it to fail while the server sleeps. `push.sh` is the reliable path.
- If the server is asleep, the landing page and `/demo` still work. Only sign-in and real sends need the server.
- Google and Slack OAuth redirect URIs must stay on `https://mithurnscourier.duckdns.org/api/auth/...`.
