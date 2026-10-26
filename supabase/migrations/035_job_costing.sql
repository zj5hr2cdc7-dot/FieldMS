-- ============================================================
-- Job costing: what a job actually cost, against what it was quoted at.
--
-- WHAT WAS ALREADY THERE
--   The revenue side is built. job_billing_items carries revenue AND cost per
--   line with kind/hours/rate/quantity/unit_cost; job_invoices handles GST,
--   discounts, part payments, deposits, progress claims and credit notes;
--   job_variations carry sell value; billing_audit_events exists. None of that
--   is touched here.
--
--   What is missing is the ACTUAL cost side:
--     - time_entries records shifts but holds no rate, so worked hours cannot
--       become labour cost
--     - purchase_order_items has unit_price and received_quantity, but nothing
--       feeds a received PO back into job cost
--     - there is nowhere at all to put a subcontractor invoice or plant hire
--     - there is no target margin, so "below target" had no target to use
--
-- WHY COST RATES ARE A SEPARATE TABLE
--   The obvious move is tenant_members.cost_rate. It is wrong. tenant_members
--   has a "Users can view members of their tenants" SELECT policy, and
--   Postgres RLS is row-level, not column-level — every technician could read
--   every colleague's pay rate. Wages live in their own office-only table.
--
-- GROSS PROFIT ONLY
--   Nothing here knows about business overheads, so none of it is net profit
--   or cash position. lib/job-costing.ts names every figure accordingly.
--
-- Plain statements, no DO blocks and no dollar quoting, because the Supabase
-- SQL editor splits pasted input on semicolons (that is what broke 027).
-- Safe to re-run.
-- ============================================================

-- ── Cost rates: wages, office eyes only ─────────────────────
-- effective_from keeps history, so a pay rise does not retrospectively change
-- the margin on a job finished last year.
CREATE TABLE IF NOT EXISTS public.tenant_member_cost_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Wage plus on-costs per hour: super, workers comp, payroll tax, leave
  -- loading. The all-up cost of an hour of this person's time.
  cost_rate NUMERIC(10, 2) NOT NULL CHECK (cost_rate >= 0),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS tenant_member_cost_rates_unique
  ON public.tenant_member_cost_rates (tenant_id, user_id, effective_from);

CREATE INDEX IF NOT EXISTS tenant_member_cost_rates_lookup_idx
  ON public.tenant_member_cost_rates (tenant_id, user_id, effective_from DESC);

ALTER TABLE public.tenant_member_cost_rates ENABLE ROW LEVEL SECURITY;

-- No member-read policy on purpose. Payroll data is owner and manager only,
-- including a technician looking up their own rate: that is a payslip
-- question, not a FieldMS one.
DROP POLICY IF EXISTS "Office manages cost rates" ON public.tenant_member_cost_rates;
CREATE POLICY "Office manages cost rates" ON public.tenant_member_cost_rates
  FOR ALL USING (public.is_office(tenant_id)) WITH CHECK (public.is_office(tenant_id));

-- ── Other direct costs ──────────────────────────────────────
-- The third cost category. Labour comes from time_entries, materials from
-- purchase orders and billing lines; everything else had nowhere to go.
CREATE TABLE IF NOT EXISTS public.job_cost_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'other'
    CHECK (kind IN ('subcontractor', 'plant_hire', 'permit', 'disposal', 'travel', 'other')),
  description TEXT NOT NULL,
  supplier_name TEXT,
  reference TEXT,
  -- Cost to the business, ex GST. What the customer is charged for this work
  -- lives in job_billing_items; the two are deliberately not the same number.
  amount_ex_gst NUMERIC(12, 2) NOT NULL CHECK (amount_ex_gst >= 0),
  incurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS job_cost_entries_job_idx
  ON public.job_cost_entries (job_id, incurred_on DESC);

CREATE INDEX IF NOT EXISTS job_cost_entries_tenant_idx
  ON public.job_cost_entries (tenant_id, incurred_on DESC);

ALTER TABLE public.job_cost_entries ENABLE ROW LEVEL SECURITY;

-- Office only, read and write. What a subcontractor charges is commercially
-- sensitive and a technician has no reason to see it.
DROP POLICY IF EXISTS "Office manages job costs" ON public.job_cost_entries;
CREATE POLICY "Office manages job costs" ON public.job_cost_entries
  FOR ALL USING (public.is_office(tenant_id)) WITH CHECK (public.is_office(tenant_id));

-- ── Baselines: what we said it would cost, frozen ───────────
-- Captured when a quote is accepted and again when a variation is approved.
-- Without this there is no honest "estimated vs actual": the estimate would be
-- whatever the billing lines happen to say today, which moves every time
-- someone edits one.
CREATE TABLE IF NOT EXISTS public.job_cost_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('quote_accepted', 'variation_approved', 'manual')),
  -- Where it came from, when it came from somewhere.
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  variation_id UUID REFERENCES public.job_variations(id) ON DELETE SET NULL,

  quoted_revenue_ex_gst NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quoted_labour_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quoted_material_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quoted_other_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quoted_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,

  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  captured_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS job_cost_baselines_job_idx
  ON public.job_cost_baselines (job_id, captured_at DESC);

CREATE INDEX IF NOT EXISTS job_cost_baselines_tenant_idx
  ON public.job_cost_baselines (tenant_id);

ALTER TABLE public.job_cost_baselines ENABLE ROW LEVEL SECURITY;

-- Read-only from the browser. There is deliberately NO insert, update or
-- delete policy: rows are written by the server with the service role when a
-- quote is accepted or a variation approved. An approved price must not be
-- editable after the fact from a client that could be tampered with.
DROP POLICY IF EXISTS "Office reads baselines" ON public.job_cost_baselines;
CREATE POLICY "Office reads baselines" ON public.job_cost_baselines
  FOR SELECT USING (public.is_office(tenant_id));

-- ── Rate snapshots on worked time ───────────────────────────
-- Stamped when the entry is approved, not read live, for the same reason the
-- baseline exists: last year's margins must not move when this year's rates do.
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS cost_rate_snapshot NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS charge_rate_snapshot NUMERIC(10, 2);

-- ── Target margin ───────────────────────────────────────────
-- NULL means not set, which is different from zero. The profitability screens
-- say "no target set" rather than flagging every job as failing a 0% target.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS target_margin_percent NUMERIC(5, 2)
    CHECK (target_margin_percent IS NULL OR (target_margin_percent >= 0 AND target_margin_percent < 100));

-- ── What the supplier actually billed ───────────────────────
-- unit_price is what was quoted on the PO. These two are routinely different,
-- and the difference is exactly where margin quietly disappears.
ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS actual_unit_cost NUMERIC(12, 4);

-- ── Documentation ───────────────────────────────────────────
COMMENT ON TABLE public.tenant_member_cost_rates IS
  'Wage plus on-costs per hour, per person. Office only: separate table because tenant_members is member-readable and RLS cannot hide a column.';
COMMENT ON TABLE public.job_cost_entries IS
  'Actual direct costs that are neither payroll nor catalogue materials: subcontractors, plant hire, permits, disposal.';
COMMENT ON TABLE public.job_cost_baselines IS
  'Frozen snapshot of the quoted position at acceptance and at each approved variation. Append-only; written by the server, never the browser.';
COMMENT ON COLUMN public.time_entries.cost_rate_snapshot IS
  'Cost rate as at approval. NULL means the hours are not costed yet — show "not costed", never zero.';
COMMENT ON COLUMN public.tenants.target_margin_percent IS
  'Target gross margin. NULL means not set, which is not the same as zero.';
COMMENT ON COLUMN public.purchase_order_items.actual_unit_cost IS
  'What the supplier actually invoiced, against unit_price which is what they quoted.';
