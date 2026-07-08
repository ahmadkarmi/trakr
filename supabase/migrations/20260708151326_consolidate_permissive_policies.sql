-- ============================================================================
-- Consolidate redundant permissive RLS policies flagged by the performance
-- advisor. Both changes are provably behavior-preserving (verified before
-- writing this migration, not just by inspection):
--
-- app_config: app_config_admin_write (FOR ALL) overlaps app_config_read
-- (FOR SELECT) on every SELECT query. Postgres policies can't exclude one
-- command from a FOR ALL policy via a list, so admin_write is split into
-- three single-command policies (INSERT/UPDATE/DELETE) with the identical
-- condition — this removes the SELECT overlap without touching write
-- protection at all. app_config_read is untouched (still open to any
-- authenticated user, per the 2026-07-03 hardening's deliberate
-- public-read design).
--
-- zone_assignments: zone_assignments_write_admin (FOR ALL) checks
-- "is_admin() AND the assignment's zone belongs to the admin's org" via a
-- JOIN through zones. Each of the four existing per-operation policies
-- (_select/_insert/_update/_delete_policy) already checks
-- "is_super_admin() OR (is_admin_or_super() AND row.org_id =
-- current_user_org_id())" — a strictly broader condition (is_admin_or_super
-- >= is_admin, and includes super_admin). Verified zone.org_id always
-- equals zone_assignments.org_id for every existing row (0 mismatches),
-- so write_admin grants no access the per-op policies don't already grant.
-- Dropped outright — no replacement needed.
-- ============================================================================

DROP POLICY IF EXISTS app_config_admin_write ON public.app_config;

CREATE POLICY app_config_admin_insert ON public.app_config
  FOR INSERT
  WITH CHECK (is_admin_or_super());

CREATE POLICY app_config_admin_update ON public.app_config
  FOR UPDATE
  USING (is_admin_or_super())
  WITH CHECK (is_admin_or_super());

CREATE POLICY app_config_admin_delete ON public.app_config
  FOR DELETE
  USING (is_admin_or_super());

DROP POLICY IF EXISTS zone_assignments_write_admin ON public.zone_assignments;
