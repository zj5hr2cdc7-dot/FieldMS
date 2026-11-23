-- 041: supplier bills by email.
--
-- Each workspace gets its own address, bills-<token>@invoices.fieldms.com.au.
-- Wholesalers (or the tradie, by forwarding) send invoices there; the inbound
-- webhook reads the PDF, matches it to a job and records it here.
--
-- tenant_inboxes   the token behind each workspace's address. A separate
--                  table rather than a tenants column: owners can update
--                  their tenants row, and nobody should be able to change
--                  or guess their way into another workspace's inbox.
-- supplier_invoices one row per invoice received.
-- job_cost_entries gains kind 'materials' for invoiced materials.
--
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS public.tenant_inboxes (
  tenant_id  UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.tenant_inboxes (tenant_id, token)
SELECT id, encode(gen_random_bytes(5), 'hex') FROM public.tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- New workspaces get an inbox too.
CREATE OR REPLACE FUNCTION public.fieldms_create_inbox()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- gen_random_bytes lives in the extensions schema on Supabase. Without it on
-- the path this trigger would fail, and with it every new signup.
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.tenant_inboxes (tenant_id, token)
  VALUES (NEW.id, encode(gen_random_bytes(5), 'hex'))
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_inbox ON public.tenants;
CREATE TRIGGER trg_create_inbox
  AFTER INSERT ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.fieldms_create_inbox();

CREATE TABLE IF NOT EXISTS public.supplier_invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  received_email_id  TEXT NOT NULL UNIQUE,
  from_email         TEXT,
  subject            TEXT,
  attachment_name    TEXT,
  received_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  supplier_name      TEXT,
  invoice_number     TEXT,
  invoice_date       DATE,
  reference          TEXT,
  total_ex_gst       NUMERIC(12, 2),
  gst                NUMERIC(12, 2),
  total_inc_gst      NUMERIC(12, 2),
  lines              JSONB NOT NULL DEFAULT '[]'::jsonb,
  job_id             UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  suggested_job_id   UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  match_reason       TEXT,
  status             TEXT NOT NULL DEFAULT 'needs_review'
    CHECK (status IN ('needs_review', 'assigned', 'ignored', 'unreadable')),
  cost_entry_id      UUID REFERENCES public.job_cost_entries(id) ON DELETE SET NULL,
  error              TEXT,
  created_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS supplier_invoices_tenant_idx
  ON public.supplier_invoices (tenant_id, received_at DESC);

ALTER TABLE public.tenant_inboxes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;

-- Office staff can see their inbox address and their bills. All writes go
-- through the service role in the webhook and the bills API, after checks.
DROP POLICY IF EXISTS "Office reads inbox" ON public.tenant_inboxes;
CREATE POLICY "Office reads inbox" ON public.tenant_inboxes
  FOR SELECT USING (public.is_office(tenant_id));

DROP POLICY IF EXISTS "Office reads supplier invoices" ON public.supplier_invoices;
CREATE POLICY "Office reads supplier invoices" ON public.supplier_invoices
  FOR SELECT USING (public.is_office(tenant_id));

-- Invoiced materials as a job cost.
ALTER TABLE public.job_cost_entries DROP CONSTRAINT IF EXISTS job_cost_entries_kind_check;
ALTER TABLE public.job_cost_entries ADD CONSTRAINT job_cost_entries_kind_check
  CHECK (kind IN ('materials', 'subcontractor', 'plant_hire', 'permit', 'disposal', 'travel', 'other'));
