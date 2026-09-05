-- ============================================================
-- Storage buckets.
--
-- WHY THIS EXISTS
--   Migrations 006, 012 and 014 each described the bucket they needed and
--   then left the statement COMMENTED OUT, with a note to "run this in the
--   dashboard too". Nobody ever did. The result: lib/branding.ts,
--   lib/job-plans.ts and the photo upload path all call storage.from(...)
--   against buckets that do not exist, and fail with "Bucket not found" the
--   first time a real user tries to upload a logo or a site photo.
--
--   A commented out migration is not a migration. This file actually creates
--   them.
--
-- ACCESS MODEL
--   Every bucket is private. Files are reached through signed URLs, which is
--   what the app already does (createSignedUrl with a one hour expiry).
--   Paths are prefixed with the tenant id, so the policies below scope
--   access to members of that tenant rather than to any signed in user.
--
-- Safe to re-run.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('branding',         'branding',         FALSE,  5 * 1024 * 1024,
     ARRAY['image/png','image/jpeg','image/svg+xml','image/webp']),
  ('job-plans',        'job-plans',        FALSE, 50 * 1024 * 1024, NULL),
  ('job-photos',       'job-photos',       FALSE, 20 * 1024 * 1024,
     ARRAY['image/png','image/jpeg','image/webp','image/heic']),
  ('form-attachments', 'form-attachments', FALSE, 20 * 1024 * 1024, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Policies ────────────────────────────────────────────────
-- The first path segment is the tenant id, e.g. <tenant>/logo-123.png, so
-- membership of that tenant is what grants access. This is stricter than the
-- commented out originals, which would have let any authenticated user of any
-- workspace read every other workspace's files.

DO $storage$
DECLARE
  b TEXT;
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage.objects not present, skipping storage policies';
    RETURN;
  END IF;

  FOREACH b IN ARRAY ARRAY['branding','job-plans','job-photos','form-attachments'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_read');
    EXECUTE format($p$
      CREATE POLICY %I ON storage.objects FOR SELECT
        USING (
          bucket_id = %L
          AND (storage.foldername(name))[1] IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
          )
        )$p$, b || '_read', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_write');
    EXECUTE format($p$
      CREATE POLICY %I ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = %L
          AND (storage.foldername(name))[1] IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
          )
        )$p$, b || '_write', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_update');
    EXECUTE format($p$
      CREATE POLICY %I ON storage.objects FOR UPDATE
        USING (
          bucket_id = %L
          AND (storage.foldername(name))[1] IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
          )
        )$p$, b || '_update', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_delete');
    EXECUTE format($p$
      CREATE POLICY %I ON storage.objects FOR DELETE
        USING (
          bucket_id = %L
          AND (storage.foldername(name))[1] IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
          )
        )$p$, b || '_delete', b);
  END LOOP;
END $storage$;
