-- ============================================================
-- 038 · "Not GST registered" actually means no GST
--
-- Found 18 Nov in the end-to-end test. Setup asks "GST registered?" and
-- stores the answer in tenant_onboarding.gst_registered, and nothing ever
-- read it. Every job defaulted to gst_rate 10, so a business that answered
-- No issued "Tax Invoice"s adding 10% GST. A business that is not
-- registered for GST must not charge it or issue tax invoices.
--
-- WHAT THIS DOES
--   1. tenants.gst_registered: the answer, where server code can read it
--      cheaply. NULL = never answered, treated as registered, which is the
--      behaviour every existing workspace already has.
--   2. Kept in sync from tenant_onboarding by trigger, so the setup wizard
--      needs no change.
--   3. New jobs for a tenant that answered No get gst_rate 0.
--   4. When the answer changes, open jobs with no live invoices follow it.
--      Jobs that already have a non-void invoice keep their rate: an issued
--      invoice is a record and must not change underneath the customer.
--
-- Safe to re-run.
-- ============================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS gst_registered BOOLEAN;

UPDATE public.tenants t
SET gst_registered = o.gst_registered
FROM public.tenant_onboarding o
WHERE o.tenant_id = t.id
  AND t.gst_registered IS DISTINCT FROM o.gst_registered;

CREATE OR REPLACE FUNCTION public.fieldms_apply_gst_registration(p_tenant UUID, p_registered BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
BEGIN
  UPDATE public.tenants SET gst_registered = p_registered
  WHERE id = p_tenant AND gst_registered IS DISTINCT FROM p_registered;

  UPDATE public.jobs j
  SET gst_rate = CASE WHEN p_registered IS FALSE THEN 0 ELSE 10 END
  WHERE j.tenant_id = p_tenant
    AND coalesce(j.status, '') NOT IN ('completed', 'cancelled')
    AND j.gst_rate IS DISTINCT FROM (CASE WHEN p_registered IS FALSE THEN 0 ELSE 10 END)
    AND NOT EXISTS (
      SELECT 1 FROM public.job_invoices i
      WHERE i.job_id = j.id AND i.status <> 'void'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fieldms_apply_gst_registration(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fieldms_apply_gst_registration(UUID, BOOLEAN) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.fieldms_onboarding_gst_sync()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.gst_registered IS DISTINCT FROM OLD.gst_registered THEN
    PERFORM public.fieldms_apply_gst_registration(NEW.tenant_id, NEW.gst_registered);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_onboarding_gst_sync ON public.tenant_onboarding;
CREATE TRIGGER trg_onboarding_gst_sync
  AFTER INSERT OR UPDATE OF gst_registered ON public.tenant_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.fieldms_onboarding_gst_sync();

CREATE OR REPLACE FUNCTION public.fieldms_job_default_gst()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tenants t WHERE t.id = NEW.tenant_id AND t.gst_registered IS FALSE) THEN
    NEW.gst_rate := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_default_gst ON public.jobs;
CREATE TRIGGER trg_job_default_gst
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.fieldms_job_default_gst();

-- Bring existing non-registered workspaces into line.
SELECT public.fieldms_apply_gst_registration(o.tenant_id, o.gst_registered)
FROM public.tenant_onboarding o
WHERE o.gst_registered IS FALSE;
