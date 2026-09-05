-- Materials on job sheets: billing items can now be labour OR material rows,
-- with material rows linked to the live-priced master catalog.

ALTER TABLE public.job_billing_items
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'labour' CHECK (kind IN ('labour', 'material')),
  ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS master_product_id UUID REFERENCES public.master_products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_source TEXT; -- provenance label frozen at time of adding

CREATE INDEX IF NOT EXISTS idx_job_billing_items_kind ON public.job_billing_items(job_id, kind);
