-- ============================================================
-- 039 · Close workspace takeover and the profile leak
--
-- Found 18 Nov by a runtime isolation check (signed in as a user of one
-- workspace, inside a rolled-back transaction).
--
-- 1. WORKSPACE TAKEOVER (critical)
--    Two INSERT policies on tenant_members allowed
--      (user_id = auth.uid()) AND (role = 'owner')
--    for ANY tenant_id. Any signed-in user could add themselves as owner of
--    any workspace whose id they knew, and immediately read its jobs and
--    customers. Proven: the test user inserted itself into another
--    workspace and could then see that workspace's job and customer.
--    The clause existed for the old two-step signup. Workspace creation is
--    now done by SECURITY DEFINER functions (037) and invites by the
--    service role (app/api/team/invite), so no client ever needs to insert
--    its own membership. Only an existing owner may add members.
--
-- 2. PROFILE LEAK
--    "Users can view all profiles" was SELECT USING (true): every signed-in
--    user of every workspace could read every user's name, email, phone,
--    emergency contact, vehicle and licences. Now: your own profile, and
--    profiles of people you share a workspace with.
--
-- 3. Profile INSERT policies collapsed to one: your own row only.
--
-- Safe to re-run.
-- ============================================================

DROP POLICY IF EXISTS "Owner adds members" ON public.tenant_members;
DROP POLICY IF EXISTS "tenant_members_insert_owner" ON public.tenant_members;
CREATE POLICY "Owner adds members" ON public.tenant_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(tenant_id));

CREATE OR REPLACE FUNCTION public.fieldms_shares_tenant(other_user UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_members me
    JOIN public.tenant_members them ON them.tenant_id = me.tenant_id
    WHERE me.user_id = auth.uid() AND them.user_id = other_user
  )
$$;
REVOKE ALL ON FUNCTION public.fieldms_shares_tenant(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fieldms_shares_tenant(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.fieldms_shares_tenant(UUID) TO authenticated;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "View own and teammates' profiles" ON public.profiles;
CREATE POLICY "View own and teammates' profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.fieldms_shares_tenant(id));

DROP POLICY IF EXISTS "Allow insert on signup" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 4. "Users can insert tenants" was INSERT WITH CHECK (true) for every role,
--    so anyone holding the public key could create workspace rows directly.
--    Workspaces are created only by SECURITY DEFINER functions (037), and no
--    client code inserts into tenants, so the policy goes.
DROP POLICY IF EXISTS "Users can insert tenants" ON public.tenants;
