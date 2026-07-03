# Decision Log

Running log of engineering decisions (newest first). One entry per decision: date, what, why.

## 2026-07-03 — Production cleanup baseline
- **Trunk-based flow adopted**: protected `main`, short-lived branches, squash merges, CI (`ci.yml`) + E2E (`e2e.yml`) gates. Scratch files never land at root.
- **E2E serialized** via `e2e-shared-db` concurrency group — the suite seeds/mutates one shared database; concurrent runs corrupt each other (proven 2026-07-03). Follow-up: dedicated test project.
- **Migration discipline**: repo `supabase/migrations/` mirrors live `schema_migrations` stamps exactly; every schema change ships as migration + regenerated types in one commit.
- **`apps/mobile` removed** (parked in git history) — web PWA covers mobile until a native app is a priority.
- **Lint debt**: 531 pre-existing `no-explicit-any` errors; CI lint step is advisory until burned down.
- **Seeder invariant**: `seed-with-credentials.js` must link `users.auth_user_id` after recreating rows — unlinked rows are invisible to their own session under RLS.
