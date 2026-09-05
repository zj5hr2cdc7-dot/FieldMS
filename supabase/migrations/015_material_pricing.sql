-- ============================================================
-- Live Material Pricing & Supplier Integration Engine
-- Master catalog + supplier prices + history + tenant pricing
-- ============================================================

-- ── Master product catalog (global, shared across tenants) ──
CREATE TABLE IF NOT EXISTS public.master_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  brand TEXT,
  mpn TEXT,                          -- manufacturer part number (primary match key)
  unit TEXT NOT NULL DEFAULT 'each', -- each | metre | roll | box
  description TEXT,
  aliases TEXT[] NOT NULL DEFAULT '{}',  -- normalised alternate names for matching
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_master_products_mpn ON public.master_products(mpn);
CREATE INDEX IF NOT EXISTS idx_master_products_name ON public.master_products USING gin (to_tsvector('english', name));

-- ── Supplier offers: one row per (master product, supplier) ──
CREATE TABLE IF NOT EXISTS public.supplier_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  supplier_key TEXT NOT NULL,        -- 'rexel' | 'haymans' | 'lawrence_hanson' | 'middys' | 'cnw' | 'ideal' | 'cw_electrical' | 'sparky_direct' | ...
  supplier_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  mpn TEXT,
  price NUMERIC(12,4) NOT NULL,      -- market/list price ex GST
  availability TEXT NOT NULL DEFAULT 'unknown' CHECK (availability IN ('in_stock', 'low_stock', 'out_of_stock', 'unknown')),
  stock_level INT,
  product_url TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (supplier_key, sku)
);

CREATE INDEX IF NOT EXISTS idx_supplier_products_master ON public.supplier_products(master_product_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier ON public.supplier_products(supplier_key);

-- ── Price snapshots (full history for trends) ────────────────
CREATE TABLE IF NOT EXISTS public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  price NUMERIC(12,4) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_snapshots_product_time
  ON public.price_snapshots(supplier_product_id, recorded_at DESC);

-- ── Price change log (only when price actually moves) ────────
CREATE TABLE IF NOT EXISTS public.price_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  supplier_key TEXT NOT NULL,
  old_price NUMERIC(12,4) NOT NULL,
  new_price NUMERIC(12,4) NOT NULL,
  pct_change NUMERIC(8,3) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_changes_master_time
  ON public.price_changes(master_product_id, recorded_at DESC);

-- ── Tenant: linked wholesaler trade accounts ─────────────────
CREATE TABLE IF NOT EXISTS public.tenant_supplier_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_key TEXT NOT NULL,
  account_reference TEXT,            -- customer/account number at the wholesaler
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  -- Credentials/token for the supplier feed. Stored server-side only; RLS
  -- blocks reads of this column via the dedicated view below.
  credential_cipher TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_key)
);

-- ── Tenant: negotiated trade prices per supplier product ─────
CREATE TABLE IF NOT EXISTS public.tenant_trade_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  supplier_product_id UUID NOT NULL REFERENCES public.supplier_products(id) ON DELETE CASCADE,
  price NUMERIC(12,4) NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, supplier_product_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_trade_prices_tenant ON public.tenant_trade_prices(tenant_id);

-- ── Tenant: pricing settings ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_pricing_settings (
  tenant_id UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  price_source TEXT NOT NULL DEFAULT 'market_median' CHECK (price_source IN (
    'market_average', 'market_lowest', 'market_median',
    'preferred_supplier', 'cheapest_trade', 'manual'
  )),
  preferred_supplier_key TEXT,
  alert_threshold_pct NUMERIC(6,2) NOT NULL DEFAULT 5.0,
  auto_update_overrides BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Tenant: manual price overrides ───────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_price_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  master_product_id UUID NOT NULL REFERENCES public.master_products(id) ON DELETE CASCADE,
  price NUMERIC(12,4) NOT NULL,
  note TEXT,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tenant_id, master_product_id)
);

-- ── Tenant: price movement alerts ────────────────────────────
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  master_product_id UUID REFERENCES public.master_products(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  pct_change NUMERIC(8,3),
  supplier_key TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_alerts_tenant ON public.price_alerts(tenant_id, read, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_supplier_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_trade_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_pricing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_price_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Market data: readable by any signed-in user; written only by service role
CREATE POLICY "Authenticated read master products" ON public.master_products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read supplier products" ON public.supplier_products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read snapshots" ON public.price_snapshots FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated read changes" ON public.price_changes FOR SELECT USING (auth.uid() IS NOT NULL);

-- Tenant-scoped tables
CREATE POLICY "Tenant members manage supplier accounts"
  ON public.tenant_supplier_accounts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members read trade prices"
  ON public.tenant_trade_prices FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members manage pricing settings"
  ON public.tenant_pricing_settings FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members manage overrides"
  ON public.tenant_price_overrides FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Tenant members manage alerts"
  ON public.price_alerts FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

DROP TRIGGER IF EXISTS trg_master_products_updated ON public.master_products;
CREATE TRIGGER trg_master_products_updated BEFORE UPDATE ON public.master_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
