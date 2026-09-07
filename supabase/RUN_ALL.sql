-- ============================================================
-- FieldMS: bring this database up to date, then create the demo workspace.
--
-- GENERATED FILE. Rebuild with: python3 scripts/build-run-all.py
--
-- SAFE TO RUN AGAIN AFTER A FAILURE
--   The original migrations are not re-runnable. Guards added on the way into
--   this file: 65 policies, 14 triggers, 3 indexes, 1 tables.
--   Before this, a run that stopped partway could not simply be repeated: it
--   failed on "already exists" with the schema half applied. Statements are
--   identified by parsing them with the real PostgreSQL grammar, not by
--   pattern matching, so multi line definitions cannot be missed.
--
-- WHY THIS IS LONG
--   This database had ten tables. Migrations 004 and 006 through 021 were
--   never applied, so about two thirds of the tables the app queries did not
--   exist. Test sheets, invoices, forms, photos, timesheets, branding,
--   materials and the setup wizard were all querying tables that were not
--   there, failing into empty states rather than errors.
--
-- YOUR OWN WORKSPACE IS NOT TOUCHED
--   The demo lives in its own tenant, "Voltaic Electrical (demo)", with its
--   own owner login. You are added as a member so it appears in the workspace
--   switcher, top right. Re-run any time to reset the demo.
--
-- DELIBERATELY EXCLUDED
--   001, 002  begin with DROP TABLE on tenants, profiles, tenant_members,
--             estimates and estimate_items, which hold your data.
--   003       missing from the repo. public.jobs already exists.
--   005       already applied.
--
-- AFTERWARDS
--   Run supabase/VERIFY_SCHEMA.sql: no rows means the database satisfies
--   every query in the codebase. Or from the project: npm run doctor
--
-- BEFORE GOING LIVE: delete the five demo logins
--   demo@ / dave@ / sam@ / priya@ / josh@voltaicelectrical.com.au (demo1234)
-- ============================================================




-- ============================================================
-- ==  004_add_integrations.sql
-- ==  Xero / MYOB connection records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('xero', 'myob')),
  status TEXT NOT NULL DEFAULT 'disconnected',
  external_account_id TEXT,
  external_account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant_id ON public.integrations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);

CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view integrations in their tenant" ON public.integrations;

CREATE POLICY "Users can view integrations in their tenant"
  ON public.integrations FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert integrations in their tenant" ON public.integrations;

CREATE POLICY "Users can insert integrations in their tenant"
  ON public.integrations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update integrations in their tenant" ON public.integrations;

CREATE POLICY "Users can update integrations in their tenant"
  ON public.integrations FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete integrations in their tenant" ON public.integrations;

CREATE POLICY "Users can delete integrations in their tenant"
  ON public.integrations FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- ==  006_add_job_plans.sql
-- ==  Job plans and file uploads
-- ============================================================

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

DROP POLICY IF EXISTS "Tenant members can manage job plans" ON public.job_plans;

CREATE POLICY "Tenant members can manage job plans"
  ON public.job_plans FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- ==  007_add_job_billing_items.sql
-- ==  Labour lines with cost and margin
-- ============================================================

create table if not exists job_billing_items (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references jobs(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  description   text not null,
  hours         numeric(8, 2) not null check (hours > 0),
  rate_per_hour numeric(10, 2) not null check (rate_per_hour >= 0),
  markup_percent numeric(6, 2) not null default 0,
  -- revenue = hours * rate_per_hour * (1 + markup_percent/100)
  revenue       numeric(12, 2) not null,
  -- cost = hours * rate_per_hour (before markup)
  cost          numeric(12, 2) not null,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists job_billing_items_tenant_id_idx on job_billing_items(tenant_id);

create index if not exists job_billing_items_job_id_idx on job_billing_items(job_id);

alter table job_billing_items enable row level security;

DROP POLICY IF EXISTS "tenant members can read billing items" ON public.job_billing_items;

create policy "tenant members can read billing items"
  on job_billing_items for select
  using (
    exists (
      select 1 from tenant_members
      where tenant_members.tenant_id = job_billing_items.tenant_id
        and tenant_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant members can insert billing items" ON public.job_billing_items;

create policy "tenant members can insert billing items"
  on job_billing_items for insert
  with check (
    exists (
      select 1 from tenant_members
      where tenant_members.tenant_id = job_billing_items.tenant_id
        and tenant_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant members can update billing items" ON public.job_billing_items;

create policy "tenant members can update billing items"
  on job_billing_items for update
  using (
    exists (
      select 1 from tenant_members
      where tenant_members.tenant_id = job_billing_items.tenant_id
        and tenant_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "tenant members can delete billing items" ON public.job_billing_items;

create policy "tenant members can delete billing items"
  on job_billing_items for delete
  using (
    exists (
      select 1 from tenant_members
      where tenant_members.tenant_id = job_billing_items.tenant_id
        and tenant_members.user_id = auth.uid()
    )
  );

-- ============================================================
-- ==  008_add_tenant_settings.sql
-- ==  Workspace settings columns
-- ============================================================

alter table public.tenants
  add column if not exists google_reviews_url text,
  add column if not exists abn text,
  add column if not exists phone text,
  add column if not exists website text;

-- ============================================================
-- ==  009_add_test_sheets.sql
-- ==  AS/NZS 3000 test sheets and certificates
-- ============================================================

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

CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq;

ALTER TABLE public.job_test_sheets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can manage test sheets" ON public.job_test_sheets;

CREATE POLICY "Tenant members can manage test sheets"
  ON public.job_test_sheets FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_test_sheets_updated_at ON public.job_test_sheets;

DROP TRIGGER IF EXISTS "trg_job_test_sheets_updated_at" ON public.job_test_sheets;

CREATE TRIGGER trg_job_test_sheets_updated_at
  BEFORE UPDATE ON public.job_test_sheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ==  010_estimate_approval.sql
-- ==  Customer quote approval trail
-- ============================================================

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approval_name TEXT,        -- typed name = signature
  ADD COLUMN IF NOT EXISTS approval_note TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_estimates_public_token ON public.estimates(public_token);

CREATE TABLE IF NOT EXISTS public.estimate_approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('viewed', 'approved', 'declined')),
  actor_name TEXT,
  note TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_approval_events_estimate
  ON public.estimate_approval_events(estimate_id, created_at DESC);

ALTER TABLE public.estimate_approval_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can view approval events" ON public.estimate_approval_events;

CREATE POLICY "Tenant members can view approval events"
  ON public.estimate_approval_events FOR SELECT
  USING (
    estimate_id IN (
      SELECT e.id FROM public.estimates e
      WHERE e.business_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================
-- ==  011_accounting_sync.sql
-- ==  Payments and accounting sync records
-- ============================================================

CREATE TABLE IF NOT EXISTS public.job_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'payment' CHECK (kind IN ('deposit', 'payment', 'refund')),
  amount NUMERIC(12,2) NOT NULL,
  method TEXT, -- 'card', 'bank_transfer', 'cash', ...
  reference TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_payments_tenant ON public.job_payments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_job_payments_job ON public.job_payments(job_id);

CREATE TABLE IF NOT EXISTS public.accounting_sync_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('xero', 'myob')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('invoice', 'payment', 'contact')),
  entity_id UUID NOT NULL,             -- local row id (job id for invoices, job_payments id, ...)
  idempotency_key TEXT NOT NULL,       -- stable: provider:entity_type:entity_id
  external_id TEXT,                    -- provider-side id once synced
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error')),
  last_error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  payload_hash TEXT,                   -- skip re-push when nothing changed
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_accounting_sync_tenant_status
  ON public.accounting_sync_records(tenant_id, status);

ALTER TABLE public.job_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.accounting_sync_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members can manage payments" ON public.job_payments;

CREATE POLICY "Tenant members can manage payments"
  ON public.job_payments FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can view sync records" ON public.accounting_sync_records;

CREATE POLICY "Tenant members can view sync records"
  ON public.accounting_sync_records FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_accounting_sync_updated_at ON public.accounting_sync_records;

DROP TRIGGER IF EXISTS "trg_accounting_sync_updated_at" ON public.accounting_sync_records;

CREATE TRIGGER trg_accounting_sync_updated_at
  BEFORE UPDATE ON public.accounting_sync_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ==  012_job_photos_reports.sql
-- ==  Site photos and shareable reports
-- ============================================================

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

DROP POLICY IF EXISTS "Tenant members can manage job photos" ON public.job_photos;

CREATE POLICY "Tenant members can manage job photos"
  ON public.job_photos FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members can manage job reports" ON public.job_reports;

CREATE POLICY "Tenant members can manage job reports"
  ON public.job_reports FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- ============================================================
-- ==  013_scheduling_upgrades.sql
-- ==  Work hours, skills, recurrence
-- ============================================================

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS work_day_start TIME DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS work_day_end TIME DEFAULT '15:30',
  ADD COLUMN IF NOT EXISTS working_days INT[] DEFAULT '{1,2,3,4,5}';

ALTER TABLE public.tenant_members
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS scheduled_start TIME,               -- start time on due_date
  ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none'
    CHECK (recurrence IN ('none', 'weekly', 'fortnightly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_until DATE,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_recurrence_parent ON public.jobs(recurrence_parent_id);

-- ============================================================
-- ==  014_forms_compliance.sql
-- ==  Forms, signatures and tenant branding
-- ============================================================

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

CREATE TABLE IF NOT EXISTS public.document_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  doc_prefix TEXT NOT NULL,
  next_number INT NOT NULL DEFAULT 1,
  UNIQUE (tenant_id, doc_prefix)
);

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

ALTER TABLE public.tenant_branding ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.form_signatures ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.form_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members manage branding" ON public.tenant_branding;

CREATE POLICY "Tenant members manage branding"
  ON public.tenant_branding FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members view counters" ON public.document_counters;

CREATE POLICY "Tenant members view counters"
  ON public.document_counters FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage own templates" ON public.form_templates;

CREATE POLICY "Tenant members manage own templates"
  ON public.form_templates FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read system templates" ON public.form_templates;

CREATE POLICY "Authenticated can read system templates"
  ON public.form_templates FOR SELECT
  USING (tenant_id IS NULL AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tenant members manage submissions" ON public.form_submissions;

CREATE POLICY "Tenant members manage submissions"
  ON public.form_submissions FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage signatures" ON public.form_signatures;

CREATE POLICY "Tenant members manage signatures"
  ON public.form_signatures FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members view audit" ON public.form_audit_events;

CREATE POLICY "Tenant members view audit"
  ON public.form_audit_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members insert audit" ON public.form_audit_events;

CREATE POLICY "Tenant members insert audit"
  ON public.form_audit_events FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_tenant_branding_updated ON public.tenant_branding;

DROP TRIGGER IF EXISTS "trg_tenant_branding_updated" ON public.tenant_branding;

CREATE TRIGGER trg_tenant_branding_updated BEFORE UPDATE ON public.tenant_branding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_form_templates_updated ON public.form_templates;

DROP TRIGGER IF EXISTS "trg_form_templates_updated" ON public.form_templates;

CREATE TRIGGER trg_form_templates_updated BEFORE UPDATE ON public.form_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_form_submissions_updated ON public.form_submissions;

DROP TRIGGER IF EXISTS "trg_form_submissions_updated" ON public.form_submissions;

CREATE TRIGGER trg_form_submissions_updated BEFORE UPDATE ON public.form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ==  015_material_pricing.sql
-- ==  Product catalogue and supplier pricing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.master_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  brand TEXT,
  mpn TEXT,                          -- manufacturer part number (primary match key)
  unit TEXT NOT NULL DEFAULT 'each', -- each | metre | roll | box
  description TEXT,
  aliases TEXT[] NOT NULL DEFAULT '{}',  -- normalised alternate names for matching
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_products_mpn ON public.master_products(mpn);

CREATE INDEX IF NOT EXISTS idx_master_products_name ON public.master_products USING gin (to_tsvector('english', name));

CREATE TABLE IF NOT EXISTS public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  supplier_key TEXT NOT NULL,        -- 'rexel' | 'haymans' | 'lawrence_hanson' | 'middys' | 'cnw' | 'ideal' | 'cw_electrical' | 'sparky_direct' | ...
  supplier_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  mpn TEXT,
  price NUMERIC(12,4) NOT NULL,      -- market/list price ex GST
  availability TEXT NOT NULL DEFAULT 'unknown' CHECK (availability IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  stock_level INT,
  product_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (supplier_key, sku)
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_master ON public.supplier_products(master_product_id);

CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_key);

CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  price NUMERIC(12,4) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_product_time
  ON public.price_snapshots(supplier_product_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.price_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  supplier_key TEXT NOT NULL,
  old_price NUMERIC(12,4) NOT NULL,
  new_price NUMERIC(12,4) NOT NULL,
  pct_change NUMERIC(8,3) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_changes_master_time
  ON public.price_changes(master_product_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.tenant_supplier_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_key TEXT NOT NULL,
  account_reference TEXT,            -- customer/account number at the wholesaler
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  -- Credentials/token for the supplier feed. Stored server-side only; RLS
  -- blocks reads of this column via the dedicated view below.
  credential_cipher TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_key)
);

CREATE TABLE IF NOT EXISTS public.tenant_trade_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  price NUMERIC(12,4) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_product_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_trade_prices_tenant ON public.tenant_trade_prices(tenant_id);

CREATE TABLE IF NOT EXISTS public.tenant_pricing_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  price_source TEXT NOT NULL DEFAULT 'market_median' CHECK (price_source IN (
    'market_average', 'market_lowest', 'market_median',
    'preferred_supplier', 'cheapest_trade', 'manual'
  )),
  preferred_supplier_key TEXT,
  alert_threshold_pct NUMERIC(6,2) NOT NULL DEFAULT 5.0,
  auto_update_overrides BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_price_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  price NUMERIC(12,4) NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, master_product_id)
);

CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  master_product_id UUID REFERENCES public.master_products(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  pct_change NUMERIC(8,3),
  supplier_key TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_tenant ON public.price_alerts(tenant_id, read, created_at DESC);

ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.price_changes ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_supplier_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_trade_prices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_pricing_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_price_overrides ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read master products" ON public.master_products;

CREATE POLICY "Authenticated read master products" ON public.master_products FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated read supplier products" ON public.supplier_products;

CREATE POLICY "Authenticated read supplier products" ON public.supplier_products FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated read snapshots" ON public.price_snapshots;

CREATE POLICY "Authenticated read snapshots" ON public.price_snapshots FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated read changes" ON public.price_changes;

CREATE POLICY "Authenticated read changes" ON public.price_changes FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Tenant members manage supplier accounts" ON public.tenant_supplier_accounts;

CREATE POLICY "Tenant members manage supplier accounts"
  ON public.tenant_supplier_accounts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members read trade prices" ON public.tenant_trade_prices;

CREATE POLICY "Tenant members read trade prices"
  ON public.tenant_trade_prices FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage pricing settings" ON public.tenant_pricing_settings;

CREATE POLICY "Tenant members manage pricing settings"
  ON public.tenant_pricing_settings FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage overrides" ON public.tenant_price_overrides;

CREATE POLICY "Tenant members manage overrides"
  ON public.tenant_price_overrides FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage alerts" ON public.price_alerts;

CREATE POLICY "Tenant members manage alerts"
  ON public.price_alerts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_master_products_updated ON public.master_products;

DROP TRIGGER IF EXISTS "trg_master_products_updated" ON public.master_products;

CREATE TRIGGER trg_master_products_updated BEFORE UPDATE ON public.master_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ==  016_billing_materials.sql
-- ==  Materials on job billing
-- ============================================================

ALTER TABLE public.job_billing_items
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'labour' CHECK (kind IN ('labour', 'material')),
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_source TEXT;

CREATE INDEX IF NOT EXISTS idx_job_billing_items_kind ON public.job_billing_items(job_id, kind);

-- ============================================================
-- ==  017_job_billing.sql
-- ==  Invoices, variations, audit trail
-- ============================================================

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS quote_total NUMERIC(12,2) NOT NULL DEFAULT 0,   -- accepted quote value (ex GST)
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS billing_notes TEXT;

CREATE TABLE IF NOT EXISTS public.job_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  variation_number INT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT,
  material_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  labour_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  markup_percent NUMERIC(6,2) NOT NULL DEFAULT 0,
  total_ex_gst NUMERIC(12,2) NOT NULL DEFAULT 0,   -- sell value ex GST
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'completed')),
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  approved_by_name TEXT,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (job_id, variation_number)
);

CREATE INDEX IF NOT EXISTS idx_job_variations_job ON public.job_variations(job_id);

CREATE TABLE IF NOT EXISTS public.job_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  invoice_number TEXT,
  kind TEXT NOT NULL DEFAULT 'tax' CHECK (kind IN ('deposit', 'progress', 'tax', 'final', 'credit')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'part_paid', 'paid', 'overdue', 'void')),
  subtotal_ex_gst NUMERIC(12,2) NOT NULL DEFAULT 0,
  gst_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_inc_gst NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  progress_percent NUMERIC(6,2),                     -- for progress claims (25/50/…)
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  notes TEXT,
  due_date DATE,
  issued_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_invoices_job ON public.job_invoices(job_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_invoices_token ON public.job_invoices(public_token);

CREATE TABLE IF NOT EXISTS public.job_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.job_invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_job_invoice_items_invoice ON public.job_invoice_items(invoice_id);

ALTER TABLE public.job_payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.job_invoices(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.billing_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,   -- quote_updated | variation_added | variation_approved | invoice_created | invoice_sent | payment_recorded | ...
  actor_name TEXT,
  amount NUMERIC(12,2),
  previous_value JSONB,
  new_value JSONB,
  reason TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_audit_job ON public.billing_audit_events(job_id, created_at);

ALTER TABLE public.job_variations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_invoices ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.job_invoice_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.billing_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members manage variations" ON public.job_variations;

CREATE POLICY "Tenant members manage variations"
  ON public.job_variations FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage invoices" ON public.job_invoices;

CREATE POLICY "Tenant members manage invoices"
  ON public.job_invoices FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage invoice items" ON public.job_invoice_items;

CREATE POLICY "Tenant members manage invoice items"
  ON public.job_invoice_items FOR ALL
  USING (invoice_id IN (
    SELECT i.id FROM public.job_invoices i
    WHERE i.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (invoice_id IN (
    SELECT i.id FROM public.job_invoices i
    WHERE i.tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Tenant members view billing audit" ON public.billing_audit_events;

CREATE POLICY "Tenant members view billing audit"
  ON public.billing_audit_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members insert billing audit" ON public.billing_audit_events;

CREATE POLICY "Tenant members insert billing audit"
  ON public.billing_audit_events FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_job_variations_updated ON public.job_variations;

DROP TRIGGER IF EXISTS "trg_job_variations_updated" ON public.job_variations;

CREATE TRIGGER trg_job_variations_updated BEFORE UPDATE ON public.job_variations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_job_invoices_updated ON public.job_invoices;

DROP TRIGGER IF EXISTS "trg_job_invoices_updated" ON public.job_invoices;

CREATE TRIGGER trg_job_invoices_updated BEFORE UPDATE ON public.job_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ==  018_estimate_job_link.sql
-- ==  Link estimates to jobs
-- ============================================================

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_estimates_job ON public.estimates(job_id);

-- ============================================================
-- ==  019_field_time_tracking.sql
-- ==  Timesheets and announcements
-- ============================================================

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('shift', 'travel', 'lunch', 'overtime')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON public.time_entries(tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.company_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON public.company_announcements(tenant_id, created_at DESC);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS vehicle TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT[],
  ADD COLUMN IF NOT EXISTS licences TEXT[];

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.company_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own time entries" ON public.time_entries;

CREATE POLICY "Users manage own time entries"
  ON public.time_entries FOR ALL
  USING (user_id = auth.uid() AND tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins view tenant time entries" ON public.time_entries;

CREATE POLICY "Admins view tenant time entries"
  ON public.time_entries FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

DROP POLICY IF EXISTS "Members read announcements" ON public.company_announcements;

CREATE POLICY "Members read announcements"
  ON public.company_announcements FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins manage announcements" ON public.company_announcements;

CREATE POLICY "Admins manage announcements"
  ON public.company_announcements FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));

-- ============================================================
-- ==  020_field_privacy.sql
-- ==  Field staff privacy rules
-- ============================================================

DROP POLICY IF EXISTS "Tenant members manage submissions" ON public.form_submissions;

DROP POLICY IF EXISTS "Admins manage all submissions" ON public.form_submissions;

CREATE POLICY "Admins manage all submissions"
  ON public.form_submissions FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

DROP POLICY IF EXISTS "Members manage own submissions" ON public.form_submissions;

CREATE POLICY "Members manage own submissions"
  ON public.form_submissions FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR job_id IN (SELECT id FROM public.jobs WHERE assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (
      created_by = auth.uid()
      OR job_id IN (SELECT id FROM public.jobs WHERE assigned_to = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Tenant members manage job photos" ON public.job_photos;

DROP POLICY IF EXISTS "Admins manage all job photos" ON public.job_photos;

CREATE POLICY "Admins manage all job photos"
  ON public.job_photos FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ))
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

DROP POLICY IF EXISTS "Members manage photos on their jobs" ON public.job_photos;

CREATE POLICY "Members manage photos on their jobs"
  ON public.job_photos FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (
      uploaded_by = auth.uid()
      OR job_id IN (SELECT id FROM public.jobs WHERE assigned_to = auth.uid())
    )
  )
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
    AND (
      uploaded_by = auth.uid()
      OR job_id IN (SELECT id FROM public.jobs WHERE assigned_to = auth.uid())
    )
  );

-- ============================================================
-- ==  020_wholesaler_integration.sql
-- ==  Purchase orders and wholesaler accounts
-- ============================================================

ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS datasheet_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS pack_size NUMERIC(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS discontinued BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS replacement_sku TEXT,
  ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}';

ALTER TABLE public.tenant_supplier_accounts
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS connection_method TEXT NOT NULL DEFAULT 'catalogue'
    CHECK (connection_method IN ('api', 'catalogue', 'browser')),
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS sync_frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (sync_frequency IN ('daily', 'weekly', 'fortnightly', 'monthly', 'manual')),
  ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS products_synced INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = market-wide run
  supplier_key TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'catalogue' CHECK (method IN ('api', 'catalogue', 'browser')),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'import')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  offers INT NOT NULL DEFAULT 0,
  new_products INT NOT NULL DEFAULT 0,
  price_changes INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  source_file TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_supplier_time ON public.sync_runs(supplier_key, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_sync_runs_tenant ON public.sync_runs(tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.tenant_favourite_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, master_product_id)
);

CREATE TABLE IF NOT EXISTS public.tenant_material_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_material_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES public.tenant_material_kits(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (kit_id, master_product_id)
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  supplier_key TEXT NOT NULL,
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'
  )),
  notes TEXT,
  expected_delivery DATE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, po_number)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  sku TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(purchase_order_id);

ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_favourite_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_material_kits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.tenant_material_kit_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own or market sync runs" ON public.sync_runs;

CREATE POLICY "Read own or market sync runs" ON public.sync_runs FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Tenant members manage favourites" ON public.tenant_favourite_products;

CREATE POLICY "Tenant members manage favourites" ON public.tenant_favourite_products FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage kits" ON public.tenant_material_kits;

CREATE POLICY "Tenant members manage kits" ON public.tenant_material_kits FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage kit items" ON public.tenant_material_kit_items;

CREATE POLICY "Tenant members manage kit items" ON public.tenant_material_kit_items FOR ALL
  USING (kit_id IN (
    SELECT id FROM public.tenant_material_kits
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (kit_id IN (
    SELECT id FROM public.tenant_material_kits
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Tenant members manage purchase orders" ON public.purchase_orders;

CREATE POLICY "Tenant members manage purchase orders" ON public.purchase_orders FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage PO items" ON public.purchase_order_items;

CREATE POLICY "Tenant members manage PO items" ON public.purchase_order_items FOR ALL
  USING (purchase_order_id IN (
    SELECT id FROM public.purchase_orders
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (purchase_order_id IN (
    SELECT id FROM public.purchase_orders
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ));

DROP TRIGGER IF EXISTS trg_material_kits_updated ON public.tenant_material_kits;

DROP TRIGGER IF EXISTS "trg_material_kits_updated" ON public.tenant_material_kits;

CREATE TRIGGER trg_material_kits_updated BEFORE UPDATE ON public.tenant_material_kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON public.purchase_orders;

DROP TRIGGER IF EXISTS "trg_purchase_orders_updated" ON public.purchase_orders;

CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ==  021_onboarding.sql
-- ==  Setup wizard state
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_onboarding (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- What the business does. Drives which modules are shown app-wide.
  trades TEXT[] NOT NULL DEFAULT '{}',
  business_size TEXT CHECK (business_size IN ('solo', 'small', 'medium', 'large')),
  gst_registered BOOLEAN,
  timezone TEXT DEFAULT 'Australia/Brisbane',
  currency TEXT NOT NULL DEFAULT 'AUD',
  address TEXT,
  business_email TEXT,
  -- Wholesalers ticked during setup; pre-populates the Wholesaler Accounts page.
  wholesaler_keys TEXT[] NOT NULL DEFAULT '{}',
  accounting_provider TEXT CHECK (accounting_provider IN ('xero', 'myob', 'quickbooks', 'none', 'later')),
  -- Wizard progress
  completed_steps TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'skipped', 'completed')),
  tour_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.tenant_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members manage onboarding" ON public.tenant_onboarding;

CREATE POLICY "Tenant members manage onboarding" ON public.tenant_onboarding FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_tenant_onboarding_updated ON public.tenant_onboarding;

DROP TRIGGER IF EXISTS "trg_tenant_onboarding_updated" ON public.tenant_onboarding;

CREATE TRIGGER trg_tenant_onboarding_updated BEFORE UPDATE ON public.tenant_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ==  022_tenant_business_details.sql
-- ==  ABN, phone, website, working hours
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

UPDATE public.tenants
   SET work_day_start = COALESCE(work_day_start, '07:00'::time),
       work_day_end   = COALESCE(work_day_end,   '16:00'::time),
       working_days   = COALESCE(working_days,   ARRAY[1, 2, 3, 4, 5])
 WHERE work_day_start IS NULL
    OR work_day_end IS NULL
    OR working_days IS NULL;

-- ============================================================
-- ==  023_customers_and_sites.sql
-- ==  Customers and sites
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $set_updated_at$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$set_updated_at$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'residential'
    CHECK (kind IN ('residential', 'commercial', 'strata', 'builder', 'agent', 'other')),
  email TEXT,
  phone TEXT,
  billing_address TEXT,
  abn TEXT,
  notes TEXT,

  -- Normalised key used to spot duplicates: lowercased email if present,
  -- otherwise a squashed form of the name. Generated so it cannot drift.
  match_key TEXT GENERATED ALWAYS AS (
    COALESCE(
      NULLIF(lower(trim(email)), ''),
      regexp_replace(lower(trim(name)), '[^a-z0-9]', '', 'g')
    )
  ) STORED,

  -- ── Email marketing ──
  -- Australian Spam Act 2003 requires consent and a working unsubscribe, so
  -- consent is explicit rather than assumed. 'implied' covers an existing
  -- business relationship, which is lawful but weaker than express consent
  -- and worth distinguishing when a business exports a list.
  marketing_consent TEXT NOT NULL DEFAULT 'implied'
    CHECK (marketing_consent IN ('express', 'implied', 'declined', 'unsubscribed')),
  marketing_consent_at TIMESTAMPTZ,
  marketing_consent_source TEXT,          -- 'quote_form', 'manual', 'import', ...
  unsubscribe_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  unsubscribed_at TIMESTAMPTZ,
  last_marketed_at TIMESTAMPTZ,

  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (tenant_id, match_key)
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);

CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(tenant_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_customers_marketing
  ON public.customers(tenant_id, marketing_consent)
  WHERE archived = FALSE AND email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  label TEXT,                              -- 'Head office', 'Unit 3', ...
  address TEXT NOT NULL,
  access_notes TEXT,                       -- gate codes, dog, park round the back
  switchboard_location TEXT,               -- pre-fills the test sheet
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sites_customer ON public.sites(customer_id);

CREATE INDEX IF NOT EXISTS idx_sites_tenant ON public.sites(tenant_id);

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_customer ON public.jobs(customer_id);

CREATE INDEX IF NOT EXISTS idx_jobs_site ON public.jobs(site_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members manage customers" ON public.customers;

DROP POLICY IF EXISTS "Tenant members manage customers" ON public.customers;

CREATE POLICY "Tenant members manage customers" ON public.customers FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage sites" ON public.sites;

DROP POLICY IF EXISTS "Tenant members manage sites" ON public.sites;

CREATE POLICY "Tenant members manage sites" ON public.sites FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;

DROP TRIGGER IF EXISTS "trg_customers_updated" ON public.customers;

CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sites_updated ON public.sites;

DROP TRIGGER IF EXISTS "trg_sites_updated" ON public.sites;

CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
DECLARE
  v_customers INT := 0;
  v_sites INT := 0;
  v_linked INT := 0;
BEGIN
  -- 1. One customer per distinct match key per tenant. Prefer the most
  --    recently used name, phone and email so the record reflects the latest
  --    spelling rather than the oldest typo.
  WITH ranked AS (
    SELECT
      j.tenant_id,
      COALESCE(
        NULLIF(lower(trim(j.customer_email)), ''),
        regexp_replace(lower(trim(j.customer_name)), '[^a-z0-9]', '', 'g')
      ) AS match_key,
      j.customer_name,
      j.customer_email,
      j.customer_phone,
      j.customer_address,
      ROW_NUMBER() OVER (
        PARTITION BY j.tenant_id, COALESCE(
          NULLIF(lower(trim(j.customer_email)), ''),
          regexp_replace(lower(trim(j.customer_name)), '[^a-z0-9]', '', 'g')
        )
        ORDER BY j.created_at DESC
      ) AS rn
    FROM public.jobs j
    WHERE j.customer_id IS NULL
      AND COALESCE(trim(j.customer_name), '') <> ''
  )
  INSERT INTO public.customers (
    tenant_id, name, email, phone, billing_address,
    marketing_consent, marketing_consent_source
  )
  SELECT
    r.tenant_id,
    trim(r.customer_name),
    NULLIF(trim(r.customer_email), ''),
    NULLIF(trim(r.customer_phone), ''),
    NULLIF(trim(r.customer_address), ''),
    -- Existing customers of the business: implied consent under the Spam Act,
    -- never express. The owner upgrades that themselves if they have proof.
    'implied',
    'backfill_from_jobs'
  FROM ranked r
  WHERE r.rn = 1
    AND r.match_key IS NOT NULL
    AND r.match_key <> ''
  ON CONFLICT (tenant_id, match_key) DO NOTHING;

  GET DIAGNOSTICS v_customers = ROW_COUNT;

  -- 2. Point every job at its customer.
  UPDATE public.jobs j
     SET customer_id = c.id
    FROM public.customers c
   WHERE j.customer_id IS NULL
     AND c.tenant_id = j.tenant_id
     AND c.match_key = COALESCE(
           NULLIF(lower(trim(j.customer_email)), ''),
           regexp_replace(lower(trim(j.customer_name)), '[^a-z0-9]', '', 'g')
         );

  GET DIAGNOSTICS v_linked = ROW_COUNT;

  -- 3. One site per distinct address per customer.
  INSERT INTO public.sites (tenant_id, customer_id, address)
  SELECT DISTINCT j.tenant_id, j.customer_id, trim(j.customer_address)
    FROM public.jobs j
   WHERE j.customer_id IS NOT NULL
     AND COALESCE(trim(j.customer_address), '') <> ''
     AND NOT EXISTS (
       SELECT 1 FROM public.sites s
        WHERE s.customer_id = j.customer_id
          AND lower(trim(s.address)) = lower(trim(j.customer_address))
     );

  GET DIAGNOSTICS v_sites = ROW_COUNT;

  -- 4. Point every job at its site.
  UPDATE public.jobs j
     SET site_id = s.id
    FROM public.sites s
   WHERE j.site_id IS NULL
     AND s.customer_id = j.customer_id
     AND lower(trim(s.address)) = lower(trim(j.customer_address));

  RAISE NOTICE 'Backfill complete: % customers, % sites, % jobs linked',
    v_customers, v_sites, v_linked;
END $$;

CREATE OR REPLACE VIEW public.customer_marketing_list AS
SELECT
  c.id,
  c.tenant_id,
  c.name,
  c.email,
  c.phone,
  c.kind,
  c.marketing_consent,
  c.unsubscribe_token,
  c.last_marketed_at,
  COUNT(j.id)                                   AS job_count,
  MAX(j.created_at)                             AS last_job_at,
  MIN(j.created_at)                             AS first_job_at,
  COALESCE(SUM(inv.total_inc_gst), 0)           AS lifetime_value,
  (MAX(j.created_at) < NOW() - INTERVAL '12 months') AS is_lapsed
FROM public.customers c
LEFT JOIN public.jobs j
       ON j.customer_id = c.id
      AND j.status <> 'cancelled'
LEFT JOIN public.job_invoices inv
       ON inv.job_id = j.id
      AND inv.status IN ('paid', 'part_paid')
WHERE c.archived = FALSE
  AND c.email IS NOT NULL
  AND c.marketing_consent IN ('express', 'implied')
GROUP BY c.id;

COMMENT ON VIEW public.customer_marketing_list IS
  'Consented, contactable customers with spend and recency for segmentation. Never includes declined or unsubscribed.';

-- ============================================================
-- ==  024_roles_and_enforcement.sql
-- ==  Owner / Manager / Technician roles in RLS
-- ============================================================

ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;

UPDATE public.tenant_members SET role = 'manager'    WHERE role = 'admin';

UPDATE public.tenant_members SET role = 'technician' WHERE role = 'member';

ALTER TABLE public.tenant_members
  ADD CONSTRAINT tenant_members_role_check
  CHECK (role IN ('owner', 'manager', 'technician'));

INSERT INTO public.tenant_members (tenant_id, user_id, role)
SELECT DISTINCT ON (t.id) t.id, tm.user_id, 'owner'
  FROM public.tenants t
  JOIN public.tenant_members tm ON tm.tenant_id = t.id
 WHERE NOT EXISTS (
   SELECT 1 FROM public.tenant_members o
    WHERE o.tenant_id = t.id AND o.role = 'owner'
 )
 ORDER BY t.id, tm.created_at
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner';

CREATE OR REPLACE FUNCTION public.my_role(p_tenant UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.tenant_members
   WHERE tenant_id = p_tenant AND user_id = auth.uid()
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_office(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
     WHERE tenant_id = p_tenant AND user_id = auth.uid()
       AND role IN ('owner', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
     WHERE tenant_id = p_tenant AND user_id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
     WHERE tenant_id = p_tenant AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.my_role(UUID)  TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_office(UUID) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_owner(UUID)  TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_member(UUID) TO authenticated;

DO $ob$
BEGIN
  IF to_regclass('public.tenant_onboarding') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tenant_onboarding
             ADD COLUMN IF NOT EXISTS technicians_see_all_jobs BOOLEAN NOT NULL DEFAULT FALSE';
  END IF;
END $ob$;

CREATE OR REPLACE FUNCTION public.techs_see_all(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT technicians_see_all_jobs FROM public.tenant_onboarding WHERE tenant_id = p_tenant),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.techs_see_all(UUID) TO authenticated;

DO $jobs$
BEGIN
  IF to_regclass('public.jobs') IS NULL THEN
    RAISE NOTICE 'Skipping job policies: public.jobs does not exist';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "Tenant members read jobs" ON public.jobs';
  EXECUTE 'CREATE POLICY "Tenant members read jobs" ON public.jobs FOR SELECT
    USING (
      public.is_office(tenant_id)
      OR (
        public.is_member(tenant_id)
        AND (public.techs_see_all(tenant_id) OR assigned_to = auth.uid() OR created_by = auth.uid())
      )
    )';

  EXECUTE 'DROP POLICY IF EXISTS "Office writes jobs" ON public.jobs';
  EXECUTE 'CREATE POLICY "Office writes jobs" ON public.jobs FOR INSERT
    WITH CHECK (public.is_office(tenant_id))';

  EXECUTE 'DROP POLICY IF EXISTS "Update own or any if office" ON public.jobs';
  EXECUTE 'CREATE POLICY "Update own or any if office" ON public.jobs FOR UPDATE
    USING (public.is_office(tenant_id) OR assigned_to = auth.uid())
    WITH CHECK (public.is_office(tenant_id) OR assigned_to = auth.uid())';

  EXECUTE 'DROP POLICY IF EXISTS "Office deletes jobs" ON public.jobs';
  EXECUTE 'CREATE POLICY "Office deletes jobs" ON public.jobs FOR DELETE
    USING (public.is_office(tenant_id))';
END $jobs$;

DO $bill$
BEGIN
  IF to_regclass('public.job_billing_items') IS NULL THEN
    RAISE NOTICE 'Skipping billing item policies: table absent';
    RETURN;
  END IF;
  EXECUTE 'ALTER TABLE public.job_billing_items ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "tenant members can read billing items" ON public.job_billing_items';
  EXECUTE 'DROP POLICY IF EXISTS "Owner reads billing items" ON public.job_billing_items';
  EXECUTE 'CREATE POLICY "Owner reads billing items" ON public.job_billing_items FOR SELECT
           USING (public.is_owner(tenant_id))';
  EXECUTE 'DROP POLICY IF EXISTS "Owner writes billing items" ON public.job_billing_items';
  EXECUTE 'CREATE POLICY "Owner writes billing items" ON public.job_billing_items FOR ALL
           USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id))';
END $bill$;

DO $$
BEGIN
  IF to_regclass('public.tenant_price_overrides') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tenant_price_overrides ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Owner manages price overrides" ON public.tenant_price_overrides';
    EXECUTE 'CREATE POLICY "Owner manages price overrides" ON public.tenant_price_overrides FOR ALL
             USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id))';
  END IF;

  IF to_regclass('public.tenant_pricing_settings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tenant_pricing_settings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Owner manages pricing settings" ON public.tenant_pricing_settings';
    EXECUTE 'CREATE POLICY "Owner manages pricing settings" ON public.tenant_pricing_settings FOR ALL
             USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id))';
  END IF;

  IF to_regclass('public.tenant_supplier_accounts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tenant_supplier_accounts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Owner manages supplier accounts" ON public.tenant_supplier_accounts';
    EXECUTE 'CREATE POLICY "Owner manages supplier accounts" ON public.tenant_supplier_accounts FOR ALL
             USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id))';
  END IF;
END $$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'job_invoices', 'job_invoice_items', 'job_variations', 'job_payments', 'purchase_orders'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- job_invoice_items has no tenant_id of its own; it inherits via parent.
      IF t = 'job_invoice_items' THEN
        EXECUTE 'DROP POLICY IF EXISTS "Office manages invoice items" ON public.job_invoice_items';
        EXECUTE 'CREATE POLICY "Office manages invoice items" ON public.job_invoice_items FOR ALL
                 USING (EXISTS (SELECT 1 FROM public.job_invoices i
                                 WHERE i.id = invoice_id AND public.is_office(i.tenant_id)))
                 WITH CHECK (EXISTS (SELECT 1 FROM public.job_invoices i
                                 WHERE i.id = invoice_id AND public.is_office(i.tenant_id)))';

      -- Technicians take payment on site, so payments are readable and
      -- insertable by any member; everything else is office only.
      ELSIF t = 'job_payments' THEN
        EXECUTE 'DROP POLICY IF EXISTS "Members record payments" ON public.job_payments';
        EXECUTE 'CREATE POLICY "Members record payments" ON public.job_payments FOR INSERT
                 WITH CHECK (public.is_member(tenant_id))';
        EXECUTE 'DROP POLICY IF EXISTS "Office reads payments" ON public.job_payments';
        EXECUTE 'CREATE POLICY "Office reads payments" ON public.job_payments FOR SELECT
                 USING (public.is_office(tenant_id))';

      ELSE
        EXECUTE format('DROP POLICY IF EXISTS "Office manages %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Office manages %I" ON public.%I FOR ALL
                        USING (public.is_office(tenant_id))
                        WITH CHECK (public.is_office(tenant_id))', t, t);
      END IF;
    END IF;
  END LOOP;
END $$;

DO $$
BEGIN
  IF to_regclass('public.estimates') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Office manages estimates" ON public.estimates';
    EXECUTE 'CREATE POLICY "Office manages estimates" ON public.estimates FOR ALL
             USING (public.is_office(business_id)) WITH CHECK (public.is_office(business_id))';
  END IF;
END $$;

DROP POLICY IF EXISTS "Tenant members manage customers" ON public.customers;

DROP POLICY IF EXISTS "Office manages customers" ON public.customers;

CREATE POLICY "Office manages customers" ON public.customers FOR ALL
  USING (public.is_office(tenant_id))
  WITH CHECK (public.is_office(tenant_id));

DROP POLICY IF EXISTS "Tenant members manage sites" ON public.sites;

DROP POLICY IF EXISTS "Office manages sites" ON public.sites;

CREATE POLICY "Office manages sites" ON public.sites FOR ALL
  USING (public.is_office(tenant_id))
  WITH CHECK (public.is_office(tenant_id));

DROP POLICY IF EXISTS "Techs read sites for their jobs" ON public.sites;

DROP POLICY IF EXISTS "Techs read sites for their jobs" ON public.sites;

CREATE POLICY "Techs read sites for their jobs" ON public.sites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
       WHERE j.site_id = sites.id
         AND j.assigned_to = auth.uid()
    )
  );

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenant_branding', 'integrations', 'tenant_onboarding'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "Office reads %I" ON public.%I', t, t);
      -- Everyone needs to read branding (it renders on documents) and
      -- onboarding (trades gate the UI), but only an owner may change them.
      EXECUTE format('CREATE POLICY "Office reads %I" ON public.%I FOR SELECT
                      USING (public.is_member(tenant_id))', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Owner writes %I" ON public.%I', t, t);
      EXECUTE format('CREATE POLICY "Owner writes %I" ON public.%I FOR ALL
                      USING (public.is_owner(tenant_id))
                      WITH CHECK (public.is_owner(tenant_id))', t, t);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Tenant admins can insert members" ON public.tenant_members;

DROP POLICY IF EXISTS "Owner adds members" ON public.tenant_members;

CREATE POLICY "Owner adds members" ON public.tenant_members FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_owner(tenant_id)
    OR (user_id = auth.uid() AND role = 'owner')   -- creating your own workspace
  );

DROP POLICY IF EXISTS "Tenant admins can delete members" ON public.tenant_members;

DROP POLICY IF EXISTS "Owner removes members" ON public.tenant_members;

CREATE POLICY "Owner removes members" ON public.tenant_members FOR DELETE
  USING (public.is_owner(tenant_id));

DROP POLICY IF EXISTS "Owner changes roles" ON public.tenant_members;

DROP POLICY IF EXISTS "Owner changes roles" ON public.tenant_members;

CREATE POLICY "Owner changes roles" ON public.tenant_members FOR UPDATE
  USING (public.is_owner(tenant_id))
  WITH CHECK (public.is_owner(tenant_id));

COMMENT ON FUNCTION public.is_office(UUID) IS
  'True when the current user is an owner or manager of this tenant. Use in policies rather than repeating the subquery.';

-- ============================================================
-- ==  025_assets_and_compliance.sql
-- ==  Assets, test history, compliance register
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $set_updated_at$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$set_updated_at$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.asset_types (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  default_interval_months INT,
  standard_ref TEXT,
  sort_order INT NOT NULL DEFAULT 0
);

INSERT INTO public.asset_types (key, label, default_interval_months, standard_ref, sort_order) VALUES
  ('switchboard',    'Switchboard',              12, 'AS/NZS 3000',  10),
  ('rcd',            'RCD / safety switch',       12, 'AS/NZS 3760',  20),
  ('exit_emergency', 'Exit & emergency lighting',  6, 'AS/NZS 2293',  30),
  ('test_and_tag',   'Portable appliance',        12, 'AS/NZS 3760',  40),
  ('solar_pv',       'Solar PV system',           24, 'AS/NZS 5033',  50),
  ('evse',           'EV charger',                12, 'AS/NZS 3000',  60),
  ('hot_water',      'Hot water system',          NULL, NULL,         70),
  ('switchroom',     'Switchroom / MSB',          12, 'AS/NZS 3000',  80),
  ('generator',      'Generator / UPS',           12, NULL,           90),
  ('other',          'Other equipment',           NULL, NULL,        100)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  default_interval_months = EXCLUDED.default_interval_months,
  standard_ref = EXCLUDED.standard_ref,
  sort_order = EXCLUDED.sort_order;

ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone signed in reads asset types" ON public.asset_types;

DROP POLICY IF EXISTS "Anyone signed in reads asset types" ON public.asset_types;

CREATE POLICY "Anyone signed in reads asset types" ON public.asset_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,

  asset_type TEXT NOT NULL REFERENCES public.asset_types(key),
  label TEXT NOT NULL,                    -- 'Main switchboard', 'Board B, level 2'
  location_note TEXT,                     -- 'Garage, behind the door'

  make TEXT,
  model TEXT,
  serial_number TEXT,
  install_date DATE,
  rating TEXT,                            -- '63A 3 phase', '6.6kW'

  -- ── Compliance scheduling ──
  test_interval_months INT,               -- overrides the type default
  last_tested_at DATE,
  next_test_due DATE,
  -- What this test is usually worth, so the business can see the value of
  -- the work sitting in front of them rather than guessing.
  typical_test_value NUMERIC(10, 2),

  -- Scan on arrival rather than hunting through a list
  qr_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'decommissioned', 'replaced')),
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_tenant ON public.assets(tenant_id);

CREATE INDEX IF NOT EXISTS idx_assets_customer ON public.assets(customer_id);

CREATE INDEX IF NOT EXISTS idx_assets_site ON public.assets(site_id);

CREATE INDEX IF NOT EXISTS idx_assets_due
  ON public.assets(tenant_id, next_test_due)
  WHERE status = 'active' AND next_test_due IS NOT NULL;

DO $ts$
BEGIN
  IF to_regclass('public.job_test_sheets') IS NULL THEN
    RAISE NOTICE 'public.job_test_sheets absent: skipping asset link. Run migration 009, then re-run this file.';
    RETURN;
  END IF;
  EXECUTE 'ALTER TABLE public.job_test_sheets
             ADD COLUMN IF NOT EXISTS asset_id UUID REFERENCES public.assets(id) ON DELETE SET NULL';
  EXECUTE 'CREATE INDEX IF NOT EXISTS idx_test_sheets_asset ON public.job_test_sheets(asset_id)';
END $ts$;

CREATE OR REPLACE FUNCTION public.bump_asset_test_dates()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interval INT;
BEGIN
  IF NEW.asset_id IS NULL OR NEW.status <> 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(a.test_interval_months, t.default_interval_months)
    INTO v_interval
    FROM public.assets a
    LEFT JOIN public.asset_types t ON t.key = a.asset_type
   WHERE a.id = NEW.asset_id;

  UPDATE public.assets
     SET last_tested_at = COALESCE(NEW.test_date, CURRENT_DATE),
         next_test_due  = CASE
           WHEN v_interval IS NULL THEN NULL
           ELSE COALESCE(NEW.test_date, CURRENT_DATE) + (v_interval || ' months')::interval
         END::date,
         updated_at = NOW()
   WHERE id = NEW.asset_id;

  RETURN NEW;
END;
$$;

DO $trg$
BEGIN
  IF to_regclass('public.job_test_sheets') IS NULL THEN RETURN; END IF;
  EXECUTE 'DROP TRIGGER IF EXISTS trg_bump_asset_dates ON public.job_test_sheets';
  EXECUTE 'CREATE TRIGGER trg_bump_asset_dates
             AFTER INSERT OR UPDATE OF status, test_date, asset_id ON public.job_test_sheets
             FOR EACH ROW EXECUTE FUNCTION public.bump_asset_test_dates()';
END $trg$;

DROP TRIGGER IF EXISTS trg_assets_updated ON public.assets;

DROP TRIGGER IF EXISTS "trg_assets_updated" ON public.assets;

CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office manages assets" ON public.assets;

DROP POLICY IF EXISTS "Office manages assets" ON public.assets;

CREATE POLICY "Office manages assets" ON public.assets FOR ALL
  USING (public.is_office(tenant_id))
  WITH CHECK (public.is_office(tenant_id));

DROP POLICY IF EXISTS "Techs read assets on their jobs" ON public.assets;

DROP POLICY IF EXISTS "Techs read assets on their jobs" ON public.assets;

CREATE POLICY "Techs read assets on their jobs" ON public.assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
       WHERE j.assigned_to = auth.uid()
         AND (j.site_id = assets.site_id OR j.customer_id = assets.customer_id)
    )
  );

CREATE OR REPLACE VIEW public.compliance_register AS
SELECT
  a.id,
  a.tenant_id,
  a.label,
  a.asset_type,
  t.label            AS asset_type_label,
  t.standard_ref,
  a.location_note,
  a.make,
  a.model,
  a.serial_number,
  a.status,
  a.qr_token,
  a.last_tested_at,
  a.next_test_due,
  a.typical_test_value,
  c.id               AS customer_id,
  c.name             AS customer_name,
  c.email            AS customer_email,
  s.id               AS site_id,
  s.address          AS site_address,
  (a.next_test_due - CURRENT_DATE)                       AS days_until_due,
  (a.next_test_due IS NOT NULL AND a.next_test_due < CURRENT_DATE) AS is_overdue,
  (SELECT COUNT(*) FROM public.job_test_sheets ts
    WHERE ts.asset_id = a.id AND ts.status = 'completed')  AS tests_recorded
FROM public.assets a
LEFT JOIN public.asset_types t ON t.key = a.asset_type
LEFT JOIN public.customers c   ON c.id = a.customer_id
LEFT JOIN public.sites s       ON s.id = a.site_id
WHERE a.status = 'active';

COMMENT ON VIEW public.compliance_register IS
  'Active assets with owner, site, next due date and typical value. Drives the compliance calendar.';

-- ============================================================
-- ==  026_storage_buckets.sql
-- ==  Storage buckets for logos, plans and photos
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('branding',         'branding',         FALSE,  5 * 1024 * 1024,
     ARRAY['image/png','image/jpeg','image/svg+xml','image/webp']),
  ('job-plans',        'job-plans',        FALSE, 50 * 1024 * 1024, NULL),
  ('job-photos',       'job-photos',       FALSE, 20 * 1024 * 1024,
     ARRAY['image/png','image/jpeg','image/webp','image/heic']),
  ('form-attachments', 'form-attachments', FALSE, 20 * 1024 * 1024, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $storage$
DECLARE
  b TEXT;
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE NOTICE 'storage.objects not present, skipping storage policies';
    RETURN;
  END IF;

  FOREACH b IN ARRAY ARRAY['branding','job-plans','job-photos','form-attachments'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_read');
    EXECUTE format($p$
      CREATE POLICY %I ON storage.objects FOR SELECT
        USING (
          bucket_id = %L
          AND (storage.foldername(name))[1] IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
          )
        )$p$, b || '_read', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_write');
    EXECUTE format($p$
      CREATE POLICY %I ON storage.objects FOR INSERT
        WITH CHECK (
          bucket_id = %L
          AND (storage.foldername(name))[1] IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
          )
        )$p$, b || '_write', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_update');
    EXECUTE format($p$
      CREATE POLICY %I ON storage.objects FOR UPDATE
        USING (
          bucket_id = %L
          AND (storage.foldername(name))[1] IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
          )
        )$p$, b || '_update', b);

    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', b || '_delete');
    EXECUTE format($p$
      CREATE POLICY %I ON storage.objects FOR DELETE
        USING (
          bucket_id = %L
          AND (storage.foldername(name))[1] IN (
            SELECT tenant_id::text FROM public.tenant_members WHERE user_id = auth.uid()
          )
        )$p$, b || '_delete', b);
  END LOOP;
END $storage$;

-- ============================================================
-- ==  027_estimate_items_rls.sql
-- ==  Quote line item RLS policies
-- ============================================================

DROP POLICY IF EXISTS "Users can view estimates for their business"   ON public.estimates;

DROP POLICY IF EXISTS "Users can insert estimates for their business" ON public.estimates;

DROP POLICY IF EXISTS "Users can update estimates for their business" ON public.estimates;

DROP POLICY IF EXISTS "Users can delete estimates for their business" ON public.estimates;

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office manages estimates" ON public.estimates;

DROP POLICY IF EXISTS "Office manages estimates" ON public.estimates;

CREATE POLICY "Office manages estimates" ON public.estimates FOR ALL
  USING (public.is_office(business_id))
  WITH CHECK (public.is_office(business_id));

ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view estimate items for their business"   ON public.estimate_items;

DROP POLICY IF EXISTS "Users can insert estimate items for their business" ON public.estimate_items;

DROP POLICY IF EXISTS "Users can update estimate items for their business" ON public.estimate_items;

DROP POLICY IF EXISTS "Users can delete estimate items for their business" ON public.estimate_items;

DROP POLICY IF EXISTS "Office manages estimate items" ON public.estimate_items;

DROP POLICY IF EXISTS "Office manages estimate items" ON public.estimate_items;

CREATE POLICY "Office manages estimate items" ON public.estimate_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.estimates e
       WHERE e.id = estimate_items.estimate_id
         AND public.is_office(e.business_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.estimates e
       WHERE e.id = estimate_items.estimate_id
         AND public.is_office(e.business_id)
    )
  );

CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id
  ON public.estimate_items(estimate_id);

-- ============================================================
-- ==  demo_walkthrough.sql
-- ==  Voltaic Electrical demo workspace (separate tenant)
-- ============================================================

DO $$
DECLARE
  -- Your login. Used only to add you to the demo workspace so it shows up in
  -- your switcher. Your own workspace is not touched.
  v_you_email TEXT := 'jack.gapes@outlook.com';
  v_you UUID;

  -- The demo workspace and its people. Fixed ids so re-runs reuse them.
  v_tenant UUID := 'fdec0000-0000-4000-8000-000000000001';
  v_owner  UUID := 'e1000000-0000-4000-8000-000000000000'; -- demo@
  v_dave   UUID := 'e1000000-0000-4000-8000-000000000001'; -- manager
  v_sam    UUID := 'e1000000-0000-4000-8000-000000000002'; -- electrician
  v_priya  UUID := 'e1000000-0000-4000-8000-000000000003'; -- electrician
  v_josh   UUID := 'e1000000-0000-4000-8000-000000000004'; -- apprentice
  v_pw     TEXT := 'demo1234';

  v_mon DATE := date_trunc('week', CURRENT_DATE)::date;
  t TEXT;
BEGIN
  IF to_regclass('public.customers') IS NULL OR to_regclass('public.assets') IS NULL THEN
    RAISE EXCEPTION 'Run RUN_ALL.sql first: the customers and assets tables do not exist yet.';
  END IF;

  -- ── People ────────────────────────────────────────────────
  -- The token columns below have no default and GoTrue scans them into plain
  -- Go strings, which cannot hold NULL. Leaving them out produced rows that
  -- broke sign in for EVERY account with "Database error querying schema" —
  -- the query fails before any password is checked. GoTrue's own inserts write
  -- empty strings, so these must too. See FIX_AUTH_NULL_TOKENS.sql.
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new,
    email_change_token_current, phone_change_token, reauthentication_token,
    email_change, phone_change)
  SELECT c.id, '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
         c.email, crypt(v_pw, gen_salt('bf')), NOW(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', c.nm), NOW(), NOW(),
         '', '', '', '', '', '', '', ''
  FROM (VALUES
    (v_owner,'demo@voltaicelectrical.com.au','Alex Voltaic'),
    (v_dave, 'dave@voltaicelectrical.com.au','Dave Nguyen'),
    (v_sam,  'sam@voltaicelectrical.com.au','Sam Ellis'),
    (v_priya,'priya@voltaicelectrical.com.au','Priya Raman'),
    (v_josh, 'josh@voltaicelectrical.com.au','Josh Tapu')
  ) AS c(id,email,nm)
  ON CONFLICT (id) DO NOTHING;

  -- ── The workspace ─────────────────────────────────────────
  INSERT INTO public.tenants (id, name, slug, abn, phone, website,
                              work_day_start, work_day_end, working_days)
  VALUES (v_tenant, 'Voltaic Electrical (demo)', 'voltaic-electrical-demo',
          '54 812 447 903', '07 3268 4410', 'https://voltaicelectrical.com.au',
          '07:00', '16:00', ARRAY[1,2,3,4,5])
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, abn = EXCLUDED.abn, phone = EXCLUDED.phone,
    website = EXCLUDED.website, work_day_start = EXCLUDED.work_day_start,
    work_day_end = EXCLUDED.work_day_end, working_days = EXCLUDED.working_days;

  INSERT INTO public.profiles (id, full_name, email, default_tenant_id, phone, vehicle, qualifications, licences)
  SELECT c.id, c.nm, c.em, v_tenant, c.ph, c.veh, c.q, c.l
  FROM (VALUES
    (v_owner,'Alex Voltaic','demo@voltaicelectrical.com.au','0400 111 222','Amarok DEMO1',ARRAY['A Grade Electrical','Electrical Contractor'],ARRAY['QLD Electrical Contractor 88421']),
    (v_dave,'Dave Nguyen','dave@voltaicelectrical.com.au','0412 884 201','Hilux 1ABC234',ARRAY['A Grade Electrical','Test and Tag'],ARRAY['QLD Electrical Mechanic 88999']),
    (v_sam,'Sam Ellis','sam@voltaicelectrical.com.au','0413 992 118','Transit 2DEF567',ARRAY['A Grade Electrical'],ARRAY['QLD Electrical Mechanic 91223']),
    (v_priya,'Priya Raman','priya@voltaicelectrical.com.au','0431 507 664','Ranger 3GHI890',ARRAY['A Grade Electrical','Solar Accreditation'],ARRAY['QLD Electrical Mechanic 90887']),
    (v_josh,'Josh Tapu','josh@voltaicelectrical.com.au','0422 316 745','Shared van',ARRAY['3rd year apprentice'],ARRAY[]::TEXT[])
  ) AS c(id,nm,em,ph,veh,q,l)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name, default_tenant_id = EXCLUDED.default_tenant_id,
    phone = EXCLUDED.phone, vehicle = EXCLUDED.vehicle,
    qualifications = EXCLUDED.qualifications, licences = EXCLUDED.licences;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  SELECT v_tenant, c.id, c.r FROM (VALUES
    (v_owner,'owner'), (v_dave,'manager'),
    (v_sam,'technician'), (v_priya,'technician'), (v_josh,'technician')
  ) AS c(id,r)
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Add you as an owner so the demo appears in your workspace switcher.
  -- Your own default_tenant_id is left alone: you still land in your business.
  SELECT id INTO v_you FROM auth.users WHERE lower(email) = lower(v_you_email);
  IF v_you IS NOT NULL THEN
    INSERT INTO public.tenant_members (tenant_id, user_id, role)
    VALUES (v_tenant, v_you, 'owner')
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner';
    RAISE NOTICE 'Added % to the demo workspace. Use the switcher, top right.', v_you_email;
  END IF;

  -- ── Reset the demo workspace only ─────────────────────────
  -- Scoped entirely to v_tenant, which nothing but this file writes to.
  IF to_regclass('public.job_invoice_items') IS NOT NULL THEN
    DELETE FROM public.job_invoice_items WHERE invoice_id IN
      (SELECT id FROM public.job_invoices WHERE tenant_id = v_tenant);
  END IF;
  DELETE FROM public.estimate_items WHERE estimate_id IN
    (SELECT id FROM public.estimates WHERE business_id = v_tenant);

  FOREACH t IN ARRAY ARRAY[
    'public.job_test_sheets','public.job_photos','public.job_reports','public.job_events',
    'public.job_billing_items','public.job_payments','public.job_variations','public.job_invoices',
    'public.time_entries','public.company_announcements','public.assets','public.sites',
    'public.customers','public.jobs'
  ] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('DELETE FROM %s WHERE tenant_id = $1', t) USING v_tenant;
    END IF;
  END LOOP;
  DELETE FROM public.estimates WHERE business_id = v_tenant;

  -- ── Setup marked complete, so no wizard on the way in ─────
  INSERT INTO public.tenant_onboarding (
    tenant_id, trades, business_size, gst_registered, timezone, currency,
    address, business_email, wholesaler_keys, accounting_provider,
    completed_steps, status, tour_completed, completed_at, technicians_see_all_jobs
  ) VALUES (
    v_tenant, ARRAY['electrical'], 'small', TRUE, 'Australia/Brisbane', 'AUD',
    '14 Kingsford Smith Dr, Hamilton QLD 4007', 'accounts@voltaicelectrical.com.au',
    ARRAY['middys','rexel'], 'xero',
    ARRAY['business','trades','branding','wholesalers','integrations','team','tour'],
    'completed', TRUE, NOW(), FALSE)
  ON CONFLICT (tenant_id) DO UPDATE SET
    trades = EXCLUDED.trades, business_size = EXCLUDED.business_size,
    gst_registered = EXCLUDED.gst_registered, address = EXCLUDED.address,
    business_email = EXCLUDED.business_email, wholesaler_keys = EXCLUDED.wholesaler_keys,
    accounting_provider = EXCLUDED.accounting_provider,
    completed_steps = EXCLUDED.completed_steps, status = 'completed',
    tour_completed = TRUE, technicians_see_all_jobs = FALSE;

  INSERT INTO public.tenant_branding (tenant_id, electrical_license, trading_name, business_address)
  VALUES (v_tenant, 'QLD Electrical Contractor 88421', 'Voltaic Electrical',
          '14 Kingsford Smith Dr, Hamilton QLD 4007')
  ON CONFLICT (tenant_id) DO UPDATE SET
    electrical_license = EXCLUDED.electrical_license,
    trading_name = EXCLUDED.trading_name;

  -- ── Customers ─────────────────────────────────────────────
  INSERT INTO public.customers (id, tenant_id, name, kind, email, phone, billing_address, marketing_consent, marketing_consent_source)
  SELECT ('c0000000-0000-4000-8000-' || lpad(c.n::text,12,'0'))::uuid,
         v_tenant, c.nm, c.k, c.em, c.ph, c.addr, c.consent, 'demo_seed'
  FROM (VALUES
    ( 1,'Northgate Business Park','commercial','facilities@northgatepark.com.au','07 3260 4477','460 Nudgee Rd, Hendra QLD','express'),
    ( 2,'Meridian Property','agent','repairs@meridianproperty.com.au','07 3010 8866','3 Toorak Rd, Hamilton QLD','express'),
    ( 3,'Portside Logistics','commercial','maintenance@portsidelog.com.au','07 3268 5510','120 MacArthur Ave, Pinkenba QLD','express'),
    ( 4,'Riverbend Cafe','commercial','hello@riverbendcafe.com.au','07 3862 9014','188 Racecourse Rd, Ascot QLD','implied'),
    ( 5,'Hamilton Wharf Apartments','strata','bc@hamiltonwharf.com.au','07 3268 1180','7 Hercules St, Hamilton QLD','express'),
    ( 6,'Lumen Retail Group','commercial','projects@lumenretail.com.au','07 3891 2200','Shop 4, 210 Given Tce, Paddington QLD','implied'),
    ( 7,'Hendra Joinery','builder','admin@hendrajoinery.com.au','07 3268 7742','9 Zillmere Rd, Boondall QLD','implied'),
    ( 8,'Acme Corp','commercial','accounts@acmecorp.com.au','07 3216 8890','14 Kingsford Smith Dr, Hamilton QLD','express'),
    ( 9,'The Fletchers','residential','jenny.fletcher@outlook.com','0417 220 986','31 Sandgate Rd, Clayfield QLD','implied'),
    (10,'M. Cavendish','residential','mcavendish@bigpond.com','0409 771 233','8 Rosebank Ave, Ascot QLD','implied'),
    (11,'T. Beaumont','residential','tbeaumont@outlook.com','0404 337 118','66 Alexandra Rd, Ascot QLD','declined'),
    (12,'D. Okafor','residential','dokafor@bigpond.com','0426 553 811','77 Days Rd, Grange QLD','implied')
  ) AS c(n,nm,k,em,ph,addr,consent);

  -- ── Sites ─────────────────────────────────────────────────
  INSERT INTO public.sites (id, tenant_id, customer_id, label, address, access_notes, switchboard_location)
  SELECT ('50000000-0000-4000-8000-' || lpad(s.n::text,12,'0'))::uuid,
         v_tenant, ('c0000000-0000-4000-8000-' || lpad(s.cust::text,12,'0'))::uuid,
         s.lbl, s.addr, s.access, s.sb
  FROM (VALUES
    ( 1, 1,'Main building','460 Nudgee Rd, Hendra QLD','Report to reception, sign in','Level 1 riser cupboard'),
    ( 2, 1,'Warehouse B','462 Nudgee Rd, Hendra QLD','Roller door 3, code 4417','North wall, near office'),
    ( 3, 2,'3 Toorak Rd','3 Toorak Rd, Hamilton QLD','Key safe by front gate, 2208','Garage'),
    ( 4, 2,'58 Barlow St Unit 3','3/58 Barlow St, Clayfield QLD','Tenant home after 3pm','Hallway cupboard'),
    ( 5, 2,'12 Oxford St','12 Oxford St, Bulimba QLD','Dog in yard, friendly','Side of house'),
    ( 6, 3,'Distribution centre','120 MacArthur Ave, Pinkenba QLD','Site induction required, hi vis and boots','MSB room, ground floor'),
    ( 7, 4,'Racecourse Rd cafe','188 Racecourse Rd, Ascot QLD','Before 7am or after 3pm only','Behind the coffee machine'),
    ( 8, 5,'Tower A common areas','7 Hercules St, Hamilton QLD','Building manager on site 8 to 4','Basement plant room'),
    ( 9, 5,'Tower B common areas','9 Hercules St, Hamilton QLD','Building manager on site 8 to 4','Basement plant room'),
    (10, 6,'Paddington store','Shop 4, 210 Given Tce, Paddington QLD','Trade access via rear lane','Store room'),
    (11, 6,'Newstead store','Shop 12, 15 Longland St, Newstead QLD','Centre management induction','Back of house'),
    (12, 7,'Boondall workshop','9 Zillmere Rd, Boondall QLD','Gate open 6am to 4pm','Workshop wall'),
    (13, 8,'Head office','14 Kingsford Smith Dr, Hamilton QLD','Reception, level 2','Comms room'),
    (14, 9,'Home','31 Sandgate Rd, Clayfield QLD',NULL,'Laundry'),
    (15,10,'Home','8 Rosebank Ave, Ascot QLD','Park in driveway','Garage'),
    (16,11,'Home','66 Alexandra Rd, Ascot QLD',NULL,'Pool pump shed'),
    (17,12,'Home','77 Days Rd, Grange QLD',NULL,'Under stairs'),
    (18, 3,'Yard office','118 MacArthur Ave, Pinkenba QLD','Same induction as main site','Portable office')
  ) AS s(n,cust,lbl,addr,access,sb);

  -- ── Assets ────────────────────────────────────────────────
  INSERT INTO public.assets (
    id, tenant_id, customer_id, site_id, asset_type, label, location_note,
    make, model, rating, test_interval_months, last_tested_at, next_test_due,
    typical_test_value, install_date)
  SELECT ('a0000000-0000-4000-8000-' || lpad(a.n::text,12,'0'))::uuid,
         v_tenant,
         ('c0000000-0000-4000-8000-' || lpad(a.cust::text,12,'0'))::uuid,
         ('50000000-0000-4000-8000-' || lpad(a.site::text,12,'0'))::uuid,
         a.typ, a.lbl, a.loc, a.mk, a.mdl, a.rt, a.iv,
         (CURRENT_DATE + a.last_off)::date, (CURRENT_DATE + a.due_off)::date,
         a.val, (CURRENT_DATE - (a.age_yrs * 365))::date
  FROM (VALUES
    ( 1, 1, 1,'switchboard','Main switchboard','Level 1 riser','Clipsal','MAX9','400V 3ph',12,-395,-30, 680.00, 8),
    ( 2, 1, 1,'exit_emergency','Exit & emergency, level 1','Throughout','Clevertronics','L10',NULL, 6,-210,-28, 940.00, 6),
    ( 3, 1, 2,'switchboard','Warehouse B board','North wall','NHP','Concept','400V 3ph',12,-400,-35, 620.00,10),
    ( 4, 3, 6,'switchroom','MSB, distribution centre','MSB room','Schneider','Prisma','800A 3ph',12,-410,-45,1450.00,12),
    ( 5, 3, 6,'exit_emergency','Exit & emergency, warehouse','Throughout','Clevertronics','L10',NULL, 6,-200,-18,1180.00, 7),
    ( 6, 5, 8,'switchboard','Tower A basement board','Plant room','NHP','Concept','400V 3ph',12,-390,-25, 720.00, 9),
    ( 7, 5, 8,'exit_emergency','Exit & emergency, Tower A','Common areas','Legrand','Emergi-Lite',NULL, 6,-195,-13, 860.00, 9),
    ( 8, 6,10,'switchboard','Paddington tenancy board','Store room','Clipsal','MAX9','230V 1ph',12,-380,-15, 480.00, 4),
    ( 9, 1, 1,'rcd','RCD bank, level 1','Main board','Clipsal','RCBO',NULL,12,-340, 25, 380.00, 8),
    (10, 2, 3,'switchboard','3 Toorak Rd board','Garage','Hager','Golf','230V 1ph',12,-330, 35, 420.00, 5),
    (11, 4, 7,'switchboard','Cafe main board','Behind machine','NHP','Concept','230V 1ph',12,-320, 45, 460.00, 6),
    (12, 5, 9,'switchboard','Tower B basement board','Plant room','NHP','Concept','400V 3ph',12,-325, 40, 720.00, 9),
    (13, 5, 9,'exit_emergency','Exit & emergency, Tower B','Common areas','Legrand','Emergi-Lite',NULL, 6,-140, 40, 860.00, 9),
    (14, 7,12,'switchboard','Workshop board','Workshop wall','Clipsal','MAX9','400V 3ph',12,-315, 50, 540.00, 7),
    (15, 8,13,'switchboard','Head office board','Comms room','Schneider','Acti9','400V 3ph',12,-310, 55, 680.00, 3),
    (16, 6,11,'switchboard','Newstead tenancy board','Back of house','Clipsal','MAX9','230V 1ph',12,-305, 58, 480.00, 2),
    (17, 1, 1,'test_and_tag','Office appliances, level 1','Throughout',NULL,NULL,NULL,12,-120,245, 540.00, 5),
    (18, 3, 6,'test_and_tag','Warehouse appliances','Throughout',NULL,NULL,NULL,12,-110,255, 780.00, 6),
    (19, 3,18,'switchboard','Yard office board','Portable office','Hager','Golf','230V 1ph',12,-100,265, 380.00, 4),
    (20, 2, 4,'switchboard','Unit 3 board','Hallway','Clipsal','MAX9','230V 1ph',12, -95,270, 380.00, 1),
    (21, 2, 5,'switchboard','12 Oxford St board','Side of house','Hager','Golf','230V 1ph',12, -90,275, 380.00, 3),
    (22, 9,14,'switchboard','House board','Laundry','Clipsal','MAX9','230V 1ph',12, -60,305, 340.00, 1),
    (23, 9,14,'rcd','Kitchen & power RCDs','Main board','Clipsal','RCBO',NULL,12, -60,305, 220.00, 1),
    (24,10,15,'evse','EV charger','Garage','Tesla','Wall Connector','7kW',12, -55,310, 260.00, 1),
    (25,10,15,'switchboard','House board','Garage','Hager','Golf','230V 1ph',12, -55,310, 340.00,15),
    (26,12,17,'switchboard','House board','Under stairs','Clipsal','MAX9','230V 1ph',12, -45,320, 340.00,12),
    (27, 4, 7,'rcd','Kitchen equipment RCDs','Main board','NHP','RCBO',NULL,12, -40,325, 280.00, 6),
    (28, 8,13,'solar_pv','Rooftop solar','Roof, north face','Fronius','Primo','10kW',24, -30,700, 420.00, 3),
    (29, 7,12,'generator','Backup generator','Rear of workshop','Kohler','20REZG','20kVA',12, -25,340, 560.00, 5),
    (30,11,16,'other','Pool pump circuit','Pump shed',NULL,NULL,'230V 1ph',12, -20,345, NULL, 4)
  ) AS a(n,cust,site,typ,lbl,loc,mk,mdl,rt,iv,last_off,due_off,val,age_yrs);

  -- One asset with no schedule at all, so the "nothing will ever fall due"
  -- gap is visible on the compliance page.
  UPDATE public.assets
     SET last_tested_at = NULL, next_test_due = NULL, test_interval_months = NULL
   WHERE id = 'a0000000-0000-4000-8000-000000000030';

  RAISE NOTICE 'Demo workspace: people, customers, sites and assets in.';
END $$;

DO $$
DECLARE
  v_tenant UUID := 'fdec0000-0000-4000-8000-000000000001';
  v_owner  UUID := 'e1000000-0000-4000-8000-000000000000';
  v_dave   UUID := 'e1000000-0000-4000-8000-000000000001';
  v_sam    UUID := 'e1000000-0000-4000-8000-000000000002';
  v_priya  UUID := 'e1000000-0000-4000-8000-000000000003';
  v_josh   UUID := 'e1000000-0000-4000-8000-000000000004';
  v_mon DATE := date_trunc('week', CURRENT_DATE)::date;
BEGIN
  -- This week: Monday to Friday, two to five jobs a day.
  INSERT INTO public.jobs (
    id, tenant_id, customer_id, site_id, title, description, status, priority,
    estimated_hours, due_date, scheduled_start, quote_total, gst_rate,
    created_by, assigned_to, customer_name, customer_phone, customer_email,
    customer_address, created_at, updated_at)
  SELECT ('d0000000-0000-4000-8000-' || lpad(j.n::text,12,'0'))::uuid,
         v_tenant, c.id, s.id, j.title, j.descr, j.status, j.pri, j.hrs,
         (v_mon + j.day)::date,
         (v_mon + j.day)::timestamptz + j.start_at,
         j.total, 10.0, v_owner,
         CASE j.crew WHEN 1 THEN v_dave WHEN 2 THEN v_sam WHEN 3 THEN v_priya ELSE v_josh END,
         c.name, c.phone, c.email, s.address,
         (v_mon + j.day - 14)::timestamptz, NOW()
    FROM (VALUES
    ( 1, 0,'07:00'::time,'Switchboard upgrade','Replace ceramic fuse board with 18 way, 6 RCBOs, main switch and SPD.','completed','high',  8.0, 3480.00, 8,13,1),
    ( 2, 0,'07:30'::time,'Annual RCD test','RCD trip testing and certificate, level 1 main board.','completed','medium',  4.0,  380.00, 1, 1,2),
    ( 3, 0,'11:00'::time,'No power to GPOs','Half the kitchen circuits dead. Traced to a failed RCBO.','completed','urgent',  2.5,  420.00, 9,14,3),
    ( 4, 0,'12:30'::time,'Exit light repair','Two fittings failed discharge test, batteries replaced.','completed','medium',  3.0,  340.00, 5, 8,4),
    ( 5, 1,'07:00'::time,'Warehouse LED highbay','Replace 28 metal halide highbays with LED, EWP hire.','completed','medium',  8.5, 4200.00, 3, 6,1),
    ( 6, 1,'07:00'::time,'Exit & emergency, six monthly','Discharge test 34 fittings, log book updated.','completed','medium',  6.0, 1180.00, 3, 6,2),
    ( 7, 1,'07:30'::time,'EV charger install','7kW single phase wall charger, dedicated 32A circuit.','completed','medium',  7.5, 2650.00,10,15,3),
    ( 8, 1,'07:30'::time,'Smoke alarm compliance','Interconnected photoelectric alarms, 4 bedrooms.','completed','high',  4.0, 1240.00, 2, 3,4),
    ( 9, 1,'13:30'::time,'Fault find, cafe','RCD tripping overnight. Insulation testing all circuits.','completed','urgent',  2.0,  380.00, 4, 7,2),
    (10, 2,'07:00'::time,'Tower A board test','Annual test and certificate, basement main board.','completed','high',  6.0,  720.00, 5, 8,1),
    (11, 2,'07:00'::time,'Retail fitout stage 2','Track lighting, feature pendants, 14 GPOs. Stage 2 of a five day fitout, day three booked today.','in_progress','high',  8.5,14800.00, 6,10,3),
    (12, 2,'07:30'::time,'Hot water changeover','Decommission storage unit, new 20A circuit for heat pump.','completed','medium',  5.5, 1690.00,12,17,2),
    (13, 3,'07:00'::time,'MSB annual test','Distribution centre main switchboard, full test sheet.','in_progress','high',  8.0, 1450.00, 3, 6,1),
    (14, 3,'07:00'::time,'Data cabling, 12 points','Cat6 to 12 workstations, Fluke certification. Two day job, day one booked today.','open','medium',  9.0, 5340.00, 1, 1,2),
    (15, 2,'08:00'::time,'Ceiling fan install x4','Four DC fans with wall controllers.','open','low',  5.0, 1420.00,12,17,4),
    (16, 3,'08:00'::time,'Defect rectification','Bonding and labelling defects from level 2 inspection.','open','urgent',  4.0,  890.00, 7,12,4),
    (17, 4,'07:00'::time,'Three phase upgrade','Upgrade to three phase supply, coordinate with Energex. Three day job, day one booked today.','open','high',  9.0, 9450.00, 7,12,1),
    (18, 4,'07:30'::time,'Solar inverter fault','Fronius reporting State 522, rooftop MC4 connector.','open','high',  4.5,  780.00, 8,13,3),
    (19, 4,'07:30'::time,'Pool equipment circuit','New RCD protected circuit to pump and chlorinator.','open','medium',  6.5, 1980.00,11,16,2)
    ) AS j(n, day, start_at, title, descr, status, pri, hrs, total, cust, site, crew)
    JOIN public.customers c ON c.id = ('c0000000-0000-4000-8000-' || lpad(j.cust::text,12,'0'))::uuid
    JOIN public.sites s     ON s.id = ('50000000-0000-4000-8000-' || lpad(j.site::text,12,'0'))::uuid;

  -- Eight weeks of history so the dashboard and P&L have shape.
  INSERT INTO public.jobs (
    id, tenant_id, customer_id, site_id, title, description, status, priority,
    estimated_hours, due_date, scheduled_start, quote_total, gst_rate,
    created_by, assigned_to, customer_name, customer_phone, customer_email,
    customer_address, created_at, updated_at)
  SELECT ('d0000000-0000-4000-8000-' || lpad((100 + g.n)::text,12,'0'))::uuid,
         v_tenant, c.id, s.id,
         (ARRAY['Switchboard upgrade','Annual RCD test','Exit & emergency test','Fault find',
                'GPO additions','Lighting upgrade','Smoke alarm compliance','Test and tag',
                'Rewire, partial','EV charger install'])[1 + (g.n % 10)],
         'Completed work from the last two months.',
         'completed',
         (ARRAY['low','medium','high'])[1 + (g.n % 3)],
         (3 + (g.n % 8))::numeric,
         (v_mon - ((g.n % 40) + 5))::date,
         (v_mon - ((g.n % 40) + 5))::timestamptz + interval '7 hours',
         (380 + (g.n % 12) * 240)::numeric,
         10.0, v_owner,
         (ARRAY[v_dave, v_sam, v_priya, v_josh])[1 + (g.n % 4)],
         c.name, c.phone, c.email, s.address,
         (v_mon - ((g.n % 40) + 12))::timestamptz, NOW()
    FROM generate_series(1, 22) AS g(n)
    JOIN LATERAL (SELECT * FROM public.customers WHERE tenant_id = v_tenant
                   ORDER BY id OFFSET (g.n % 12) LIMIT 1) c ON TRUE
    JOIN LATERAL (SELECT * FROM public.sites WHERE customer_id = c.id
                   ORDER BY id LIMIT 1) s ON TRUE;

  RAISE NOTICE 'Demo workspace: 41 jobs in.';
END $$;

DO $$
DECLARE
  v_tenant UUID := 'fdec0000-0000-4000-8000-000000000001';
  v_owner  UUID := 'e1000000-0000-4000-8000-000000000000';
  v_dave   UUID := 'e1000000-0000-4000-8000-000000000001';
  v_sam    UUID := 'e1000000-0000-4000-8000-000000000002';
  v_priya  UUID := 'e1000000-0000-4000-8000-000000000003';
  v_josh   UUID := 'e1000000-0000-4000-8000-000000000004';
  v_mon DATE := date_trunc('week', CURRENT_DATE)::date;
  v_pass JSONB;
BEGIN
  v_pass := '[
    {"circuit_ref":"C1","description":"Lighting, ground floor","cable_size":"1.5mm TPS","protection_type":"RCBO","protection_rating":"16A","earth_continuity_ohms":0.21,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":21,"rcd_trip_ma":28,"visual_pass":true,"notes":""},
    {"circuit_ref":"C2","description":"Power, kitchen","cable_size":"2.5mm TPS","protection_type":"RCBO","protection_rating":"20A","earth_continuity_ohms":0.17,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":18,"rcd_trip_ma":26,"visual_pass":true,"notes":""},
    {"circuit_ref":"C3","description":"Power, general","cable_size":"2.5mm TPS","protection_type":"RCBO","protection_rating":"20A","earth_continuity_ohms":0.19,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":23,"rcd_trip_ma":29,"visual_pass":true,"notes":""},
    {"circuit_ref":"C4","description":"Oven","cable_size":"6mm TPS","protection_type":"RCBO","protection_rating":"32A","earth_continuity_ohms":0.11,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":24,"rcd_trip_ma":30,"visual_pass":true,"notes":""},
    {"circuit_ref":"C5","description":"Air conditioning","cable_size":"4mm TPS","protection_type":"RCBO","protection_rating":"25A","earth_continuity_ohms":0.14,"insulation_resistance_mohms":">200","polarity_pass":true,"rcd_trip_ms":26,"rcd_trip_ma":29,"visual_pass":true,"notes":"Trip time trending up, monitor next visit"}
  ]'::jsonb;

  -- Completed test sheets. The trigger from migration 025 rolls each asset's
  -- next_test_due forward automatically as these land.
  INSERT INTO public.job_test_sheets (
    tenant_id, job_id, asset_id, status, installation_address, switchboard_location,
    supply_type, circuits, certificate_number, tested_by, tester_name,
    tester_license, test_date, completed_at, notes)
  SELECT v_tenant,
         ('d0000000-0000-4000-8000-' || lpad(ts.job::text,12,'0'))::uuid,
         ('a0000000-0000-4000-8000-' || lpad(ts.asset::text,12,'0'))::uuid,
         'completed', s.address, s.switchboard_location, ts.supply,
         v_pass, ts.cert,
         CASE ts.crew WHEN 1 THEN v_dave WHEN 2 THEN v_sam ELSE v_priya END,
         CASE ts.crew WHEN 1 THEN 'Dave Nguyen' WHEN 2 THEN 'Sam Ellis' ELSE 'Priya Raman' END,
         CASE ts.crew WHEN 1 THEN 'QLD Electrical Mechanic 88999'
                      WHEN 2 THEN 'QLD Electrical Mechanic 91223'
                      ELSE 'QLD Electrical Mechanic 90887' END,
         (v_mon + ts.day)::date,
         (v_mon + ts.day)::timestamptz + interval '15 hours',
         ts.note
    FROM (VALUES
      ( 1, 1,'400V three phase','CERT-2026-0101',1, 0,'Board replaced and fully tested. Client walkthrough done.'),
      ( 2, 9,'230V single phase','CERT-2026-0102',1, 0,'All RCDs within limits. Certificate issued on site.'),
      ( 3,22,'230V single phase','CERT-2026-0103',3, 0,'Failed RCBO replaced, circuit retested clear.'),
      ( 4, 7,'230V single phase','CERT-2026-0104',2, 0,'Two fittings replaced, discharge test passed.'),
      ( 5, 3,'400V three phase','CERT-2026-0105',3, 1,'Highbay changeover certified.'),
      ( 6, 5,'400V three phase','CERT-2026-0106',3, 1,'34 fittings discharge tested, log book updated.'),
      (10, 6,'400V three phase','CERT-2026-0107',1, 2,'Tower A annual test complete.'),
      (12,26,'230V single phase','CERT-2026-0108',2, 2,'New heat pump circuit tested and certified.')
    ) AS ts(job, asset, supply, cert, crew, day, note)
    JOIN public.jobs j ON j.id = ('d0000000-0000-4000-8000-' || lpad(ts.job::text,12,'0'))::uuid
    JOIN public.sites s ON s.id = j.site_id;

  -- One in progress, so the draft state is visible too.
  INSERT INTO public.job_test_sheets (
    tenant_id, job_id, asset_id, status, installation_address, switchboard_location,
    supply_type, circuits, certificate_number, tester_name, test_date, notes)
  SELECT v_tenant, j.id, 'a0000000-0000-4000-8000-000000000004'::uuid, 'draft',
         s.address, s.switchboard_location, '400V three phase',
         '[]'::jsonb, 'CERT-2026-0109', 'Dave Nguyen', CURRENT_DATE,
         'Testing in progress, results to follow.'
    FROM public.jobs j JOIN public.sites s ON s.id = j.site_id
   WHERE j.id = 'd0000000-0000-4000-8000-000000000013';

  -- ── Invoices ──────────────────────────────────────────────
  INSERT INTO public.job_invoices (
    tenant_id, job_id, invoice_number, kind, status,
    subtotal_ex_gst, gst_amount, total_inc_gst, amount_paid,
    due_date, issued_at, sent_at, created_by, created_at)
  SELECT v_tenant,
         ('d0000000-0000-4000-8000-' || lpad(v.job::text,12,'0'))::uuid,
         v.num, v.kind, v.st,
         v.sub, round(v.sub * 0.10, 2), round(v.sub * 1.10, 2),
         CASE v.st WHEN 'paid' THEN round(v.sub * 1.10, 2) ELSE v.paid END,
         (CURRENT_DATE + v.due_off)::date,
         (CURRENT_DATE - v.age)::timestamptz,
         (CURRENT_DATE - v.age)::timestamptz,
         v_owner, (CURRENT_DATE - v.age)::timestamptz
  FROM (VALUES
    (  1,'INV-1101','tax','paid',      3480.00,    0.00, -10, 24),
    (  2,'INV-1102','tax','paid',       380.00,    0.00, -10, 24),
    (  3,'INV-1103','tax','paid',       420.00,    0.00,  -9, 23),
    (  4,'INV-1104','tax','paid',       340.00,    0.00,  -9, 23),
    (  5,'INV-1105','tax','sent',      4200.00,    0.00,  20,  1),
    (  6,'INV-1106','tax','sent',      1180.00,    0.00,  20,  1),
    (  7,'INV-1107','tax','paid',      2650.00,    0.00,  -3, 17),
    (  8,'INV-1108','tax','part_paid', 1240.00,  600.00,  12,  9),
    (  9,'INV-1109','tax','paid',       380.00,    0.00,  -2, 16),
    ( 10,'INV-1110','tax','sent',       720.00,    0.00,  25,  0),
    ( 11,'INV-1111','progress','sent', 7400.00,    0.00,  18,  3),
    ( 12,'INV-1112','tax','overdue',   1690.00,    0.00,  -8, 38),
    (101,'INV-1090','tax','overdue',   2480.00,    0.00, -21, 51),
    (102,'INV-1091','tax','paid',      1720.00,    0.00, -30, 60),
    (103,'INV-1092','tax','paid',      3120.00,    0.00, -35, 65),
    (104,'INV-1093','tax','paid',       860.00,    0.00, -40, 70)
  ) AS v(job, num, kind, st, sub, paid, due_off, age)
  WHERE EXISTS (SELECT 1 FROM public.jobs j
                 WHERE j.id = ('d0000000-0000-4000-8000-' || lpad(v.job::text,12,'0'))::uuid);

  -- ── Labour on the active jobs ─────────────────────────────
  INSERT INTO public.job_billing_items (job_id, tenant_id, description, hours, rate_per_hour, markup_percent, revenue, cost, created_by)
  SELECT ('d0000000-0000-4000-8000-' || lpad(b.job::text,12,'0'))::uuid,
         v_tenant, b.descr, b.hrs, b.rate, b.mk,
         round(b.hrs * b.rate * (1 + b.mk/100), 2),
         round(b.hrs * b.rate * 0.62, 2), v_owner
  FROM (VALUES
    (11,'Retail fitout stage 2, two hands',34.0,110.00, 8.0),
    (13,'MSB annual test and certification', 8.0,125.00, 0.0),
    (14,'Structured cabling and certification',18.0,115.00, 5.0),
    (17,'Three phase upgrade labour',        26.0,120.00, 5.0),
    (19,'Pool circuit and bonding',           6.5,110.00, 0.0)
  ) AS b(job, descr, hrs, rate, mk)
  WHERE EXISTS (SELECT 1 FROM public.jobs j
                 WHERE j.id = ('d0000000-0000-4000-8000-' || lpad(b.job::text,12,'0'))::uuid);

  -- ── Timesheets for the week ───────────────────────────────
  INSERT INTO public.time_entries (tenant_id, user_id, job_id, kind, started_at, ended_at, note, submitted)
  SELECT v_tenant,
         (ARRAY[v_dave, v_sam, v_priya, v_josh])[1 + (d.n % 4)],
         NULL, 'shift',
         (v_mon + (d.n / 4))::timestamptz + interval '7 hours',
         (v_mon + (d.n / 4))::timestamptz + interval '15 hours 30 minutes',
         NULL, (v_mon + (d.n / 4)) < CURRENT_DATE
    FROM generate_series(0, 19) AS d(n)
   WHERE (v_mon + (d.n / 4)) <= CURRENT_DATE;

  INSERT INTO public.time_entries (tenant_id, user_id, job_id, kind, started_at, ended_at, note, submitted)
  SELECT v_tenant,
         (ARRAY[v_dave, v_sam, v_priya, v_josh])[1 + (d.n % 4)],
         NULL, 'travel',
         (v_mon + (d.n / 4))::timestamptz + interval '6 hours 20 minutes',
         (v_mon + (d.n / 4))::timestamptz + interval '7 hours',
         'Yard to first site', TRUE
    FROM generate_series(0, 19) AS d(n)
   WHERE (v_mon + (d.n / 4)) <= CURRENT_DATE;

  -- ── Noticeboard ───────────────────────────────────────────
  INSERT INTO public.company_announcements (tenant_id, title, body, urgent, created_by, created_at)
  SELECT v_tenant, a.t, a.b, a.u, v_owner, NOW() - (a.age || ' days')::interval
  FROM (VALUES
    ('Portside induction required','Everyone on the Pinkenba job needs the online induction done before Thursday.', TRUE, 1),
    ('Toolbox talk Monday 6:30am','Working at heights refresher in the yard. Bring your harness for inspection.', TRUE, 4),
    ('Timesheets close Sunday 8pm','Submit through the field app. Late ones land in the following pay run.', FALSE, 6),
    ('New Middys pricing loaded','Check the app for current pricing before you quote.', FALSE, 9)
  ) AS a(t,b,u,age);

  RAISE NOTICE '────────────────────────────────────────────────';
  RAISE NOTICE 'Demo workspace ready: Voltaic Electrical (demo)';
  RAISE NOTICE '  Switch to it from the workspace menu, top right.';
  RAISE NOTICE '  Or sign in as demo@voltaicelectrical.com.au / demo1234';
  RAISE NOTICE '  Crew: dave@ (manager), sam@ priya@ josh@ (technicians)';
  RAISE NOTICE '  Your own workspace was not touched.';
  RAISE NOTICE '────────────────────────────────────────────────';
END $$;