-- One-tap customer quote approval on a public share link
-- Pain point: FieldEdge customers approve quotes by replying to emails.

ALTER TABLE public.estimates
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS deposit_percent NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS approval_name TEXT,        -- typed name = signature
  ADD COLUMN IF NOT EXISTS approval_note TEXT,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_estimates_public_token ON public.estimates(public_token);

-- Audit trail of customer actions on the public quote page
CREATE TABLE IF NOT EXISTS public.estimate_approval_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('viewed', 'approved', 'declined')),
  actor_name TEXT,
  note TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_estimate_approval_events_estimate
  ON public.estimate_approval_events(estimate_id, created_at DESC);

ALTER TABLE public.estimate_approval_events ENABLE ROW LEVEL SECURITY;

-- Business users can read the audit trail; writes happen via service role (public API route)
CREATE POLICY "Tenant members can view approval events"
  ON public.estimate_approval_events FOR SELECT
  USING (
    estimate_id IN (
      SELECT e.id FROM public.estimates e
      WHERE e.business_id IN (
        SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
      )
    )
  );
