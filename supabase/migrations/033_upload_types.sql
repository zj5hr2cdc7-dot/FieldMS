-- ============================================================
-- Restrict what can be uploaded to job-plans and form-attachments.
--
-- Both were created with allowed_mime_types = NULL, which means "accept
-- anything". Anything includes text/html and application/javascript.
--
-- The buckets are private and reached through signed URLs, so an uploaded
-- file is not public — but a signed URL serves from the storage origin, and a
-- browser opening an uploaded .html executes it there. Anyone able to upload
-- to a workspace could therefore run script against the storage origin.
--
-- branding and job-photos were already restricted when they were created.
-- These two were missed.
--
-- Deliberately excluded: text/html, image/svg+xml (SVG carries script), and
-- archives (a zip hides whatever you like).
--
-- Account deletion was originally going to live here as a plpgsql function.
-- It does not: a function body contains semicolons, and the Supabase SQL
-- editor splits pasted input on semicolons, so no multi-statement function
-- can be pasted in safely. The deletion sequence lives in
-- app/api/account/delete/route.ts instead, where it also gets a proper
-- authorisation check. See migration 027 for the first time this bit us.
--
-- Safe to re-run.
-- ============================================================

UPDATE storage.buckets
   SET allowed_mime_types = ARRAY[
         'application/pdf',
         'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/tiff',
         'application/acad', 'image/vnd.dwg', 'image/vnd.dxf',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
       ]
 WHERE id = 'job-plans';

UPDATE storage.buckets
   SET allowed_mime_types = ARRAY[
         'application/pdf',
         'image/png', 'image/jpeg', 'image/webp', 'image/heic',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
       ]
 WHERE id = 'form-attachments';

-- Confirm. Neither row should show NULL.
SELECT id, file_size_limit, allowed_mime_types
  FROM storage.buckets
 WHERE id IN ('job-plans', 'form-attachments', 'job-photos', 'branding');
