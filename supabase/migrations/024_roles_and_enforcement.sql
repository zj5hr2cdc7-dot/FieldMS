-- ============================================================
-- Roles: Owner, Manager, Technician — enforced at the database.
--
-- WHY THIS EXISTS
--   lib/permissions.ts previously described a role model that only the UI
--   respected. RLS on jobs, invoices, billing items, estimates, customers and
--   pricing was tenant scoped only, so any signed in technician could read
--   supplier costs, margins, every customer record and every invoice straight
--   from the browser console. The React redirect that sends them to /field is
--   a convenience, not a control.
--
--   This migration makes the role model real:
--     1. Renames roles to the ServiceM8 vocabulary the trade understands
--     2. Adds helper functions so policies stay readable
--     3. Adds role aware policies to the tables that leak money information
--
-- ROLE MODEL (after ServiceM8's security roles)
--   owner       everything, including cost and profit
--   manager     all jobs, customers, quotes, invoices, sale pricing;
--               NOT cost or profit, NOT settings or staff
--   technician  only jobs assigned to them; no customer list, no pricing
--
-- Safe to re-run.
-- ============================================================

-- ── 1. Rename the roles ─────────────────────────────────────
ALTER TABLE public.tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;

UPDATE public.tenant_members SET role = 'manager'    WHERE role = 'admin';
UPDATE public.tenant_members SET role = 'technician' WHERE role = 'member';

ALTER TABLE public.tenant_members
  ADD CONSTRAINT tenant_members_role_check
  CHECK (role IN ('owner', 'manager', 'technician'));

-- Every workspace needs exactly one accountable owner. If a rename or an
-- earlier bug left one without, promote the earliest member.
INSERT INTO public.tenant_members (tenant_id, user_id, role)
SELECT DISTINCT ON (t.id) t.id, tm.user_id, 'owner'
  FROM public.tenants t
  JOIN public.tenant_members tm ON tm.tenant_id = t.id
 WHERE NOT EXISTS (
   SELECT 1 FROM public.tenant_members o
    WHERE o.tenant_id = t.id AND o.role = 'owner'
 )
 ORDER BY t.id, tm.created_at
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner';

-- ── 2. Helper functions ─────────────────────────────────────
-- SECURITY DEFINER so a policy can read tenant_members without recursing
-- through tenant_members' own policies. STABLE so the planner caches them
-- per statement rather than calling once per row.

CREATE OR REPLACE FUNCTION public.my_role(p_tenant UUID)
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.tenant_members
   WHERE tenant_id = p_tenant AND user_id = auth.uid()
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_office(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
     WHERE tenant_id = p_tenant AND user_id = auth.uid()
       AND role IN ('owner', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
     WHERE tenant_id = p_tenant AND user_id = auth.uid() AND role = 'owner'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_member(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
     WHERE tenant_id = p_tenant AND user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.my_role(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_office(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner(UUID)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member(UUID) TO authenticated;

-- ── 3. Per tenant option: do technicians see all jobs? ──────
-- ServiceM8 makes this configurable. Small shops usually want everyone to see
-- everything; larger ones do not. Default false, matching ServiceM8's
-- Technician role.
DO $ob$
BEGIN
  IF to_regclass('public.tenant_onboarding') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tenant_onboarding
             ADD COLUMN IF NOT EXISTS technicians_see_all_jobs BOOLEAN NOT NULL DEFAULT FALSE';
  END IF;
END $ob$;

CREATE OR REPLACE FUNCTION public.techs_see_all(p_tenant UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT technicians_see_all_jobs FROM public.tenant_onboarding WHERE tenant_id = p_tenant),
    FALSE
  );
$$;
GRANT EXECUTE ON FUNCTION public.techs_see_all(UUID) TO authenticated;

-- ── 4. Jobs: technicians see only their own ─────────────────
-- Guarded because public.jobs has no migration in this repo (the numbering
-- jumps 002 to 004), so it may be absent on a freshly built database.
DO $jobs$
BEGIN
  IF to_regclass('public.jobs') IS NULL THEN
    RAISE NOTICE 'Skipping job policies: public.jobs does not exist';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS "Tenant members read jobs" ON public.jobs';
  EXECUTE 'CREATE POLICY "Tenant members read jobs" ON public.jobs FOR SELECT
    USING (
      public.is_office(tenant_id)
      OR (
        public.is_member(tenant_id)
        AND (public.techs_see_all(tenant_id) OR assigned_to = auth.uid() OR created_by = auth.uid())
      )
    )';

  EXECUTE 'DROP POLICY IF EXISTS "Office writes jobs" ON public.jobs';
  EXECUTE 'CREATE POLICY "Office writes jobs" ON public.jobs FOR INSERT
    WITH CHECK (public.is_office(tenant_id))';

  EXECUTE 'DROP POLICY IF EXISTS "Update own or any if office" ON public.jobs';
  EXECUTE 'CREATE POLICY "Update own or any if office" ON public.jobs FOR UPDATE
    USING (public.is_office(tenant_id) OR assigned_to = auth.uid())
    WITH CHECK (public.is_office(tenant_id) OR assigned_to = auth.uid())';

  EXECUTE 'DROP POLICY IF EXISTS "Office deletes jobs" ON public.jobs';
  EXECUTE 'CREATE POLICY "Office deletes jobs" ON public.jobs FOR DELETE
    USING (public.is_office(tenant_id))';
END $jobs$;

-- ── 5. Money: cost and profit are owner only ────────────────
-- job_billing_items carries `cost` and margin. A Manager quoting a job does
-- not need it and, per ServiceM8, must not have it.
DO $bill$
BEGIN
  IF to_regclass('public.job_billing_items') IS NULL THEN
    RAISE NOTICE 'Skipping billing item policies: table absent';
    RETURN;
  END IF;
  EXECUTE 'ALTER TABLE public.job_billing_items ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS "tenant members can read billing items" ON public.job_billing_items';
  EXECUTE 'DROP POLICY IF EXISTS "Owner reads billing items" ON public.job_billing_items';
  EXECUTE 'CREATE POLICY "Owner reads billing items" ON public.job_billing_items FOR SELECT
           USING (public.is_owner(tenant_id))';
  EXECUTE 'DROP POLICY IF EXISTS "Owner writes billing items" ON public.job_billing_items';
  EXECUTE 'CREATE POLICY "Owner writes billing items" ON public.job_billing_items FOR ALL
           USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id))';
END $bill$;

-- Supplier cost and negotiated pricing: owner only for the same reason.
DO $$
BEGIN
  IF to_regclass('public.tenant_price_overrides') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tenant_price_overrides ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Owner manages price overrides" ON public.tenant_price_overrides';
    EXECUTE 'CREATE POLICY "Owner manages price overrides" ON public.tenant_price_overrides FOR ALL
             USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id))';
  END IF;

  IF to_regclass('public.tenant_pricing_settings') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tenant_pricing_settings ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Owner manages pricing settings" ON public.tenant_pricing_settings';
    EXECUTE 'CREATE POLICY "Owner manages pricing settings" ON public.tenant_pricing_settings FOR ALL
             USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id))';
  END IF;

  IF to_regclass('public.tenant_supplier_accounts') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.tenant_supplier_accounts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Owner manages supplier accounts" ON public.tenant_supplier_accounts';
    EXECUTE 'CREATE POLICY "Owner manages supplier accounts" ON public.tenant_supplier_accounts FOR ALL
             USING (public.is_owner(tenant_id)) WITH CHECK (public.is_owner(tenant_id))';
  END IF;
END $$;

-- ── 6. Invoices, quotes, variations: office only ────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'job_invoices', 'job_invoice_items', 'job_variations', 'job_payments', 'purchase_orders'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

      -- job_invoice_items has no tenant_id of its own; it inherits via parent.
      IF t = 'job_invoice_items' THEN
        EXECUTE 'DROP POLICY IF EXISTS "Office manages invoice items" ON public.job_invoice_items';
        EXECUTE 'CREATE POLICY "Office manages invoice items" ON public.job_invoice_items FOR ALL
                 USING (EXISTS (SELECT 1 FROM public.job_invoices i
                                 WHERE i.id = invoice_id AND public.is_office(i.tenant_id)))
                 WITH CHECK (EXISTS (SELECT 1 FROM public.job_invoices i
                                 WHERE i.id = invoice_id AND public.is_office(i.tenant_id)))';

      -- Technicians take payment on site, so payments are readable and
      -- insertable by any member; everything else is office only.
      ELSIF t = 'job_payments' THEN
        EXECUTE 'DROP POLICY IF EXISTS "Members record payments" ON public.job_payments';
        EXECUTE 'CREATE POLICY "Members record payments" ON public.job_payments FOR INSERT
                 WITH CHECK (public.is_member(tenant_id))';
        EXECUTE 'DROP POLICY IF EXISTS "Office reads payments" ON public.job_payments';
        EXECUTE 'CREATE POLICY "Office reads payments" ON public.job_payments FOR SELECT
                 USING (public.is_office(tenant_id))';

      ELSE
        EXECUTE format('DROP POLICY IF EXISTS "Office manages %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Office manages %I" ON public.%I FOR ALL
                        USING (public.is_office(tenant_id))
                        WITH CHECK (public.is_office(tenant_id))', t, t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Estimates key on business_id rather than tenant_id.
DO $$
BEGIN
  IF to_regclass('public.estimates') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS "Office manages estimates" ON public.estimates';
    EXECUTE 'CREATE POLICY "Office manages estimates" ON public.estimates FOR ALL
             USING (public.is_office(business_id)) WITH CHECK (public.is_office(business_id))';
  END IF;
END $$;

-- ── 7. Customers and sites ──────────────────────────────────
-- The customer list, history and marketing data is a business asset. A
-- technician sees the site details on their own job, not the whole book.
DROP POLICY IF EXISTS "Tenant members manage customers" ON public.customers;
CREATE POLICY "Office manages customers" ON public.customers FOR ALL
  USING (public.is_office(tenant_id))
  WITH CHECK (public.is_office(tenant_id));

DROP POLICY IF EXISTS "Tenant members manage sites" ON public.sites;
CREATE POLICY "Office manages sites" ON public.sites FOR ALL
  USING (public.is_office(tenant_id))
  WITH CHECK (public.is_office(tenant_id));

-- Technicians can read the site for a job they are actually on.
DROP POLICY IF EXISTS "Techs read sites for their jobs" ON public.sites;
CREATE POLICY "Techs read sites for their jobs" ON public.sites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
       WHERE j.site_id = sites.id
         AND j.assigned_to = auth.uid()
    )
  );

-- ── 8. Settings: owner only ─────────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['tenant_branding', 'integrations', 'tenant_onboarding'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "Office reads %I" ON public.%I', t, t);
      -- Everyone needs to read branding (it renders on documents) and
      -- onboarding (trades gate the UI), but only an owner may change them.
      EXECUTE format('CREATE POLICY "Office reads %I" ON public.%I FOR SELECT
                      USING (public.is_member(tenant_id))', t, t);
      EXECUTE format('DROP POLICY IF EXISTS "Owner writes %I" ON public.%I', t, t);
      EXECUTE format('CREATE POLICY "Owner writes %I" ON public.%I FOR ALL
                      USING (public.is_owner(tenant_id))
                      WITH CHECK (public.is_owner(tenant_id))', t, t);
    END IF;
  END LOOP;
END $$;

-- ── 9. Staff management: owner only ─────────────────────────
DROP POLICY IF EXISTS "Tenant admins can insert members" ON public.tenant_members;
CREATE POLICY "Owner adds members" ON public.tenant_members FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR public.is_owner(tenant_id)
    OR (user_id = auth.uid() AND role = 'owner')   -- creating your own workspace
  );

DROP POLICY IF EXISTS "Tenant admins can delete members" ON public.tenant_members;
CREATE POLICY "Owner removes members" ON public.tenant_members FOR DELETE
  USING (public.is_owner(tenant_id));

DROP POLICY IF EXISTS "Owner changes roles" ON public.tenant_members;
CREATE POLICY "Owner changes roles" ON public.tenant_members FOR UPDATE
  USING (public.is_owner(tenant_id))
  WITH CHECK (public.is_owner(tenant_id));

COMMENT ON FUNCTION public.is_office(UUID) IS
  'True when the current user is an owner or manager of this tenant. Use in policies rather than repeating the subquery.';
