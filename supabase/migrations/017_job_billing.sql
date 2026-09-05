-- ============================================================
-- Job Billing hub — variations, invoices, financial audit trail.
-- Builds on existing job_billing_items (labour+material) and
-- job_payments (deposits/progress/final). Every financial action
-- on a job lives here and is fully traceable.
-- ============================================================

-- ── Job-level billing settings & rollup cache ────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS quote_total NUMERIC(12,2) NOT NULL DEFAULT 0,   -- accepted quote value (ex GST)
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 10.0,
  ADD COLUMN IF NOT EXISTS po_number TEXT,
  ADD COLUMN IF NOT EXISTS billing_notes TEXT;

-- ── Variations ───────────────────────────────────────────────
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

-- ── Invoices ─────────────────────────────────────────────────
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

-- link a payment to an invoice (optional; payments already exist per job)
ALTER TABLE public.job_payments
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES public.job_invoices(id) ON DELETE SET NULL;

-- ── Financial audit trail (append-only, never deleted) ───────
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

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.job_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members manage variations"
  ON public.job_variations FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members manage invoices"
  ON public.job_invoices FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

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

CREATE POLICY "Tenant members view billing audit"
  ON public.billing_audit_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members insert billing audit"
  ON public.billing_audit_events FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_job_variations_updated ON public.job_variations;
CREATE TRIGGER trg_job_variations_updated BEFORE UPDATE ON public.job_variations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_job_invoices_updated ON public.job_invoices;
CREATE TRIGGER trg_job_invoices_updated BEFORE UPDATE ON public.job_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
