-- ============================================================
-- 037 · Signup creates the workspace, and nobody else can
--
-- WHAT WAS WRONG (found 17 Nov in the end-to-end test)
--
--   1. Half-made accounts. Signup was two steps in the browser:
--      auth.signUp(), then rpc('create_tenant_with_owner'). If the second
--      step never ran, the user existed with no workspace and no
--      membership, and /field sat on "Loading your day..." forever.
--      That is exactly what happened to jack.gapes+fieldtest1: the
--      edge logs show no rpc call at all, only the profile and
--      membership reads that follow a sign-in.
--
--   2. An open door. create_tenant_with_owner was SECURITY DEFINER with
--      row_security off, executable by `anon`, and never checked who was
--      calling. With the public publishable key anyone could create a
--      workspace and make ANY user its owner, and set that user's
--      default_tenant_id if it was still empty.
--
-- WHAT THIS DOES
--
--   A. handle_new_user() now creates the workspace in the same
--      transaction as the user, from raw_user_meta_data->>'workspace_name'.
--      Both happen or neither does. Users created without that key (team
--      invites, the dashboard "Add user" button) get a profile only, as
--      before, so invited technicians do not get a stray workspace.
--
--   B. create_tenant_with_owner() is kept for the recovery screen
--      (/setup-workspace) but now: requires a signed-in caller, only for
--      themselves; returns the caller's existing owned workspace instead
--      of making a second one; and is no longer executable by anon.
--
--   C. Slug collisions get a short random suffix instead of failing the
--      whole signup.
--
-- Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fieldms_slugify(raw TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(
    nullif(trim(both '-' from lower(regexp_replace(coalesce(raw, ''), '[^a-zA-Z0-9]+', '-', 'g'))), ''),
    'workspace'
  )
$$;

-- Internal. Not callable from the API: only the two functions below use it.
CREATE OR REPLACE FUNCTION public.fieldms_create_workspace(owner_id UUID, workspace_name TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  existing UUID;
  new_id UUID;
  clean_name TEXT := left(trim(coalesce(workspace_name, '')), 120);
  new_slug TEXT;
BEGIN
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'owner_id is required' USING ERRCODE = '22023';
  END IF;
  IF clean_name = '' THEN
    RAISE EXCEPTION 'Workspace name is required' USING ERRCODE = '22023';
  END IF;

  SELECT m.tenant_id INTO existing
  FROM public.tenant_members m
  WHERE m.user_id = owner_id AND m.role = 'owner'
  LIMIT 1;

  IF existing IS NOT NULL THEN
    UPDATE public.profiles SET default_tenant_id = existing
    WHERE id = owner_id AND default_tenant_id IS NULL;
    RETURN existing;
  END IF;

  new_slug := public.fieldms_slugify(clean_name);
  IF EXISTS (SELECT 1 FROM public.tenants t WHERE t.slug = new_slug) THEN
    new_slug := new_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
  END IF;

  INSERT INTO public.tenants (name, slug) VALUES (clean_name, new_slug)
  RETURNING id INTO new_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_id, owner_id, 'owner');

  UPDATE public.profiles SET default_tenant_id = new_id
  WHERE id = owner_id AND default_tenant_id IS NULL;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fieldms_create_workspace(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fieldms_create_workspace(UUID, TEXT) FROM anon, authenticated;

-- A. Profile and workspace in one transaction.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');

  IF coalesce(trim(new.raw_user_meta_data->>'workspace_name'), '') <> '' THEN
    PERFORM public.fieldms_create_workspace(new.id, new.raw_user_meta_data->>'workspace_name');
  END IF;

  RETURN new;
END;
$$;

-- B. Kept for /setup-workspace; locked to the caller.
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  tenant_name TEXT,
  tenant_slug TEXT,
  user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off
AS $$
DECLARE
  caller UUID := auth.uid();
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'You need to be signed in to create a workspace' USING ERRCODE = '42501';
  END IF;
  IF user_id IS DISTINCT FROM caller THEN
    RAISE EXCEPTION 'You can only create a workspace for yourself' USING ERRCODE = '42501';
  END IF;
  -- tenant_slug is ignored: the slug is derived and de-duplicated server side.
  RETURN public.fieldms_create_workspace(caller, tenant_name);
END;
$$;

REVOKE ALL ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_with_owner(TEXT, TEXT, UUID) TO authenticated;
