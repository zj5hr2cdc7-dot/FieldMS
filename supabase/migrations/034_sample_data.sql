-- ============================================================
-- 034 · Sample data flag
--
-- A new workspace can add one sample job (customer, job and quote) to see
-- how FieldMS fits together, then remove it in one click. is_sample marks
-- exactly what was created, so removal never touches real records.
--
-- The sample customer has no email or phone, so reminders and messages
-- can never reach a real person from sample data.
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.jobs      ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_customers_sample ON public.customers(tenant_id) WHERE is_sample;
CREATE INDEX IF NOT EXISTS idx_jobs_sample      ON public.jobs(tenant_id)      WHERE is_sample;
CREATE INDEX IF NOT EXISTS idx_estimates_sample ON public.estimates(business_id) WHERE is_sample;
