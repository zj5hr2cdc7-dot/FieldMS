
-- Safe for re-runs: drop tables if they exist
DROP TABLE IF EXISTS public.tenant_members CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;

-- Enable citext extension for case-insensitive text
CREATE EXTENSION IF NOT EXISTS citext;

-- Enable RLS
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Create tenants table (organizations/workspaces)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug CITEXT UNIQUE NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tenant_members table (users in organizations)
CREATE TABLE public.tenant_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT NOT NULL,
  avatar_url TEXT,
  default_tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tenant_members_tenant_id ON public.tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user_id ON public.tenant_members(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_default_tenant_id ON public.profiles(default_tenant_id);

-- Enable RLS on tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants
CREATE POLICY "Users can view tenants they belong to"
  ON public.tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Tenant owners can update tenant"
  ON public.tenants FOR UPDATE
  USING (
    id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for tenant_members
DROP POLICY IF EXISTS "Users can view members of their tenants" ON public.tenant_members;
CREATE POLICY "Users can view members of their tenants"
  ON public.tenant_members FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Tenant admins can insert members" ON public.tenant_members;
CREATE POLICY "Tenant admins can insert members"
  ON public.tenant_members FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR tenant_id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

DROP POLICY IF EXISTS "Users can insert their own owner membership" ON public.tenant_members;
CREATE POLICY "Users can insert their own owner membership"
  ON public.tenant_members FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' OR (user_id = auth.uid() AND role = 'owner')
  );

DROP POLICY IF EXISTS "Tenant admins can delete members" ON public.tenant_members;
CREATE POLICY "Tenant admins can delete members"
  ON public.tenant_members FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert profiles" ON public.profiles;
CREATE POLICY "Users can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid() OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

-- RLS Policies for tenant creation
DROP POLICY IF EXISTS "Users can insert tenants" ON public.tenants;
CREATE POLICY "Users can insert tenants"
  ON public.tenants FOR INSERT
  WITH CHECK (true);

-- Function to handle new user sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

-- Trigger for new user sign up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to create tenant and add owner
CREATE OR REPLACE FUNCTION public.create_tenant_with_owner(
  tenant_name TEXT,
  tenant_slug TEXT,
  user_id UUID
)
RETURNS UUID AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  SET LOCAL row_security = off;
  INSERT INTO public.tenants (name, slug)
  VALUES (tenant_name, tenant_slug)
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.tenant_members (tenant_id, user_id, role)
  VALUES (new_tenant_id, user_id, 'owner');

  UPDATE public.profiles
  SET default_tenant_id = new_tenant_id
  WHERE id = user_id AND default_tenant_id IS NULL;

  RETURN new_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;