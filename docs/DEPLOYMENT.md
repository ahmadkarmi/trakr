# Trakr Deployment

## 1. Environments

| Environment | Web | Database |
|---|---|---|
| Production | Vercel project `trakr-web`, auto-deploy from `main` | Supabase `prxvzfrjpzoguwqbpchj` (eu-central-1) |
| Preview | Vercel preview per PR/branch push | Same Supabase project (no per-preview DB) |
| CI (e2e) | Vite dev server on the runner | Shared Supabase test DB (`E2E_*` secrets) — runs serialized |
| Local | `npm run dev:web` | Supabase project via `.env.local` |

There is one live Supabase project; previews and e2e share infrastructure. Treat schema changes as production changes.

## 2. Environment Variable Matrix

### Vercel (build-time, `apps/web`)
| Var | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | yes | Public anon key (RLS-protected) |
| `VITE_BACKEND` | yes (`supabase`) | Selects real backend over mock |
| `VITE_SENTRY_DSN` | optional | Enables Sentry error tracking |
| `SENTRY_AUTH_TOKEN` | optional | Build-time sourcemap upload |

### GitHub Actions secrets
| Secret | Used by |
|---|---|
| `E2E_SUPABASE_URL` / `E2E_SUPABASE_ANON_KEY` / `E2E_SUPABASE_SERVICE_KEY` | `e2e.yml` (build, seed, Playwright) |
| `SUPABASE_DB_URL` | `database-backup.yml` (pg_dump connection string) |
| `SLACK_WEBHOOK_URL` | `synthetic-uptime.yml` failure alerts |
| `SYNTHETIC_SUPABASE_URL` / `SYNTHETIC_SUPABASE_ANON_KEY` | `synthetic-uptime.yml` auth check |
| `BACKUP_REPO_URL` / `BACKUP_SSH_KEY` | `backup-mirror.yml` (optional repo mirror) |

### Supabase edge function secrets
| Secret | Function | Notes |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | all | Auto-provided by platform |
| `RESEND_API_KEY` | `invite-user-resend` | Branded invite emails; the function returns 503 if unset |
| `LOG_ALERT_SLACK_WEBHOOK` | `log-alert-forwarder` | Slack alert target |

## 3. Deploy Pipeline

```
PR opened ──► CI: ci.yml (type-check + vitest + build, blocking; lint advisory)
          ──► CI: e2e.yml (Playwright vs shared DB; concurrency group
              "e2e-shared-db" serializes runs, no cancel-in-progress)
          ──► Vercel preview deployment
merge to main ──► Vercel production deploy (trakr-web)
```

- `apps/web/vercel.json` ships security headers (CSP restricted to self + `*.supabase.co`, `X-Frame-Options: DENY`, nosniff, referrer/permissions policies), immutable caching for `/assets/*`, and SPA fallback rewrites to `index.html`.
- No build step runs migrations or touches Supabase — schema and functions deploy separately (below).

## 4. Database Migrations

Rule going forward: every schema change is a file in `supabase/migrations/` AND is applied to the live project, so repo history == live migration history.

Procedure:
1. Write `supabase/migrations/<timestamp>_<name>.sql`.
2. Apply to live: `supabase db push` (linked CLI) or Supabase MCP `apply_migration`.
3. Verify with `supabase migration list` (repo and remote must match).
4. Regenerate types if the schema changed: `packages/shared/src/db/types.ts`.
5. Commit migration + type changes together.

Edge functions deploy via `supabase functions deploy <name>` (see `supabase/functions/DEPLOY.md`).

## 5. Scheduled Operations

| Workflow | Schedule | Action |
|---|---|---|
| `database-backup.yml` | daily 03:00 UTC | Full `pg_dump` (gzip) → GitHub artifact, 90-day retention; schema-only dump committed to `database/backups/schemas/latest-schema.sql` |
| `backup-mirror.yml` | daily 02:00 UTC + pushes | Mirrors repo to backup remote (if secrets set); tarball artifact, 90-day retention |
| `synthetic-uptime.yml` | every 5 min | `scripts/check-uptime.mjs` against login page + Supabase; Slack alert on failure. `SYNTHETIC_LOGIN_URL` is hardcoded in the workflow and still points at the legacy `trakr-mobile.vercel.app` domain — update on domain change |
| pg_cron (in-DB) | weekly | Invokes `schedule-weekly-audits` to generate audit instances |

## 6. Backup / Restore

- Strategy, retention, and restore drill: `docs/BACKUP_STRATEGY.md`.
- Point-in-time sources: nightly full-dump artifacts (90 days) + committed schema snapshot + Supabase's own platform backups.
- Restore is a manual operation (download artifact, `psql < dump`) — verify RLS helper functions and triggers post-restore.
