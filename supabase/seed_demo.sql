
-- Demo seed for FieldMS
-- Run this in Supabase SQL Editor to create a permanent demo user, workspace, and sample estimate.
-- 1. Demo user
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'demo@demo.com',
  crypt('demopassword', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo User"}',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Demo profile
INSERT INTO public.profiles (
  id,
  full_name,
  email,
  default_tenant_id,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo User',
  'demo@demo.com',
  NULL,
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = now();

-- 3. Demo workspace / tenant
INSERT INTO public.tenants (
  id,
  name,
  slug,
  logo_url,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Demo Workspace',
  'demo-workspace',
  NULL,
  now(),
  now()
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  updated_at = now();

-- 4. Demo tenant membership
INSERT INTO public.tenant_members (
  id,
  tenant_id,
  user_id,
  role,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000100',
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'owner',
  now()
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

-- 5. Make demo workspace the default tenant for the demo user
UPDATE public.profiles
SET default_tenant_id = '00000000-0000-0000-0000-000000000010',
    updated_at = now()
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 6. Optional sample estimate
INSERT INTO public.estimates (
  id,
  business_id,
  customer_name,
  status,
  total,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'Acme Corp',
  'draft',
  1200,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.estimate_items (
  id,
  estimate_id,
  name,
  quantity,
  unit_price,
  total,
  created_at,
  updated_at
)
VALUES (
  '00000000-0000-0000-0000-000000000021',
  '00000000-0000-0000-0000-000000000020',
  'Website design',
  1,
  1200,
  1200,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Login with:
-- Email: demo@demo.com
-- Password: demopassword
