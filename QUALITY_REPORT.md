# Quality report: Courier

Branch: `chore/repo-quality-pass`. No behavior or public API changes.

## Baseline vs. final

MySQL and Elasticsearch are not available in this environment, so the API and scheduler integration suites (`api.test.ts`, `scheduler.test.ts`) could **not** be run before or after. Everything below was run against a local Redis.

| | Baseline | Final |
|---|---|---|
| Backend tests runnable here | 1 file / 7 passed (`unit.test.ts`) | 3 files / 28 passed |
| Backend integration tests | not run (need MySQL + Elasticsearch) | not run |
| Coverage | no coverage tool; not measured | not measured |
| Backend lint | none configured | ESLint: clean |
| Frontend lint | none configured | ESLint: clean |
| Backend typecheck / build | clean | clean |
| Frontend build | passes | passes |
| `npm audit` (backend) | 9 vulns (6 high, 3 moderate) | 7 (6 high, 1 moderate) |
| `npm audit` (frontend) | 3 (1 critical, 2 high) | 0 |

## Changes by phase

**Phase 1:** `docs/ARCHITECTURE.md`.

**Phase 2:** new backend tests: `redis-limits.test.ts` (hourly window and deferral, alert dedupe, daily quota rollback/release, send pacing incl. concurrent claim, idempotency keys) and `auth-unit.test.ts` (JWT round trip, tampering, expiry, `alg:none`/HS512 rejection, Bull Board Basic auth incl. timing-safe compare cases).

**Phase 3:** ESLint (typescript-eslint, plus react-hooks on the frontend) with `lint` scripts in both packages; lint step added to both CI workflows. The code was already lint-clean, so no source changes were needed.

**Phase 4:** secrets scan found nothing hardcoded (`.env` files are ignored; only `.env.example` files are tracked). Email HTML rendered in the dashboard is sanitized with DOMPurify. Prisma access is through the typed client (no raw SQL). Updated within semver ranges: frontend `dompurify` (critical), `vite`; backend `express`, `nodemailer`, `smtp-server`.

**Phase 5:** README: lint command, how to run the Redis-only tests, contributing section. CI, `.gitignore`, Dockerfile and compose files already existed and were left as is.

## Bugs found

None.

## Needs human review / skipped

- **Integration tests not run.** The `express` 5.3, `nodemailer` 10.2 and `smtp-server` 3.21 updates were checked with typecheck, build, lint and the Redis-backed tests only. Let CI's backend job (MySQL + Redis + Elasticsearch) confirm before merging.
- Remaining backend audit items: `prisma` 6 to 7 and `zod` 3 to 4 are major upgrades (not applied); `body-parser`, `undici` and `ip-address` are transitive and still flagged after updating `express`; recheck with a newer lockfile resolution. CI only fails on critical production advisories.
- No frontend test runner exists; the frontend (compose editor, CSV import, polling) is untested. Adding Vitest + Testing Library is the obvious next step; `lib/format.ts` and the recipient/CSV parsing in `ComposePage.tsx` are good first targets.
- No coverage tooling for the Node test runner (`node --test --experimental-test-coverage` could be added).
- No formatter (Prettier) was added to avoid reformatting every file.
- `prisma migrate deploy` is part of the test script and will modify whatever `DATABASE_URL` points to; default points at `courier_test`.

## Next steps

Run the full suite in CI and review the dependency bumps; add frontend tests; add coverage reporting; plan Prisma 7 and zod 4 upgrades; consider Dependabot.
