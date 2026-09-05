
-- Safe for re-runs: drop tables if they exist
DROP TABLE IF EXISTS public.estimate_items CASCADE;
DROP TABLE IF EXISTS public.estimates CASCADE;

-- Estimates table
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimate items table
CREATE TABLE public.estimate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_estimates_business_id ON public.estimates(business_id);
CREATE INDEX idx_estimate_items_estimate_id ON public.estimate_items(estimate_id);

ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view estimates for their business"
  ON public.estimates FOR SELECT
  USING (
    business_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert estimates for their business"
  ON public.estimates FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update estimates for their business"
  ON public.estimates FOR UPDATE
  USING (
    business_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete estimates for their business"
  ON public.estimates FOR DELETE
  USING (
    business_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view estimate items for their business"
  ON public.estimate_items FOR SELECT
  USING (
    estimate_id IN (
      SELECT id FROM public.estimates WHERE business_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert estimate items for their business"
  ON public.estimate_items FOR INSERT
  WITH CHECK (
    estimate_id IN (
      SELECT id FROM public.estimates WHERE business_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update estimate items for their business"
  ON public.estimate_items FOR UPDATE
  USING (
    estimate_id IN (
      SELECT id FROM public.estimates WHERE business_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete estimate items for their business"
  ON public.estimate_items FOR DELETE
  USING (
    estimate_id IN (
      SELECT id FROM public.estimates WHERE business_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );
