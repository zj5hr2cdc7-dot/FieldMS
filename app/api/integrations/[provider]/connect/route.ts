import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireTenantRole } from '@/lib/authz'
import { encodeState } from '@/lib/oauth-state'

/*
 * SECURITY — read before changing the state handling.
 *
 * This route previously had no authentication at all. It took tenant_id from
 * a query string, trusted it, and packed it into a base64 cookie that the
 * callback then used to decide which tenant's accounting integration to
 * write. base64 is an encoding, not a signature, so the cookie was also
 * forgeable by anyone who could set a cookie on the domain.
 *
 * The attack that made this worth fixing first: a signed-in user of Tenant A
 * hits this endpoint with tenant_id=<Tenant B>, completes the OAuth dance
 * with their OWN Xero account, and the callback writes their Xero tokens onto
 * Tenant B's integrations row. From then on Tenant B's invoices sync into the
 * attacker's accounting system. Cross-tenant write and a standing data
 * exfiltration channel, from an unauthenticated GET.
 *
 * Three things now hold:
 *   1. The caller must be signed in AND an owner of the tenant they name.
 *      Connecting an accounting system is an owner-level act — it moves
 *      financial data out of FieldMS — so manager is not enough.
 *   2. The state cookie is HMAC-signed with a server-side secret, so it
 *      cannot be forged or edited in the browser.
 *   3. The `state` parameter sent to the provider is bound to that same
 *      value, so a response that did not originate from our redirect is
 *      rejected (standard OAuth CSRF protection).
 */

const PROVIDERS = ['xero', 'myob'] as const

type Provider = (typeof PROVIDERS)[number]

function getProviderConfig(provider: Provider, redirectUri: string) {
  switch (provider) {
    case 'xero':
      return {
        authorizeUrl: 'https://login.xero.com/identity/connect/authorize',
        params: {
          response_type: 'code',
          client_id: process.env.XERO_CLIENT_ID ?? '',
          redirect_uri: redirectUri,
          scope: process.env.XERO_SCOPE ?? 'openid email profile accounting.transactions accounting.settings offline_access',
          state: '',
        },
      }
    case 'myob':
      return {
        authorizeUrl: 'https://secure.myob.com/oauth2/account/authorize',
        params: {
          response_type: 'code',
          client_id: process.env.MYOB_CLIENT_ID ?? '',
          redirect_uri: redirectUri,
          scope: process.env.MYOB_SCOPE ?? 'CompanyFile',
          state: '',
        },
      }
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params
  const provider = providerParam as Provider
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
  }

  const tenantId = new URL(request.url).searchParams.get('tenant_id')
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing tenant_id query parameter' }, { status: 400 })
  }

  // The check that was missing entirely. Owner-only: connecting an accounting
  // system moves this business's financial data to a third party.
  const authz = await requireTenantRole(tenantId, ['owner'])
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status })
  }

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/integrations/${provider}/callback`
  const state = randomUUID()

  // Signed, and bound to the user who started the flow as well as the tenant,
  // so a stolen or replayed cookie cannot be completed by somebody else.
  const oauthData = encodeState({ provider, tenantId, state, userId: authz.userId })

  const config = getProviderConfig(provider, redirectUri)

  if (!config.params.client_id) {
    return NextResponse.json(
      { error: `Missing ${provider.toUpperCase()} client ID environment variable` },
      { status: 500 }
    )
  }

  const searchParams = new URLSearchParams({
    ...config.params,
    state,
  })

  const response = NextResponse.redirect(`${config.authorizeUrl}?${searchParams.toString()}`)
  response.cookies.set('fieldms_oauth_state', oauthData, {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 10,
  })
  return response
}
