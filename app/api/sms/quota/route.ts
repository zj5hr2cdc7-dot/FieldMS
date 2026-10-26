import { NextResponse } from 'next/server'
import { requireTenantMember } from '@/lib/authz'
import { getSmsQuota, SMS_ALLOWANCE } from '@/lib/sms-quota'

/**
 * GET /api/sms/quota?tenantId=...
 *
 * How many customer texts are left this month.
 *
 * Any member of the tenant can read it, including technicians: someone in the
 * field marking a job started should be able to see that the customer is
 * getting an email rather than a text, instead of assuming the text went and
 * finding out days later that it did not.
 *
 * Served through a route rather than read directly from the browser because
 * the allowance depends on the subscription, and tenant_subscriptions is not
 * readable by every member.
 */
export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get('tenantId')
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const authz = await requireTenantMember(tenantId)
  if (!authz.ok) return NextResponse.json({ error: authz.error }, { status: authz.status })

  const quota = await getSmsQuota(tenantId)
  return NextResponse.json({ quota, allowances: SMS_ALLOWANCE })
}
