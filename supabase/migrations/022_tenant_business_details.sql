-- ============================================================
-- Tenant business details.
--
-- types/database.ts has declared these columns on Tenant for a long time and
-- lib/auth.updateTenant writes them, but no migration ever created them. The
-- setup wizard's business step therefore failed with:
--
--   Could not find the 'abn' column of 'tenants' in the schema cache (PGRST204)
--
-- Every column is added IF NOT EXISTS, so this is safe to run against a
-- database where some were already added by hand.
-- ============================================================

ALTER TABLE public.tenants
  -- Business identity, printed on quotes, invoices and certificates
  ADD COLUMN IF NOT EXISTS abn TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS google_reviews_url TEXT,
  -- Scheduling defaults used by the schedule and field apps.
  -- working_days is ISO day numbers, 1 = Monday through 7 = Sunday.
  ADD COLUMN IF NOT EXISTS work_day_start TIME,
  ADD COLUMN IF NOT EXISTS work_day_end TIME,
  ADD COLUMN IF NOT EXISTS working_days INT[];

COMMENT ON COLUMN public.tenants.abn IS 'Australian Business Number, shown on tax invoices';
COMMENT ON COLUMN public.tenants.working_days IS 'ISO day numbers, 1 = Monday through 7 = Sunday';

-- Sensible defaults for existing workspaces so the schedule has a working week
-- to draw rather than empty columns.
UPDATE public.tenants
   SET work_day_start = COALESCE(work_day_start, '07:00'::time),
       work_day_end   = COALESCE(work_day_end,   '16:00'::time),
       working_days   = COALESCE(working_days,   ARRAY[1, 2, 3, 4, 5])
 WHERE work_day_start IS NULL
    OR work_day_end IS NULL
    OR working_days IS NULL;
