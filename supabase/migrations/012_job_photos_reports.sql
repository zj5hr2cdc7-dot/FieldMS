-- Photo site reports
-- Pain point: Tradify — "our contractors want a detailed report from site with
-- pictures which this system doesn't allow."

CREATE TABLE IF NOT EXISTS public.job_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,            -- storage path in 'job-photos' bucket
  caption TEXT,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job ON public.job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_tenant ON public.job_photos(tenant_id);

-- Shareable site report (public token link, like job tracking)
CREATE TABLE IF NOT EXISTS public.job_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  title TEXT NOT NULL DEFAULT 'Site report',
  summary TEXT,
  photo_ids UUID[] NOT NULL DEFAULT '{}',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_reports_token ON public.job_reports(token);
CREATE INDEX IF NOT EXISTS idx_job_reports_tenant ON public.job_reports(tenant_id);

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage job photos"
  ON public.job_photos FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can manage job reports"
  ON public.job_reports FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Storage bucket (run in Supabase dashboard if not using CLI):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('job-photos', 'job-photos', false)
-- ON CONFLICT (id) DO NOTHING;
