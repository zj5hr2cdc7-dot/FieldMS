-- ============================================================
-- Customer messaging, review requests and the charge-out rate.
--
-- WHAT THIS ADDS
--   1. message_templates — a business's own SMS / email templates. The
--      built-in set lives in code (lib/message-templates.ts) so it improves
--      with every release; a row here either overrides a built-in (same
--      template_key) or is a template the business wrote themselves
--      (template_key NULL).
--   2. customer_messages — a log of every message sent to a customer from a
--      job, so the office can see "we chased this invoice on Tuesday".
--   3. Review requests — a per-business switch that sends the customer a
--      Google review link when a job is completed, and jobs.review_requested_at
--      so a job is only ever asked once, however many times it is re-completed.
--   4. tenants.default_labour_rate and tenants.rate_calculator — the result
--      and the inputs of the charge-out rate calculator.
--
-- WHO CAN DO WHAT
--   Templates: any member reads (a technician can send "running late"),
--   owner and manager edit. Message log: owner and manager read; rows are
--   written only by the server (service role), never from the browser, so the
--   log cannot be edited to hide or invent a message.
--
-- Plain statements, no DO blocks, safe to re-run.
-- ============================================================

-- ── Templates ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Set when the row overrides a built-in template; NULL for custom ones.
  template_key TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom'
    CHECK (category IN ('quotes', 'scheduling', 'payments', 'reviews', 'follow_up', 'custom')),
  subject TEXT NOT NULL DEFAULT '',
  sms_body TEXT NOT NULL DEFAULT '',
  email_body TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- One override per built-in per business.
CREATE UNIQUE INDEX IF NOT EXISTS message_templates_tenant_key
  ON public.message_templates (tenant_id, template_key) WHERE template_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS message_templates_tenant_idx
  ON public.message_templates (tenant_id);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read message templates" ON public.message_templates;
CREATE POLICY "Members read message templates" ON public.message_templates
  FOR SELECT USING (public.is_member(tenant_id));

DROP POLICY IF EXISTS "Office manages message templates" ON public.message_templates;
CREATE POLICY "Office manages message templates" ON public.message_templates
  FOR ALL USING (public.is_office(tenant_id)) WITH CHECK (public.is_office(tenant_id));

-- ── Message log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  template_key TEXT,
  template_name TEXT,
  -- 'review_request_auto' marks the automatic send on job completion.
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'review_request_auto')),
  to_phone TEXT,
  to_email TEXT,
  subject TEXT,
  sms_body TEXT,
  email_body TEXT,
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_messages_job_idx
  ON public.customer_messages (job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_messages_tenant_idx
  ON public.customer_messages (tenant_id, created_at DESC);

ALTER TABLE public.customer_messages ENABLE ROW LEVEL SECURITY;

-- Read only. No INSERT/UPDATE/DELETE policy exists, so with RLS enabled the
-- browser cannot write here at all; the send route uses the service role.
DROP POLICY IF EXISTS "Office reads customer messages" ON public.customer_messages;
CREATE POLICY "Office reads customer messages" ON public.customer_messages
  FOR SELECT USING (public.is_office(tenant_id));

-- ── Review requests ─────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS review_request_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  -- Which channels the automatic request uses.
  ADD COLUMN IF NOT EXISTS review_request_sms BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS review_request_email BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMP WITH TIME ZONE;

-- ── Charge-out rate ─────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_labour_rate NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS rate_calculator JSONB;

COMMENT ON TABLE public.message_templates IS
  'Per-business SMS/email templates. template_key set = override of a built-in from lib/message-templates.ts.';
COMMENT ON TABLE public.customer_messages IS
  'Log of messages sent to customers. Written by the server only.';
COMMENT ON COLUMN public.jobs.review_requested_at IS
  'When the review request went out. Set once; stops a re-completed job asking twice.';
COMMENT ON COLUMN public.tenants.default_labour_rate IS
  'Charge-out rate per hour ex GST, from the rate calculator. Prefills labour lines.';
