-- ============================================================
-- 031 · Stripe: FieldMS subscriptions and online invoice payments
--
-- tenant_subscriptions     one row per workspace: the FieldMS plan it pays
--                          for (Stripe Billing). Written only by the
--                          webhook and billing routes (service role).
-- tenant_payment_accounts  the workspace's own Stripe account, connected
--                          through Stripe Connect, so its customers can pay
--                          invoices by card or bank. Money goes straight to
--                          the contractor; FieldMS never holds it.
-- stripe_events            webhook event ids already processed, so a retry
--                          from Stripe is not applied twice.
-- job_payments.stripe_payment_intent_id
--                          one Stripe payment can only ever be recorded once.
--
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_subscriptions (
  tenant_id              UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  plan                   TEXT,
  status                 TEXT NOT NULL DEFAULT 'none',
  current_period_end     TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_payment_accounts (
  tenant_id         UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  charges_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  payouts_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  details_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  account     TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.job_payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT UNIQUE;

-- ── RLS ──────────────────────────────────────────────────────
-- Office staff can see the plan and payment set-up; nobody writes these
-- through the API. All writes go through the service role in the billing
-- routes and the webhook, after their own authorisation checks.
ALTER TABLE public.tenant_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_payment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events           ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office reads subscription" ON public.tenant_subscriptions;
CREATE POLICY "Office reads subscription" ON public.tenant_subscriptions
  FOR SELECT USING (public.is_office(tenant_id));

DROP POLICY IF EXISTS "Office reads payment account" ON public.tenant_payment_accounts;
CREATE POLICY "Office reads payment account" ON public.tenant_payment_accounts
  FOR SELECT USING (public.is_office(tenant_id));

-- stripe_events: RLS on, no policies. Service role only.
