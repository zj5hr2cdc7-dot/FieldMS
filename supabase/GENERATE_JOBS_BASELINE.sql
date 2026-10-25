-- ============================================================
-- Reconstruct the CREATE TABLE for public.jobs from the live database.
--
-- WHY THIS EXISTS
--   public.jobs is the central table of FieldMS — 19 migrations reference it —
--   and NO migration creates it. It was made by hand in the Supabase dashboard
--   early on and never written down.
--
--   The consequences are not theoretical:
--     - The database cannot be rebuilt from git. A fresh Supabase project gets
--       every other table and then fails, because jobs does not exist.
--     - There is no reviewable record of its RLS policies. Every other table's
--       isolation can be read in a migration; the most important one cannot.
--     - scripts/audit-rls.mjs cannot audit it, so it is invisible to the one
--       tool that checks tenant isolation.
--
--   This has been the oldest open item in AUDIT_REPORT.md. It cannot be fixed
--   from the repository because the truth only exists in the live database —
--   so this reads it out instead.
--
-- HOW TO USE
--   1. Run this whole file in the Supabase SQL editor of your PRODUCTION
--      project. It only reads catalogue tables; it changes nothing.
--   2. Copy the single text value it returns.
--   3. Save it as supabase/migrations/000_baseline_jobs.sql.
--   4. Re-run `node scripts/audit-rls.mjs` — jobs should now appear.
--
--   Number it 000 so it runs before everything that references jobs.
--
-- CHECK THE OUTPUT BEFORE COMMITTING. This assembles DDL from the catalogue
-- rather than using a real dump; it covers columns, defaults, nullability,
-- primary key, foreign keys, checks, indexes and RLS policies, which is
-- everything jobs actually uses. If your table has triggers or generated
-- columns, add them by hand.
-- ============================================================

WITH cols AS (
  SELECT
    a.attnum,
    '  ' || quote_ident(a.attname) || ' ' || format_type(a.atttypid, a.atttypmod)
      || COALESCE(' DEFAULT ' || pg_get_expr(d.adbin, d.adrelid), '')
      || CASE WHEN a.attnotnull THEN ' NOT NULL' ELSE '' END AS line
  FROM pg_attribute a
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  WHERE a.attrelid = 'public.jobs'::regclass
    AND a.attnum > 0
    AND NOT a.attisdropped
),
constraints AS (
  SELECT
    CASE contype WHEN 'p' THEN 1 WHEN 'u' THEN 2 WHEN 'f' THEN 3 ELSE 4 END AS sort,
    '  CONSTRAINT ' || quote_ident(conname) || ' ' || pg_get_constraintdef(oid) AS line
  FROM pg_constraint
  WHERE conrelid = 'public.jobs'::regclass
),
indexes AS (
  SELECT indexdef || ';' AS line
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'jobs'
    -- Constraint-backed indexes are already emitted with the constraint.
    AND indexname NOT IN (SELECT conname FROM pg_constraint WHERE conrelid = 'public.jobs'::regclass)
),
policies AS (
  SELECT
    'DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.jobs;' || E'\n'
    || 'CREATE POLICY ' || quote_ident(policyname) || ' ON public.jobs'
    || ' AS ' || CASE WHEN permissive = 'PERMISSIVE' THEN 'PERMISSIVE' ELSE 'RESTRICTIVE' END
    || ' FOR ' || cmd
    || ' TO ' || array_to_string(roles, ', ')
    || COALESCE(E'\n  USING (' || qual || ')', '')
    || COALESCE(E'\n  WITH CHECK (' || with_check || ')', '')
    || ';' AS line
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'jobs'
)
SELECT
  '-- ============================================================' || E'\n'
  || '-- BASELINE: public.jobs' || E'\n'
  || '--' || E'\n'
  || '-- Generated from the live database by supabase/GENERATE_JOBS_BASELINE.sql' || E'\n'
  || '-- on ' || to_char(NOW(), 'YYYY-MM-DD') || '.' || E'\n'
  || '--' || E'\n'
  || '-- jobs was created by hand in the dashboard and never written down, so' || E'\n'
  || '-- the database could not be rebuilt from git and its RLS policies could' || E'\n'
  || '-- not be reviewed. This file is that record. Numbered 000 because 19' || E'\n'
  || '-- later migrations reference this table.' || E'\n'
  || '-- ============================================================' || E'\n\n'
  || 'CREATE TABLE IF NOT EXISTS public.jobs (' || E'\n'
  || (SELECT string_agg(line, ',' || E'\n' ORDER BY attnum) FROM cols)
  || COALESCE(',' || E'\n' || (SELECT string_agg(line, ',' || E'\n' ORDER BY sort, line) FROM constraints), '')
  || E'\n);\n\n'
  || COALESCE((SELECT string_agg(line, E'\n') FROM indexes) || E'\n\n', '')
  || 'ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;' || E'\n\n'
  || COALESCE((SELECT string_agg(line, E'\n\n') FROM policies), '-- NO RLS POLICIES FOUND — investigate before deploying.')
  || E'\n'
  AS baseline_migration;
