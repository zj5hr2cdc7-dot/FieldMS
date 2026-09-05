-- Add settings columns to tenants
alter table public.tenants
  add column if not exists google_reviews_url text,
  add column if not exists abn text,
  add column if not exists phone text,
  add column if not exists website text;
