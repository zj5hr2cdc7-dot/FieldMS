-- 040: 30-day free trial, no card needed.
--
-- Every workspace gets trial_ends_at. New workspaces start at now() + 30 days.
-- Existing workspaces get a fresh 30 days from today, so nobody who signed up
-- before the trial existed is locked out the moment this ships.
--
-- Owners can UPDATE their own tenants row (name, logo, ABN...), so the trial
-- date is guarded by a trigger: only the database owner / service role (the
-- billing routes, the SQL editor) can move it. An owner extending their own
-- trial through the API gets their change silently ignored.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.tenants
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days');

UPDATE public.tenants
   SET trial_ends_at = greatest(coalesce(created_at, now()) + interval '30 days',
                                now() + interval '30 days')
 WHERE trial_ends_at IS NULL;

CREATE OR REPLACE FUNCTION public.fieldms_guard_trial()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.trial_ends_at := now() + interval '30 days';
  ELSIF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    NEW.trial_ends_at := OLD.trial_ends_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_trial ON public.tenants;
CREATE TRIGGER trg_guard_trial
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.fieldms_guard_trial();

-- One answer for "can this workspace use FieldMS right now?", readable by any
-- member (technicians cannot read tenant_subscriptions directly).
CREATE OR REPLACE FUNCTION public.fieldms_access(p_tenant UUID)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_end   TIMESTAMP WITH TIME ZONE;
  s_stat  TEXT;
  result  TEXT;
BEGIN
  IF NOT public.is_member(p_tenant) THEN
    RAISE EXCEPTION 'not a member of this workspace' USING ERRCODE = '42501';
  END IF;

  SELECT trial_ends_at INTO t_end FROM public.tenants WHERE id = p_tenant;
  SELECT status INTO s_stat FROM public.tenant_subscriptions WHERE tenant_id = p_tenant;

  IF s_stat IN ('active', 'trialing', 'past_due') THEN
    result := 'subscribed';
  ELSIF t_end IS NULL OR t_end > now() THEN
    result := 'trial';
  ELSE
    result := 'expired';
  END IF;

  RETURN json_build_object(
    'status', result,
    'trial_ends_at', t_end,
    'subscription_status', coalesce(s_stat, 'none')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fieldms_access(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fieldms_access(UUID) TO authenticated;
