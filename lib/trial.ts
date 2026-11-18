/**
 * 30-day free trial (migration 040). One read, `fieldms_access`, answers
 * "can this workspace use FieldMS right now?" for any member, including
 * technicians who cannot read the subscription table themselves.
 */
import { createClient } from '@/utils/supabase/client'

export const TRIAL_DAYS = 30

export type AccessStatus = 'subscribed' | 'trial' | 'expired'

export interface Access {
  status: AccessStatus
  trialEndsAt: string | null
  daysLeft: number | null
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86_400_000))
}

export async function getAccess(tenantId: string): Promise<Access | null> {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('fieldms_access', { p_tenant: tenantId })
  if (error || !data) return null
  const d = data as { status: AccessStatus; trial_ends_at: string | null }
  return { status: d.status, trialEndsAt: d.trial_ends_at, daysLeft: daysUntil(d.trial_ends_at) }
}
