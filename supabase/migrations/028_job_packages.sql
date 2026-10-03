-- ============================================================
-- Job packages — reusable bundles of labour and materials.
--
-- WHAT THIS IS FOR
--   The same small job gets quoted over and over: swap a powerpoint, add a
--   downlight, replace an RCD. Each time someone re-enters the same couple of
--   metres of cable, the same hour or two of labour and the same part. A
--   package captures that once, and applying it to a job writes the lines.
--
-- WHY NOT tenant_material_kits
--   That pair of tables (migration 015) looks like it was meant for this, but
--   it holds materials only — master_product_id is NOT NULL on every row, so
--   there is nowhere to put "2 hours of labour". It also has no code behind
--   it at all: nothing in the app reads or writes it. Rather than widen a
--   table whose name says "material kit" into something that also carries
--   labour, this adds a model that covers both.
--
--   tenant_material_kits is left in place rather than dropped, because this
--   migration cannot see whether the live database has rows in it. Check it is
--   empty, then drop it separately.
--
-- PRICING
--   A material line stores the product and the quantity, not a price. The
--   price is resolved when the package is applied, so a package built today is
--   still right after copper moves. A line can pin a fixed unit cost instead
--   (unit_cost_override), which is what you want for a part you buy at a
--   settled rate. Labour works the same way: rate_per_hour NULL means use the
--   rate on the job at apply time.
--
-- NO SEED DATA
--   This creates the capability and nothing else. No example packages —
--   every business prices its own work.
--
-- Written as plain statements with no DO blocks or dollar quoting, because
-- the Supabase SQL editor splits pasted input on semicolons and a DO block
-- does not survive that. Safe to re-run.
-- ============================================================

-- ── Packages ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Retired rather than deleted, so historical jobs keep a meaningful
  -- reference to the package they were billed from.
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS job_packages_tenant_name_key
  ON public.job_packages (tenant_id, lower(name));

CREATE INDEX IF NOT EXISTS job_packages_tenant_idx
  ON public.job_packages (tenant_id) WHERE active;

-- ── Package lines ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_package_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES public.job_packages(id) ON DELETE CASCADE,
  -- Denormalised on purpose. Every policy below can then test tenant_id
  -- directly instead of joining back to job_packages. The audit flagged
  -- join-based isolation as the thing most likely to be got wrong.
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('labour', 'material')),
  description TEXT NOT NULL,

  -- Labour
  hours NUMERIC(8, 2),
  rate_per_hour NUMERIC(10, 2),

  -- Material
  master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
  quantity NUMERIC(12, 2),
  unit_cost_override NUMERIC(12, 4),

  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- A labour line needs hours and must not carry a product.
  CONSTRAINT job_package_items_labour_shape CHECK (
    kind <> 'labour' OR (
      hours IS NOT NULL AND hours > 0
      AND master_product_id IS NULL
      AND quantity IS NULL
      AND unit_cost_override IS NULL
    )
  ),

  -- A material line needs a quantity, and needs somewhere to get a price
  -- from: either a catalogue product (resolved live) or a pinned unit cost.
  -- Without one of those, applying the package would silently add a $0 line.
  CONSTRAINT job_package_items_material_shape CHECK (
    kind <> 'material' OR (
      quantity IS NOT NULL AND quantity > 0
      AND hours IS NULL
      AND rate_per_hour IS NULL
      AND (master_product_id IS NOT NULL OR unit_cost_override IS NOT NULL)
    )
  )
);

CREATE INDEX IF NOT EXISTS job_package_items_package_idx
  ON public.job_package_items (package_id, sort_order);

CREATE INDEX IF NOT EXISTS job_package_items_tenant_idx
  ON public.job_package_items (tenant_id);

-- ── Row level security ──────────────────────────────────────
-- Read: any member of the tenant, so a technician can see what a package
-- contains on a job they are working.
-- Write: owner and manager only (is_office), because a package decides what
-- the customer gets charged. Same boundary as the rest of pricing.

ALTER TABLE public.job_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_package_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read packages" ON public.job_packages;
CREATE POLICY "Members read packages" ON public.job_packages
  FOR SELECT USING (public.is_member(tenant_id));

DROP POLICY IF EXISTS "Office manages packages" ON public.job_packages;
CREATE POLICY "Office manages packages" ON public.job_packages
  FOR ALL USING (public.is_office(tenant_id)) WITH CHECK (public.is_office(tenant_id));

DROP POLICY IF EXISTS "Members read package items" ON public.job_package_items;
CREATE POLICY "Members read package items" ON public.job_package_items
  FOR SELECT USING (public.is_member(tenant_id));

DROP POLICY IF EXISTS "Office manages package items" ON public.job_package_items;
CREATE POLICY "Office manages package items" ON public.job_package_items
  FOR ALL USING (public.is_office(tenant_id)) WITH CHECK (public.is_office(tenant_id));

-- ── Provenance on the billing line ──────────────────────────
-- Records which package a billing line came from, so a job shows "added by
-- the Replace powerpoint package" rather than three unexplained rows, and so
-- a package can be re-applied or removed as a unit.
ALTER TABLE public.job_billing_items
  ADD COLUMN IF NOT EXISTS source_package_id UUID REFERENCES public.job_packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS job_billing_items_source_package_idx
  ON public.job_billing_items (source_package_id) WHERE source_package_id IS NOT NULL;

COMMENT ON TABLE public.job_packages IS
  'Reusable labour + material bundles. Applying one writes job_billing_items.';
COMMENT ON COLUMN public.job_package_items.unit_cost_override IS
  'Pinned unit cost. NULL means resolve the live price for master_product_id when applied.';
COMMENT ON COLUMN public.job_package_items.rate_per_hour IS
  'Pinned labour rate. NULL means use the rate supplied at apply time.';
