-- Cross-user notification inserts (auditor submitting -> notify manager, and
-- every other same-org notification) failed with RLS 42501 even though the
-- policy expression provably allows them: the expression evaluates TRUE when
-- tested standalone and a byte-identical policy object (same nodetree md5)
-- created fresh passes where the existing object fails. Long-lived pooled
-- backends (PostgREST / pgbouncer) appear to hold a stale cached evaluation
-- of the policy predating the 2026-07-08 ALTER POLICY initplan rewrap.
-- DROP + CREATE fires a real relcache invalidation for the relation across
-- all backends, flushing whatever stale state they hold. The expression
-- below is intentionally IDENTICAL to the existing one - this migration is
-- a cache flush, not a semantic change.
--
-- POST-HOC NOTE (same day): the stale-cache hypothesis above was wrong; this
-- migration is a semantic no-op kept for stamp parity. The real culprit was
-- the client chaining .select() onto the insert - INSERT ... RETURNING also
-- requires the new row to satisfy the SELECT policy (user_id =
-- current_user_id()), which a cross-user send never can. Fixed client-side
-- by dropping the unused RETURNING. See docs/memory.md 2026-07-10.
DROP POLICY notifications_insert_policy ON public.notifications;
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
    OR (EXISTS ( SELECT 1
       FROM (public.users sender
         JOIN public.users recipient ON ((recipient.org_id = sender.org_id)))
      WHERE (((sender.auth_user_id = ( SELECT auth.uid() AS uid)) OR (sender.id = ( SELECT auth.uid() AS uid))) AND (recipient.id = notifications.user_id))))
  );
