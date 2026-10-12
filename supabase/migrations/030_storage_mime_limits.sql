-- ============================================================
-- 030 · Restrict file types on the job-plans and form-attachments buckets
--
-- Both buckets were created in 026 with allowed_mime_types = NULL, which
-- accepts any file at all, including HTML and SVG. Served back from the
-- Supabase storage domain through a signed URL, an uploaded HTML or SVG file
-- runs script on that origin (stored XSS). branding and job-photos were
-- already restricted; this brings the other two into line.
--
-- job-plans:   PDF, raster images, and CAD drawings. DWG and DXF have no
--              single registered MIME type and browsers often send them as
--              application/octet-stream, which browsers download rather than
--              render, so it is safe to allow. SVG is deliberately excluded.
-- form-attachments: PDF and raster images.
--
-- Safe to re-run.
-- ============================================================

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp', 'image/heic',
  'image/vnd.dwg', 'application/acad', 'application/x-dwg', 'application/dwg',
  'image/vnd.dxf', 'application/dxf',
  'application/octet-stream'
]
WHERE id = 'job-plans';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/png', 'image/jpeg', 'image/webp', 'image/heic'
]
WHERE id = 'form-attachments';
