-- ============================================================
-- Quick Start onboarding + trade-based module customisation
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

CREATE POLICY "Tenant members manage onboarding" ON public.tenant_onboarding FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_tenant_onboarding_updated ON public.tenant_onboarding;
CREATE TRIGGER trg_tenant_onboarding_updated BEFORE UPDATE ON public.tenant_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
