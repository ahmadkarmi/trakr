# Decision Log

Running log of engineering decisions (newest first). One entry per decision: date, what, why.

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
