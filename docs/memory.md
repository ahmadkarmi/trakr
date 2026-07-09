# Decision Log

Running log of engineering decisions (newest first). One entry per decision: date, what, why.

## 2026-07-09 — Node toolchain aligned on 22.x
- **Node 20 hit EOL 2026-04-30**; CI was still on it while Vercel production builds ran 22.x and local dev ran 24 — three majors across one pipeline. CI/`.nvmrc`/engines moved to 22 to match what actually builds production; zero infra changes needed.
- **Vercel build Node version is now code-reviewed**: `apps/web/package.json` `engines: { node: "22.x" }` (Vercel reads engines at its rootDirectory). Deliberately **bounded** — Vercel auto-upgrades unbounded ranges (`>=22`) to new majors on its own schedule.
- **Unit tests restore Node-native fetch-stack classes** (`src/tests/realmFix.ts`, first import of setupTests): vitest-jsdom shadows AbortController/Blob/File/FormData with jsdom-realm classes that Node's undici fetch rejects (v7 brand-checks signals; jsdom FormData string-coerces to text/plain). Keep the fetch stack single-realm; tests green on Node 20/22/24 alike.
- This unblocks `@supabase/supabase-js` 2.58→2.110 (Node 22+ floor via realtime-js native WebSocket; app uses no realtime) and the Dependabot minor/patch group stalled since PR #73.

## 2026-07-09 — Storage upload RLS regression (found by the revived integration tests)
- The 2026-07-03 storage hardening dropped all SELECT policies on `storage.objects` ("reads go via public URLs") — but the storage upload path needs SELECT on the row it inserts, so **every authenticated upload failed in production since then**. Restored as `app_media_select`, SELECT **to authenticated only**, scoped to the two media buckets (anon enumeration stays blocked). Migration `20260709194139`.
- **Lesson**: e2e has zero upload coverage; the vitest storage suites that would have caught this were invisibly broken (skipped in CI, transport-dead locally). When a test suite is "always failing/skipped", it's masking real bugs, not just being noisy.

## 2026-07-09 — QA sandbox findings
- **Persisted query cache must stay JSON-safe**: `main.tsx` persists the entire React Query cache to `localStorage` via `JSON.stringify` (`PersistQueryClientProvider`). Non-serializable query data (`Set`, `Map`, `Date`, class instances) silently corrupts on the round-trip (`Set` → `{}`), and with `staleTime: Infinity` never self-heals. Store plain arrays/objects in queries; derive `Set`/`Map` with `useMemo` outside the cache. Found via a `derivedReadIds.has is not a function` error-boundary crash in `useNotifications.ts`.
- **Enum casts in SQL functions are explicit**: Postgres implicitly casts a bare `'LITERAL'` to an enum column but *not* a `COALESCE(...)` expression result — `handle_new_user()` had failed on every fresh `auth.users` insert (the app's first-login auto-provision path) until `::user_role` was added (migration `20260709124151`).
- **QA sandbox org added** ("Trakr QA Sandbox", `scripts/seed-qa-org.mjs` + `scripts/qa-smoke.mjs`): persistent per-role accounts and all-six-status audit data for browser QA. Both bugs above were invisible to `tsc`, unit tests, and the e2e suite — surfaced only by exercising real screens with varied data.

## 2026-07-03 — Production cleanup baseline
- **Trunk-based flow adopted**: protected `main`, short-lived branches, squash merges, CI (`ci.yml`) + E2E (`e2e.yml`) gates. Scratch files never land at root.
- **E2E serialized** via `e2e-shared-db` concurrency group — the suite seeds/mutates one shared database; concurrent runs corrupt each other (proven 2026-07-03). Follow-up: dedicated test project.
- **Migration discipline**: repo `supabase/migrations/` mirrors live `schema_migrations` stamps exactly; every schema change ships as migration + regenerated types in one commit.
- **`apps/mobile` removed** (parked in git history) — web PWA covers mobile until a native app is a priority.
- **Lint debt**: 531 pre-existing `no-explicit-any` errors; CI lint step is advisory until burned down.
- **Seeder invariant**: `seed-with-credentials.js` must link `users.auth_user_id` after recreating rows — unlinked rows are invisible to their own session under RLS.
