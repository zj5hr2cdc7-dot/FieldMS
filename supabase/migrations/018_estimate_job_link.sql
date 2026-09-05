-- Link estimates (quotes) to jobs so approval flows into the job's billing.
ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estimates_job ON public.estimates(job_id);
