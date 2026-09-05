-- ============================================================
-- Forms & Compliance module
-- Digital forms engine: templates, submissions, signatures,
-- audit trail, white-label branding, document numbering.
-- ============================================================

-- ── White-label branding per tenant ─────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_branding (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Business identity
  trading_name TEXT,
  acn TEXT,
  license_number TEXT,
  contractor_license TEXT,
  electrical_license TEXT,
  postal_address TEXT,
  business_address TEXT,
  social_links JSONB NOT NULL DEFAULT '{}'::jsonb, -- { facebook, instagram, linkedin, ... }
  -- Visual identity
  primary_color TEXT NOT NULL DEFAULT '#4a9c4a',
  secondary_color TEXT NOT NULL DEFAULT '#1a2332',
  accent_color TEXT NOT NULL DEFAULT '#0ea5e9',
  font_family TEXT NOT NULL DEFAULT 'Inter',
  logo_path TEXT,            -- storage paths in 'branding' bucket
  watermark_path TEXT,
  header_image_path TEXT,
  footer_image_path TEXT,
  stamp_path TEXT,
  logo_position TEXT NOT NULL DEFAULT 'right' CHECK (logo_position IN ('left', 'center', 'right')),
  -- Document settings
  paper_size TEXT NOT NULL DEFAULT 'A4' CHECK (paper_size IN ('A4', 'Letter')),
  show_page_numbers BOOLEAN NOT NULL DEFAULT TRUE,
  show_watermark BOOLEAN NOT NULL DEFAULT FALSE,
  doc_number_format TEXT NOT NULL DEFAULT '{PREFIX}-{YYYY}-{SEQ4}',
  email_signature TEXT,
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Per-tenant, per-prefix document counters ─────────────────
CREATE TABLE IF NOT EXISTS public.document_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doc_prefix TEXT NOT NULL,
  next_number INT NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, doc_prefix)
);

-- Atomic counter increment (safe under concurrency)
CREATE OR REPLACE FUNCTION public.next_document_number(p_tenant_id UUID, p_prefix TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result INT;
BEGIN
  INSERT INTO public.document_counters (tenant_id, doc_prefix, next_number)
  VALUES (p_tenant_id, p_prefix, 2)
  ON CONFLICT (tenant_id, doc_prefix)
  DO UPDATE SET next_number = public.document_counters.next_number + 1
  RETURNING CASE WHEN xmax = 0 THEN 1 ELSE next_number - 1 END INTO result;
  RETURN result;
END;
$$;

-- ── Form templates ───────────────────────────────────────────
-- tenant_id NULL = system/library template (read-only to tenants)
CREATE TABLE IF NOT EXISTS public.form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general', -- 'electrical' | 'safety' | 'general' | 'hr' | ...
  description TEXT,
  doc_prefix TEXT NOT NULL DEFAULT 'DOC',
  schema JSONB NOT NULL DEFAULT '{"fields": []}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  auto_on_job_complete BOOLEAN NOT NULL DEFAULT FALSE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_templates_tenant ON public.form_templates(tenant_id);

-- ── Form submissions (completed / in-progress documents) ─────
CREATE TABLE IF NOT EXISTS public.form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.form_templates(id) ON DELETE SET NULL,
  template_name TEXT NOT NULL,
  template_schema JSONB NOT NULL,     -- frozen copy: edits to the template never mutate issued documents
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'awaiting_signature', 'completed', 'approved', 'rejected')),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { fieldId: value }
  doc_number TEXT,
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  revision INT NOT NULL DEFAULT 1,
  gps_lat DOUBLE PRECISION,
  gps_lng DOUBLE PRECISION,
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant ON public.form_submissions(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_job ON public.form_submissions(job_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_token ON public.form_submissions(public_token);
CREATE INDEX IF NOT EXISTS idx_form_submissions_doc_number ON public.form_submissions(tenant_id, doc_number);

-- ── Signatures (multiple roles per document) ─────────────────
CREATE TABLE IF NOT EXISTS public.form_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('technician', 'supervisor', 'customer', 'property_owner', 'site_manager')),
  signer_name TEXT NOT NULL,
  signature_data TEXT NOT NULL,       -- PNG data URL from the signature pad
  signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  UNIQUE (submission_id, role)
);

CREATE INDEX IF NOT EXISTS idx_form_signatures_submission ON public.form_signatures(submission_id);

-- ── Audit trail ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.form_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.form_submissions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- created | updated | completed | signed | sent | viewed | approved | rejected | reopened
  actor_name TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_audit_submission ON public.form_audit_events(submission_id, created_at);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage branding"
  ON public.tenant_branding FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members view counters"
  ON public.document_counters FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Templates: members manage their own; everyone can read system templates
CREATE POLICY "Tenant members manage own templates"
  ON public.form_templates FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated can read system templates"
  ON public.form_templates FOR SELECT
  USING (tenant_id IS NULL AND auth.uid() IS NOT NULL);

CREATE POLICY "Tenant members manage submissions"
  ON public.form_submissions FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members manage signatures"
  ON public.form_signatures FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members view audit"
  ON public.form_audit_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members insert audit"
  ON public.form_audit_events FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_tenant_branding_updated ON public.tenant_branding;
CREATE TRIGGER trg_tenant_branding_updated BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_form_templates_updated ON public.form_templates;
CREATE TRIGGER trg_form_templates_updated BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_form_submissions_updated ON public.form_submissions;
CREATE TRIGGER trg_form_submissions_updated BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage bucket for branding assets (run in dashboard if not via CLI):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', false)
-- ON CONFLICT (id) DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('form-attachments', 'form-attachments', false)
-- ON CONFLICT (id) DO NOTHING;
