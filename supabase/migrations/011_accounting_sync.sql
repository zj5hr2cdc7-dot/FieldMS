-- Accounting sync foundation (Xero-first) with idempotency
-- Pain point: Jobber's #1 complaint — duplicate entries / broken sync, especially
-- around partial payments and deposits.

-- Payments recorded against jobs (deposits, progress payments, final payments)
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

-- Sync ledger: one row per (entity, provider). The idempotency key prevents the
-- duplicate-entry class of bug entirely — a retry updates the same row and the
-- provider receives the same key.
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

CREATE POLICY "Tenant members can manage payments"
  ON public.job_payments FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members can view sync records"
  ON public.accounting_sync_records FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_accounting_sync_updated_at ON public.accounting_sync_records;
CREATE TRIGGER trg_accounting_sync_updated_at
  BEFORE UPDATE ON public.accounting_sync_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
