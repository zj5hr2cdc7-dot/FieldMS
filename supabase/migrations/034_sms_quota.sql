-- ============================================================
-- Monthly SMS quota per tenant.
--
-- WHY
--   SMS is the one notification channel that costs real money per message,
--   and the bill lands on FieldMS rather than on the business sending them.
--   A five-electrician shop doing twenty jobs a week, with up to three
--   notifications per job, is comfortably into the hundreds of texts a month.
--   Unmetered, a handful of busy workspaces can cost more than the
--   subscriptions of everyone on the platform.
--
--   So SMS stays switched on — it is genuinely useful and customers like it —
--   but it is metered by plan. Email is not metered, because it is effectively
--   free, and when the SMS allowance runs out email keeps going.
--
-- SHAPE
--   One row per tenant per calendar month, incremented atomically. A counter
--   rather than a log: a log row per message would be a nicer audit trail and
--   a much bigger table, and we already record what was sent in
--   form_audit_events and customer_messages.
--
--   `period` is 'YYYY-MM' in UTC. Deliberately not local time: a tenant's
--   month would otherwise roll over at a different instant to the billing
--   period, and the two disagreeing by a few hours is the kind of thing that
--   produces a support email nobody can reproduce.
--
-- Plain statements, no DO blocks or dollar quoting, so this survives the
-- Supabase SQL editor splitting pasted input on semicolons. Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_sms_usage (
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- 'YYYY-MM', UTC.
  period TEXT NOT NULL,
  -- Messages handed to Twilio and acknowledged.
  sent INT NOT NULL DEFAULT 0,
  -- Messages we refused to send because the allowance was gone. Kept so the
  -- business can see what they missed, and so we can tell whether a plan's
  -- allowance is set too low before anyone complains.
  blocked INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, period)
);

CREATE INDEX IF NOT EXISTS tenant_sms_usage_period_idx
  ON public.tenant_sms_usage (period);

-- ── Row level security ──────────────────────────────────────
-- Read: any member of the tenant, so the field app can show "SMS is off for
-- the rest of the month" rather than silently not sending.
-- Write: nobody through the API. All increments happen in the send path with
-- the service role, which bypasses RLS. A tenant that could write this row
-- could grant itself unlimited texts at our expense.

ALTER TABLE public.tenant_sms_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read sms usage" ON public.tenant_sms_usage;
CREATE POLICY "Members read sms usage" ON public.tenant_sms_usage
  FOR SELECT USING (public.is_member(tenant_id));

-- ── Atomic increment ────────────────────────────────────────
-- Called once per send attempt. Returns the row AFTER the increment so the
-- caller can log the running total without a second query.
--
-- SECURITY DEFINER with a pinned search_path: this is the only way the counter
-- moves, and it must not be hijackable by a schema earlier on someone's path.

CREATE OR REPLACE FUNCTION public.record_sms_usage(
  p_tenant UUID,
  p_period TEXT,
  p_sent INT,
  p_blocked INT
)
RETURNS public.tenant_sms_usage
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS 'INSERT INTO public.tenant_sms_usage AS u (tenant_id, period, sent, blocked, updated_at)
    VALUES (p_tenant, p_period, p_sent, p_blocked, NOW())
    ON CONFLICT (tenant_id, period) DO UPDATE
      SET sent = u.sent + EXCLUDED.sent,
          blocked = u.blocked + EXCLUDED.blocked,
          updated_at = NOW()
    RETURNING u.*';

REVOKE ALL ON FUNCTION public.record_sms_usage(UUID, TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_sms_usage(UUID, TEXT, INT, INT) FROM authenticated;

COMMENT ON TABLE public.tenant_sms_usage IS
  'Monthly SMS counter per tenant. Written only by the service role in the send path.';
COMMENT ON COLUMN public.tenant_sms_usage.blocked IS
  'Sends refused because the plan allowance was exhausted.';
