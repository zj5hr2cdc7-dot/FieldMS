import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

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

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/integrations/${provider}/callback`
  const state = randomUUID()

  const oauthData = Buffer.from(
    JSON.stringify({ provider, tenantId, state }),
    'utf8'
  ).toString('base64')

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
