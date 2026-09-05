-- ============================================================
-- Customers and sites.
--
-- Until now a customer was four free text columns on every job:
-- customer_name, customer_phone, customer_email, customer_address. Two jobs
-- for the same person were two unrelated strings, so there was no job
-- history, no repeat customer list, no customer level debtors, and no way to
-- model a customer with several sites.
--
-- This migration introduces the missing spine and backfills it from the jobs
-- that already exist. The old columns are deliberately kept: they remain the
-- record of what was actually printed on that job's paperwork, and dropping
-- them would break existing quote and invoice PDFs.
--
-- Safe to re-run. The backfill is idempotent and only touches jobs whose
-- customer_id is still null.
-- ============================================================

-- ── Shared helper ───────────────────────────────────────────
-- Defined in migration 009, but this file must not assume 009 has been run
-- against this database. CREATE OR REPLACE is safe either way.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $set_updated_at$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$set_updated_at$ LANGUAGE plpgsql;

-- ── Customers ───────────────────────────────────────────────
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

-- ── Sites ───────────────────────────────────────────────────
-- One customer, many addresses. A real estate agency with 40 properties is
-- one customer and 40 sites, which was previously unmodellable.
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

-- ── Link jobs to them ───────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_customer ON public.jobs(customer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_site ON public.jobs(site_id);

-- ── Row level security ──────────────────────────────────────
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant members manage customers" ON public.customers;
CREATE POLICY "Tenant members manage customers" ON public.customers FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Tenant members manage sites" ON public.sites;
CREATE POLICY "Tenant members manage sites" ON public.sites FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- ── Keep updated_at honest ──────────────────────────────────
DROP TRIGGER IF EXISTS trg_customers_updated ON public.customers;
CREATE TRIGGER trg_customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sites_updated ON public.sites;
CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Backfill from existing jobs
-- ============================================================
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

-- ============================================================
-- Marketing list view
--
-- The list a business would export for an email campaign, with the spend and
-- recency figures needed to segment it. Excludes anyone without an email,
-- anyone archived, and anyone who declined or unsubscribed, so an export can
-- never accidentally include someone who opted out.
-- ============================================================
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
