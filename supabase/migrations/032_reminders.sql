-- ============================================================
-- 032 · Automatic reminders
--
-- tenant_reminder_settings  per-workspace switches. Customer-facing
--                           reminders are OFF until the owner turns them on;
--                           the owner's own testing-due digest is on.
-- reminder_log              one row per reminder sent, so the daily job never
--                           sends the same reminder twice.
--
-- Safe to re-run.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tenant_reminder_settings (
  tenant_id         UUID PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  quote_reminders   BOOLEAN NOT NULL DEFAULT FALSE,
  invoice_reminders BOOLEAN NOT NULL DEFAULT FALSE,
  testing_digest    BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reminder_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('quote', 'invoice', 'testing_digest')),
  entity_id   UUID NOT NULL,
  step        INT NOT NULL,
  sent_to     TEXT,
  sent_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (kind, entity_id, step)
);

CREATE INDEX IF NOT EXISTS idx_reminder_log_tenant ON public.reminder_log(tenant_id, sent_at DESC);

ALTER TABLE public.tenant_reminder_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_log             ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Office reads reminder settings" ON public.tenant_reminder_settings;
CREATE POLICY "Office reads reminder settings" ON public.tenant_reminder_settings
  FOR SELECT USING (public.is_office(tenant_id));

DROP POLICY IF EXISTS "Owner manages reminder settings" ON public.tenant_reminder_settings;
CREATE POLICY "Owner manages reminder settings" ON public.tenant_reminder_settings
  FOR ALL USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id));

DROP POLICY IF EXISTS "Office reads reminder log" ON public.reminder_log;
CREATE POLICY "Office reads reminder log" ON public.reminder_log
  FOR SELECT USING (public.is_office(tenant_id));
