-- Scheduler upgrades: work hours, skills, work-hours-aware recurrence
-- Pain points: ServiceM8 recurring jobs use 24h blocks not work hours; Jobber has
-- no skill/availability-based matching or conflict detection.

-- Tenant working-hours settings
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS work_day_start TIME DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS work_day_end TIME DEFAULT '15:30',
  ADD COLUMN IF NOT EXISTS working_days INT[] DEFAULT '{1,2,3,4,5}'; -- 1=Mon .. 7=Sun

-- Skills per team member (free-text tags, e.g. 'solar', 'three-phase', 'data', 'ev-charger')
ALTER TABLE public.tenant_members
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}';

-- Recurring jobs, expanded on working days only
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS scheduled_start TIME,               -- start time on due_date
  ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none'
    CHECK (recurrence IN ('none', 'weekly', 'fortnightly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_until DATE,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_recurrence_parent ON public.jobs(recurrence_parent_id);
