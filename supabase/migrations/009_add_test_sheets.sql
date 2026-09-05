-- Digital AS/NZS 3000 test sheets + electrical safety certificates
-- Pain point: competitors (Tradify, Jobber) have no compliance certs; electricians run a second app.

CREATE TABLE IF NOT EXISTS public.job_test_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  -- Installation details
  installation_address TEXT,
  switchboard_location TEXT,
  supply_type TEXT, -- e.g. '230V single phase', '400V three phase'
  -- Circuit test results: array of rows
  -- { circuit_ref, description, cable_size, protection_type, protection_rating,
  --   earth_continuity_ohms, insulation_resistance_mohms, polarity_pass,
  --   rcd_trip_ms, rcd_trip_ma, visual_pass, notes }
  circuits JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Certification
  certificate_number TEXT UNIQUE,
  certificate_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  tested_by UUID REFERENCES auth.users(id),
  tester_name TEXT,
  tester_license TEXT,
  test_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_test_sheets_tenant ON public.job_test_sheets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_job_test_sheets_job ON public.job_test_sheets(job_id);
CREATE INDEX IF NOT EXISTS idx_job_test_sheets_token ON public.job_test_sheets(certificate_token);

-- Per-tenant certificate numbering
CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq;

ALTER TABLE public.job_test_sheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can manage test sheets"
  ON public.job_test_sheets FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_test_sheets_updated_at ON public.job_test_sheets;
CREATE TRIGGER trg_job_test_sheets_updated_at
  BEFORE UPDATE ON public.job_test_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
