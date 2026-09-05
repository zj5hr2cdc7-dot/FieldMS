
-- Add customer contact fields to jobs
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Job tracking tokens (one per job, used in public /track/:token URL)
CREATE TABLE IF NOT EXISTS public.job_tracking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id)
);

-- Technician GPS location updates
CREATE TABLE IF NOT EXISTS public.job_location_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  accuracy FLOAT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Job lifecycle events (travel_started, job_started, job_completed)
CREATE TABLE IF NOT EXISTS public.job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('travel_started', 'job_started', 'job_completed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_tracking_tokens_token ON public.job_tracking_tokens(token);
CREATE INDEX IF NOT EXISTS idx_job_tracking_tokens_job_id ON public.job_tracking_tokens(job_id);
CREATE INDEX IF NOT EXISTS idx_job_location_updates_job_id_time ON public.job_location_updates(job_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_events_job_id ON public.job_events(job_id);

-- RLS
ALTER TABLE public.job_tracking_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage tracking tokens"
  ON public.job_tracking_tokens FOR ALL
  USING (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    job_id IN (
      SELECT j.id FROM public.jobs j
      WHERE j.tenant_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Tenant members can insert location updates"
  ON public.job_location_updates FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenant members can view location updates"
  ON public.job_location_updates FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenant members can insert job events"
  ON public.job_events FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenant members can view job events"
  ON public.job_events FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

