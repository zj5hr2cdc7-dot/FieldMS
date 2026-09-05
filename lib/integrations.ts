import type { Integration, IntegrationProvider } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

export async function getIntegrations(tenantId: string): Promise<Integration[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('tenant_id', tenantId)

  if (error) throw error

  return data || []
}

export async function connectIntegration(
  tenantId: string,
  userId: string,
  provider: IntegrationProvider,
  externalAccountId: string,
  externalAccountName: string
): Promise<Integration> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('integrations')
    .upsert(
      {
        tenant_id: tenantId,
        provider,
        status: 'connected',
        external_account_id: externalAccountId,
        external_account_name: externalAccountName,
        connected_at: new Date().toISOString(),
        created_by: userId,
      },
      { onConflict: 'tenant_id,provider' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('integrations')
    .update({ status: 'disconnected', external_account_id: null, external_account_name: null, connected_at: null })
    .eq('id', integrationId)

  if (error) throw error
}

export async function getIntegrationByProvider(
  tenantId: string,
  provider: IntegrationProvider
): Promise<Integration | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}
