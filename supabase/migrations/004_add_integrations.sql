-- Safe for re-runs: drop tables if they exist
DROP TABLE IF EXISTS public.integrations CASCADE;

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('xero', 'myob')),
  status TEXT NOT NULL DEFAULT 'disconnected',
  external_account_id TEXT,
  external_account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT,
  connected_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, provider)
);

CREATE INDEX idx_integrations_tenant_id ON public.integrations(tenant_id);
CREATE INDEX idx_integrations_provider ON public.integrations(provider);
CREATE INDEX idx_integrations_status ON public.integrations(status);

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view integrations in their tenant"
  ON public.integrations FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert integrations in their tenant"
  ON public.integrations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update integrations in their tenant"
  ON public.integrations FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete integrations in their tenant"
  ON public.integrations FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
    )
  );
