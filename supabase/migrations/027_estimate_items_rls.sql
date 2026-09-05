-- ============================================================
-- estimate_items: row level security that actually has policies.
--
-- WHAT WAS BROKEN
--   VERIFY_SCHEMA reported "RLS BUT NO POLICY" on public.estimate_items.
--   RLS was switched on in migration 002 and its policies were never applied
--   to this database, which is the worst of the two failure modes: the table
--   exists, the query succeeds, and Postgres returns zero rows every time.
--
--   Two consequences, both on the quote path:
--
--     1. Creating a quote FAILED. lib/estimate.ts inserts the line items with
--        the browser client, so it hit a row level security violation every
--        time.
--     2. Opening a quote showed NO LINE ITEMS. getEstimateWithItems embeds
--        estimate_items(...), and an embed that returns nothing renders as an
--        empty list rather than an error.
--
--   The public customer-facing quote page uses the service role client, so it
--   bypassed RLS entirely. The customer could see line items the business
--   could not, and nobody could create a quote in the first place.
--
-- WHY THE ROLE CHECK IS ON THE PARENT
--   estimate_items has no tenant_id. It inherits its scope from the estimate
--   it belongs to, so the policies below join through to estimates.business_id
--   and reuse public.is_office() from migration 024. Same rule as the parent:
--   owners and managers, not technicians. Quote pricing is margin information.
--
-- ALSO FIXED HERE
--   Migration 002 left four permissive policies on public.estimates granting
--   access to any tenant member. Migration 024 added "Office manages estimates"
--   but only dropped its own policy name, so the older four survived.
--   Permissive policies are OR'd together, which meant the technician
--   restriction 024 was written to enforce did not hold: any signed in
--   technician could still read every quote and its pricing.
--
-- NOTE ON STYLE
--   Written as plain statements rather than a DO block. The SQL editor split
--   an earlier version of this file in the middle of its DO block and tried to
--   run the bare IF, which is a syntax error. There is nothing here that needs
--   dollar quoting: both tables exist, so the guards were never load bearing.
--
-- Safe to re-run.
-- ============================================================

-- ── 1. Retire the legacy policies superseded by migration 024 ──
-- Named individually rather than dropped wholesale, so a policy added later
-- and deliberately is not silently removed by a re-run of this file.
DROP POLICY IF EXISTS "Users can view estimates for their business"   ON public.estimates;
DROP POLICY IF EXISTS "Users can insert estimates for their business" ON public.estimates;
DROP POLICY IF EXISTS "Users can update estimates for their business" ON public.estimates;
DROP POLICY IF EXISTS "Users can delete estimates for their business" ON public.estimates;

-- Re-assert the intended policy, in case 024 has not run against this database.
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office manages estimates" ON public.estimates;
CREATE POLICY "Office manages estimates" ON public.estimates FOR ALL
  USING (public.is_office(business_id))
  WITH CHECK (public.is_office(business_id));

-- ── 2. The line items ───────────────────────────────────────
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

-- Legacy names from migration 002, in case they exist here.
DROP POLICY IF EXISTS "Users can view estimate items for their business"   ON public.estimate_items;
DROP POLICY IF EXISTS "Users can insert estimate items for their business" ON public.estimate_items;
DROP POLICY IF EXISTS "Users can update estimate items for their business" ON public.estimate_items;
DROP POLICY IF EXISTS "Users can delete estimate items for their business" ON public.estimate_items;

-- One FOR ALL policy, scoped through the parent estimate. USING governs the
-- rows that can be read, updated and deleted; WITH CHECK governs what may be
-- written, so a line item cannot be attached to another workspace's quote.
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

-- The policy above runs a subquery per row, so the lookup needs to be indexed.
CREATE INDEX IF NOT EXISTS idx_estimate_items_estimate_id
  ON public.estimate_items(estimate_id);
