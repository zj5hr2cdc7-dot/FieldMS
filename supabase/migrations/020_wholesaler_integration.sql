-- ============================================================
-- Intelligent Wholesaler Integration & Pricing Engine
-- Extends 015_material_pricing with: richer product data,
-- connection health + schedules, sync runs, favourites,
-- material kits and purchase orders.
-- ============================================================

-- ── Richer supplier product data ─────────────────────────────
ALTER TABLE public.supplier_products
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS datasheet_url TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS pack_size NUMERIC(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS retail_price NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS discontinued BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS replacement_sku TEXT,
  ADD COLUMN IF NOT EXISTS specs JSONB NOT NULL DEFAULT '{}';

-- ── Connection health, method and schedule per linked account ─
ALTER TABLE public.tenant_supplier_accounts
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS connection_method TEXT NOT NULL DEFAULT 'catalogue'
    CHECK (connection_method IN ('api', 'catalogue', 'browser')),
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS sync_frequency TEXT NOT NULL DEFAULT 'weekly'
    CHECK (sync_frequency IN ('daily', 'weekly', 'fortnightly', 'monthly', 'manual')),
  ADD COLUMN IF NOT EXISTS next_sync_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS products_synced INT NOT NULL DEFAULT 0;

-- ── Sync run history (health + audit) ────────────────────────
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE, -- NULL = market-wide run
  supplier_key TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'catalogue' CHECK (method IN ('api', 'catalogue', 'browser')),
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'scheduled', 'import')),
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed')),
  offers INT NOT NULL DEFAULT 0,
  new_products INT NOT NULL DEFAULT 0,
  price_changes INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  source_file TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sync_runs_supplier_time ON public.sync_runs(supplier_key, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_runs_tenant ON public.sync_runs(tenant_id, started_at DESC);

-- ── Favourite products ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_favourite_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, master_product_id)
);

-- ── Material kits ("House Rough In" etc.) ────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_material_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_material_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES public.tenant_material_kits(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (kit_id, master_product_id)
);

-- ── Purchase orders ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  estimate_id UUID REFERENCES public.estimates(id) ON DELETE SET NULL,
  supplier_key TEXT NOT NULL,
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled'
  )),
  notes TEXT,
  expected_delivery DATE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, po_number)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  sku TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,4) NOT NULL DEFAULT 0,
  received_quantity NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON public.purchase_order_items(purchase_order_id);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_favourite_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_material_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_material_kit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Sync runs: members see their tenant's runs and market-wide runs
CREATE POLICY "Read own or market sync runs" ON public.sync_runs FOR SELECT
  USING (
    tenant_id IS NULL
    OR tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Tenant members manage favourites" ON public.tenant_favourite_products FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members manage kits" ON public.tenant_material_kits FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members manage kit items" ON public.tenant_material_kit_items FOR ALL
  USING (kit_id IN (
    SELECT id FROM public.tenant_material_kits
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (kit_id IN (
    SELECT id FROM public.tenant_material_kits
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ));

CREATE POLICY "Tenant members manage purchase orders" ON public.purchase_orders FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members manage PO items" ON public.purchase_order_items FOR ALL
  USING (purchase_order_id IN (
    SELECT id FROM public.purchase_orders
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ))
  WITH CHECK (purchase_order_id IN (
    SELECT id FROM public.purchase_orders
    WHERE tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid())
  ));

DROP TRIGGER IF EXISTS trg_material_kits_updated ON public.tenant_material_kits;
CREATE TRIGGER trg_material_kits_updated BEFORE UPDATE ON public.tenant_material_kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_purchase_orders_updated ON public.purchase_orders;
CREATE TRIGGER trg_purchase_orders_updated BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
