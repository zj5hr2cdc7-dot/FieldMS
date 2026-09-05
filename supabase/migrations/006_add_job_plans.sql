-- Job plans: uploaded files (PDFs, drawings, images) attached to jobs
CREATE TABLE IF NOT EXISTS public.job_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_plans_tenant_id ON public.job_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_plans_job_id ON public.job_plans(job_id);

ALTER TABLE public.job_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage job plans"
  ON public.job_plans FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- Storage bucket for plan files (run this in Supabase SQL editor too):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('job-plans', 'job-plans', false)
-- ON CONFLICT (id) DO NOTHING;

-- RLS for storage
-- CREATE POLICY "Authenticated users can upload job plans"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'job-plans' AND auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can view job plans"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'job-plans' AND auth.role() = 'authenticated');

-- CREATE POLICY "Authenticated users can delete their job plans"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'job-plans' AND auth.role() = 'authenticated');
