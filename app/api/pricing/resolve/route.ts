import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolvePrice, getTrendWindows, DEFAULT_PRICING_SETTINGS } from '@/lib/pricing/engine'
import type { TenantPricingSettings } from '@/types/pricing'

/**
 * POST /api/pricing/resolve
 * Body: { tenantId, masterProductIds: string[], includeTrends?: boolean }
 * Returns each product's resolved price with full provenance for the tenant.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const tenantId = body?.tenantId as string | undefined
  const ids = (body?.masterProductIds as string[] | undefined)?.slice(0, 100)
  if (!tenantId || !ids?.length) {
    return NextResponse.json({ error: 'tenantId and masterProductIds are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('tenant_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: settingsRow } = await admin
    .from('tenant_pricing_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const settings: TenantPricingSettings = settingsRow ?? {
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
    ...DEFAULT_PRICING_SETTINGS,
  }

  const resolved = await Promise.all(ids.map((id) => resolvePrice(tenantId, id, settings)))

  const trends = body?.includeTrends && ids.length === 1 ? await getTrendWindows(ids[0]) : null

  return NextResponse.json({ prices: resolved, trends, settings })
}
