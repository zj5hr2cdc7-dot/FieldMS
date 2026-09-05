-- ============================================================
-- Employee (field) app: time tracking + company announcements.
-- Employees clock on/off, track travel & lunch, submit timesheets.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('shift', 'travel', 'lunch', 'overtime')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  submitted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_time_entries_user ON public.time_entries(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_tenant ON public.time_entries(tenant_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.company_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON public.company_announcements(tenant_id, created_at DESC);

-- Employee profile extras (qualifications, licences, vehicle, emergency contact)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS vehicle TEXT,
  ADD COLUMN IF NOT EXISTS qualifications TEXT[],
  ADD COLUMN IF NOT EXISTS licences TEXT[];

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_announcements ENABLE ROW LEVEL SECURITY;

-- Employees see and manage only their own time entries
CREATE POLICY "Users manage own time entries"
  ON public.time_entries FOR ALL
  USING (user_id = auth.uid() AND tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()))
  WITH CHECK (user_id = auth.uid() AND tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

-- Admins/owners can view all time entries in their tenant (for payroll/approval)
CREATE POLICY "Admins view tenant time entries"
  ON public.time_entries FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Announcements: any member can read; only owner/admin can write
CREATE POLICY "Members read announcements"
  ON public.company_announcements FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()));

CREATE POLICY "Admins manage announcements"
  ON public.company_announcements FOR ALL
  USING (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')))
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')));
