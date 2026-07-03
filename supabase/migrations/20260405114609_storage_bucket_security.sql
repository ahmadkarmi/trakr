-- Restrict file uploads: 10 MB max, images only
-- (Recovered from live supabase_migrations.schema_migrations — applied 2026-04-05.)
UPDATE storage.buckets
SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
WHERE id IN ('audit-photos', 'profile-media');
