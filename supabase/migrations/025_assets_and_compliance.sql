-- ============================================================
-- Assets and the compliance register.
--
-- WHY THIS IS THE IMPORTANT ONE
--   job_test_sheets already captures circuit level results as JSONB, but they
--   are attached to a one-off job. That means a business can tell you what it
--   tested last Tuesday and nothing else. Attach the same results to a
--   persistent asset — this switchboard, at this site, for this customer —
--   and three things become possible that were not before:
--
--     1. Test history. "This board, tested annually since 2023, RCD trip time
--        trending upward." Nobody can retroactively recreate that, which is
--        what makes it defensible.
--     2. Recurring revenue. Assets have test intervals. An asset overdue for
--        testing is billable work the business has not yet quoted.
--     3. A real reason not to churn. Job records are replaceable. Years of
--        compliance history are not.
--
-- Safe to re-run.
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

-- ── Asset types ─────────────────────────────────────────────
-- Interval months are the common Australian defaults, not legal advice: the
-- applicable standard and the site's classification decide the real figure,
-- so every asset can override its own interval.
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
CREATE POLICY "Anyone signed in reads asset types" ON public.asset_types FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── Assets ──────────────────────────────────────────────────
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
-- The query behind the compliance calendar, which runs on every page load.
CREATE INDEX IF NOT EXISTS idx_assets_due
  ON public.assets(tenant_id, next_test_due)
  WHERE status = 'active' AND next_test_due IS NOT NULL;

-- ── Attach test sheets to assets ────────────────────────────
-- Guarded: job_test_sheets comes from migration 009, which has not
-- necessarily been applied to this database.
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

-- ── Keep the schedule current automatically ─────────────────
-- When a test sheet is completed against an asset, roll the asset's dates
-- forward. Doing this in the database rather than the app means it stays
-- correct no matter which surface completed the test.
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
CREATE TRIGGER trg_assets_updated BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row level security ──────────────────────────────────────
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office manages assets" ON public.assets;
CREATE POLICY "Office manages assets" ON public.assets FOR ALL
  USING (public.is_office(tenant_id))
  WITH CHECK (public.is_office(tenant_id));

-- A technician sees the assets at a site they are actually working on, so
-- they can scan the board and read its history while standing there.
DROP POLICY IF EXISTS "Techs read assets on their jobs" ON public.assets;
CREATE POLICY "Techs read assets on their jobs" ON public.assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
       WHERE j.assigned_to = auth.uid()
         AND (j.site_id = assets.site_id OR j.customer_id = assets.customer_id)
    )
  );

-- ── The compliance register view ────────────────────────────
-- Everything the business needs to see what is due, who it belongs to, and
-- what it is worth. `days_until_due` is negative when overdue.
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
