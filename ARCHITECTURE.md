# Trakr Architecture

> Multi-tenant audit management SaaS. React SPA on Vercel; all backend concerns (auth, data, storage, functions, cron) on Supabase.

## 1. System Overview

```
                         ┌──────────────────────────────┐
                         │   Browser (React 18 SPA)     │
                         │   Vite 7 · Tailwind ·        │
                         │   Zustand · TanStack Query   │
                         └───────┬──────────────┬───────┘
                                 │              │ errors
                    HTTPS (anon key + JWT)      ▼
                                 │        ┌──────────┐
        ┌────────────────────────┼──────► │  Sentry  │
        │      Vercel (static    │        └──────────┘
        │      hosting, CSP,     │
        │      SPA rewrites)     │
        ▼                        ▼
┌───────────────────────────────────────────────────────┐
│ Supabase project prxvzfrjpzoguwqbpchj (eu-central-1)  │
│                                                       │
│  Auth (GoTrue) ──trigger──► public.users              │
│  PostgREST ──► Postgres (RLS on every public table)   │
│  Storage: audit-photos, profile-media                 │
│  Edge Functions: invite-user, invite-user-resend,     │
│    schedule-weekly-audits, org-export,                │
│    log-alert-forwarder                                │
│  pg_cron ──► weekly audit scheduling                  │
└───────────────────────────────────────────────────────┘
        ▲
        │ nightly pg_dump / Playwright e2e / synthetic checks
┌───────┴────────────┐
│  GitHub Actions    │
└────────────────────┘
```

## 2. Monorepo Map (npm workspaces)

```
Trakr/
├── apps/
│   └── web/              # React 18 + Vite 7 + Tailwind + Zustand + TanStack Query + React Router v6
├── packages/
│   └── shared/           # @trakr/shared: TypeScript types, DB row types, business rules (scoring)
├── supabase/
│   ├── migrations/       # 92 SQL migrations — source of truth for schema
│   └── functions/        # 5 Deno edge functions + _shared helpers
└── docs/                 # Living docs (BACKUP_STRATEGY.md, agents/, ...)
```

`apps/mobile` (React Native/Expo) is removed; it remains available in git history only. Root README references to it are stale.

## 3. Auth & Invite Flow

### Sign-in
1. `supabase.auth.signInWithPassword` (or magic-link: `verifyOtp` with `token_hash` handled in `useAuthStore.init`, which then strips the token from the URL).
2. Client hydrates the app profile from `public.users` with retry (`fetchAppUserWithRetry`, up to 6 attempts) to tolerate the trigger race on first login.
3. Zustand store (`apps/web/src/stores/auth.ts`) persists `{user, isAuthenticated}` to localStorage key `trakr-auth`; `onAuthStateChange` keeps it in sync and surfaces a session-expiry error on non-manual sign-out. Sentry user context set on login, cleared on logout.

### Profile provisioning
`handle_new_user` trigger on `auth.users` inserts a `public.users` row with:
- `auth_user_id = NEW.id`
- `full_name` from `raw_user_meta_data` (`full_name` or `name`)
- `role` from metadata, default `AUDITOR`
- `org_id` from metadata

### Invites
- `invite-user` edge function: verifies caller is ADMIN/SUPER_ADMIN, scopes invite to the caller's org, rate-limits, then `auth.admin.inviteUserByEmail(email, { data: { name, role, org_id } })`. Supabase sends the email; the trigger creates the profile row.
- `invite-user-resend`: generates a magic link (`auth.admin.generateLink`) and sends a branded email via Resend (requires `RESEND_API_KEY`).

## 4. Multi-Tenancy & RLS

- Role hierarchy: `SUPER_ADMIN` > `ADMIN` > `BRANCH_MANAGER` > `AUDITOR`.
- Every tenant table carries `org_id`; RLS is enabled on all public tables.
- Client queries also filter by org (`effectiveOrgId`) for defense in depth; RLS is the enforcement boundary.

The authoritative policy set is the `20251020163018..163336_comprehensive_rls_refactor_part1..part7` migration series (helpers, core tables, surveys, audits, assignments/zones, notifications/logs, auth-mapping validation), plus later hardening (`20251013_rls_restrictive_hardening`, `20251117010500_security_hardening`). Earlier `dev_mode` OR-clauses described in the README are legacy.

`SECURITY DEFINER` helper predicates (search_path pinned, avoid RLS recursion), defined in refactor part 1:

| Function | Purpose |
|---|---|
| `current_user_id()` | `public.users.id` for `auth.uid()` (matches `auth_user_id` or `id`) |
| `current_user_org_id()` | Caller's org |
| `current_user_role()` | Caller's role |
| `is_super_admin()` / `is_admin_or_super()` | Role checks |
| `user_assigned_branch_ids()` | Auditor's assigned branches |
| `user_managed_branch_ids()` | Branch manager's branches |
| `can_manage_auditor_assignment(uuid)` | Assignment write guard |

Access pattern: SUPER_ADMIN crosses org boundaries; ADMIN full read/write within own org; BRANCH_MANAGER reads org data, approves/rejects audits for managed branches; AUDITOR reads org data, writes only own assigned audits while editable.

## 5. Audit State Machine

```
DRAFT → IN_PROGRESS → COMPLETED → SUBMITTED → APPROVED
                                      │  ▲
                                      ▼  │ (resubmit)
                                   REJECTED
```

Enum: `DRAFT, IN_PROGRESS, COMPLETED, SUBMITTED, APPROVED, REJECTED`. No `FINALIZED` (removed as dead code).

**Transition table (from → to · who · sanctioned path · enforcement).** The DB is the source of truth; the client hook mirrors it for UX.

| From | To | Who | Sanctioned path | DB enforcement |
|---|---|---|---|---|
| DRAFT | IN_PROGRESS | assigned auditor | `saveAuditProgress` (raw UPDATE) | `enforce_audit_status_transition` trigger allows AUDITOR → {DRAFT,IN_PROGRESS,COMPLETED} |
| IN_PROGRESS | COMPLETED | assigned auditor | `setAuditStatus` (raw UPDATE, filtered from DRAFT/IN_PROGRESS) | same trigger |
| DRAFT/IN_PROGRESS/COMPLETED | SUBMITTED | assigned auditor or admin | `submit_audit` RPC (SECURITY DEFINER) | RPC: org + assignee/admin check; `submitted_by` from `auth.uid()`. Raw client `→SUBMITTED` is **blocked** by the trigger |
| SUBMITTED | APPROVED | assigned branch manager or admin (never the auditor) | `set_audit_approval('approved')` RPC | RPC: org + assigned-BM/admin, own-auditor block, `WHERE status='SUBMITTED'` (race guard). Raw client status write **blocked** by the trigger |
| SUBMITTED | REJECTED | assigned branch manager or admin | `set_audit_approval('rejected')` RPC | same RPC guards |
| REJECTED | IN_PROGRESS | assigned auditor | `saveAuditProgress` (resubmit edit) | trigger allows AUDITOR → editable states |

- **The only sanctioned status-transition paths are `submit_audit` and `set_audit_approval`.** Raw client `status` writes are constrained by the `enforce_audit_status_transition` trigger (SECURITY INVOKER, migration `20260722094148`): an AUDITOR may reach only {DRAFT,IN_PROGRESS,COMPLETED}; ADMIN/SUPER_ADMIN pass; the SECURITY DEFINER RPCs and service_role pass (they run as `postgres`). This closes the auditor-self-approve and BM-raw-rewrite vectors (a raw `WITH CHECK` can't see `OLD.status`).
- Client single source of truth: `apps/web/src/hooks/useAuditStateMachine.ts` maps (status, role, completion%) → permissions (canEdit/canSubmit/canDelete/canReopen + guidance). Auditor submit requires 100% completion; SUBMITTED/APPROVED are read-only client-side. Rejection data is preserved on later approval.
- Negative regression net: `apps/web/tests/audit.illegal-transitions.spec.ts` (auditor self-approve/self-submit blocked, BM raw rewrite of APPROVED blocked, non-BM RPC approval denied) and `audit.rpc-authorization.spec.ts` (RPC org/assignee authz); the happy path is `audit.approval-flow.spec.ts` (incl. the double-approval race guard).

## 6. Data Model Highlights

| Table | Notes |
|---|---|
| `organizations` | Tenant root; `time_zone`, `week_starts_on`, gating policy, feature flags (`org_config`) |
| `users` | App profile; `auth_user_id` → `auth.users.id`; `role`, `org_id`, `branch_id`, avatar/signature |
| `branches` | `org_id`, optional `manager_id`, `is_active` (activation guard) |
| `zones` / `zone_branches` | Branch groupings for assignment |
| `surveys` / `survey_sections` / `survey_questions` | Templates; versioning + publish flow (`publish_survey_version`); `applicable_branch_ids` |
| `audits` | `org_id`, `branch_id`, `survey_id`, `assigned_to`, `status`, responses, section photos, override columns, provenance (creator/source) |
| `auditor_assignments` / `branch_manager_assignments` | Branch scoping per role |
| `notifications` | Actionable, owner-only update; admin/super-admin visibility rules |
| `activity_logs` | Structured audit trail, org-scoped reads |

Scoring: weighted-only compliance via `calculateWeightedAuditScore()` in `@trakr/shared`; unweighted is deprecated. Photo evidence is section-level (per-question photos deprecated).

## 7. Storage

- Buckets: `audit-photos`, `profile-media` — **private** (org-partitioned), 10MB object limit. A public bucket is internet-readable regardless of RLS, so both were privatized (migrations `20260722110610`, `20260722123651`).
- Paths encode the owning entity so `storage.objects` policies can org-scope: `audit-photos` → `audits/<auditId>/…`; `profile-media` → `<avatars|signatures>/<userId>/…`.
- Access: `audit_photos_*` policies gate on `storage_audit_in_my_org()` (org membership); `profile_media_*` gate on same-org **read** / own-only **write** (`current_user_id()`). Both helpers are SECURITY DEFINER (bypass row-RLS to check org), search_path-pinned, anon EXECUTE revoked.
- Reads: the app stores the object **path** and mints a short-lived **signed URL** on read via `utils/signedUrls.ts` + `useSignedUrl` + `<SignedImage>` (signed at display time, not fetch time — the persisted React Query cache would otherwise store expired URLs). `data:`/`blob:`/`http` values pass through untouched. The PDF signs inline before embedding.

## 8. Edge Functions (`supabase/functions/`)

| Function | JWT | Purpose |
|---|---|---|
| `invite-user` | yes | Admin-only invite: org scoping, rate limit, `inviteUserByEmail`; profile row via trigger |
| `invite-user-resend` | yes | Regenerate invite magic link, send via Resend |
| `schedule-weekly-audits` | no | Creates the week's audit instances per org (org timezone + `week_starts_on`); invoked by pg_cron and manually; supports `dry_run` |
| `org-export` | yes | Org-scoped export of audits/branches/zones/users for admins |
| `log-alert-forwarder` | no | Receives Supabase log webhooks, forwards to Slack (`LOG_ALERT_SLACK_WEBHOOK`) |
| `_shared` | — | Shared CORS helpers |

## 9. Error Tracking

- Sentry in the web app (`apps/web/src/utils/sentry.ts`): enabled when `VITE_SENTRY_DSN` is set; user context (id/email/role/orgId) set on login, cleared on sign-out.
- Release sourcemaps uploaded at build time when `SENTRY_AUTH_TOKEN` is present.
- Supabase-side errors surface via `log-alert-forwarder` → Slack.

## 10. Performance Notes

- Known issue: vendor bundle is ~8.5MB — needs chunk splitting / dependency audit before scale.
- Mitigations in place: route-level lazy loading with role-based dashboard chunk preloading (`preloadDashboardChunk` on sign-in); immutable caching for `/assets/*` via `vercel.json`.
- E2E suite runs against a single shared Supabase DB, so CI runs are serialized (see DEPLOYMENT.md).
