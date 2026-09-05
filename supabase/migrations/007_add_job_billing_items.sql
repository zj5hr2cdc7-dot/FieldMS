-- Job billing items — persisted labour quotes per job
create table if not exists job_billing_items (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references jobs(id) on delete cascade,
  tenant_id     uuid not null references tenants(id) on delete cascade,
  description   text not null,
  hours         numeric(8, 2) not null check (hours > 0),
  rate_per_hour numeric(10, 2) not null check (rate_per_hour >= 0),
  markup_percent numeric(6, 2) not null default 0,
  -- revenue = hours * rate_per_hour * (1 + markup_percent/100)
  revenue       numeric(12, 2) not null,
  -- cost = hours * rate_per_hour (before markup)
  cost          numeric(12, 2) not null,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists job_billing_items_tenant_id_idx on job_billing_items(tenant_id);
create index if not exists job_billing_items_job_id_idx on job_billing_items(job_id);

-- RLS
alter table job_billing_items enable row level security;

create policy "tenant members can read billing items"
  on job_billing_items for select
  using (
    exists (
      select 1 from tenant_members
      where tenant_members.tenant_id = job_billing_items.tenant_id
        and tenant_members.user_id = auth.uid()
    )
  );

create policy "tenant members can insert billing items"
  on job_billing_items for insert
  with check (
    exists (
      select 1 from tenant_members
      where tenant_members.tenant_id = job_billing_items.tenant_id
        and tenant_members.user_id = auth.uid()
    )
  );

create policy "tenant members can update billing items"
  on job_billing_items for update
  using (
    exists (
      select 1 from tenant_members
      where tenant_members.tenant_id = job_billing_items.tenant_id
        and tenant_members.user_id = auth.uid()
    )
  );

create policy "tenant members can delete billing items"
  on job_billing_items for delete
  using (
    exists (
      select 1 from tenant_members
      where tenant_members.tenant_id = job_billing_items.tenant_id
        and tenant_members.user_id = auth.uid()
    )
  );
