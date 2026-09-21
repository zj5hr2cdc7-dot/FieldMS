import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireTenantRole } from '@/lib/authz'
import { decodeState } from '@/lib/oauth-state'

const PROVIDERS = ['xero', 'myob'] as const

type Provider = (typeof PROVIDERS)[number]

function getProviderTokenConfig(provider: Provider, code: string, redirectUri: string) {
  switch (provider) {
    case 'xero':
      return {
        tokenUrl: 'https://identity.xero.com/connect/token',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`,
            'utf8'
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
      }
    case 'myob':
      return {
        tokenUrl: 'https://secure.myob.com/oauth2/v1/authorize',
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${process.env.MYOB_CLIENT_ID}:${process.env.MYOB_CLIENT_SECRET}`,
            'utf8'
          ).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }).toString(),
      }
  }
}

async function fetchExternalAccountInfo(provider: Provider, accessToken: string) {
  if (provider === 'xero') {
    const response = await fetch('https://api.xero.com/connections', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })
    if (!response.ok) return null
    const data = await response.json()
    const connection = Array.isArray(data) ? data[0] : null
    if (!connection) return null
    return {
      external_account_id: connection.tenantId || connection.id || null,
      external_account_name: connection.tenantName || connection.tenantType || provider.toUpperCase(),
    }
  }

  if (provider === 'myob') {
    const apiKey = process.env.MYOB_API_KEY
    const apiVersion = process.env.MYOB_API_VERSION ?? 'v2'
    if (!apiKey) return null
    const response = await fetch('https://api.myob.com/accountright', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'x-myobapi-key': apiKey,
        'x-myobapi-version': apiVersion,
        Accept: 'application/json',
      },
    })
    if (!response.ok) return null
    const items = await response.json()
    const company = Array.isArray(items) ? items[0] : null
    if (!company) return null
    return {
      external_account_id: company.CompanyFileUid || company.Id || null,
      external_account_name: company.Name || provider.toUpperCase(),
    }
  }

  return null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const resolvedParams = await params
  const provider = resolvedParams.provider as Provider
  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
  }

  const query = new URL(request.url).searchParams
  const code = query.get('code')
  const state = query.get('state')
  const error = query.get('error')
  if (error) {
    return NextResponse.redirect(`/dashboard/integrations?error=${encodeURIComponent(error)}`)
  }

  if (!code || !state) {
    return NextResponse.redirect('/dashboard/integrations?error=Missing+code+or+state')
  }

  const cookieStore = await cookies()
  const oauthData = cookieStore.get('fieldms_oauth_state')?.value
  if (!oauthData) {
    return NextResponse.redirect('/dashboard/integrations?error=Missing+OAuth+state+cookie')
  }

  /*
   * The state cookie is "<base64url payload>.<hmac>". decodeState verifies the
   * signature before parsing: this used to be plain base64, which anyone could
   * edit to name any tenant they liked, and the only thing checked afterwards
   * was that some user was signed in.
   */
  const parsed = decodeState(oauthData)
  if (!parsed || parsed.state !== state || parsed.provider !== provider) {
    return NextResponse.redirect('/dashboard/integrations?error=Invalid+OAuth+state')
  }

  /*
   * Re-check membership at the point of write. The signature above proves the
   * cookie is ours and unmodified, but authorisation is re-established from
   * the live session rather than trusted from a ten-minute-old cookie: the
   * user may have been removed from the tenant in between.
   */
  const authz = await requireTenantRole(parsed.tenantId, ['owner'])
  if (!authz.ok) {
    return NextResponse.redirect(
      `/dashboard/integrations?error=${encodeURIComponent('You are not authorised to connect an integration for this workspace')}`
    )
  }
  if (authz.userId !== parsed.userId) {
    return NextResponse.redirect('/dashboard/integrations?error=Invalid+OAuth+state')
  }

  const origin = new URL(request.url).origin
  const redirectUri = `${origin}/api/integrations/${provider}/callback`
  const tokenConfig = getProviderTokenConfig(provider, code, redirectUri)

  const missingCredentials =
    provider === 'xero'
      ? !process.env.XERO_CLIENT_ID || !process.env.XERO_CLIENT_SECRET
      : !process.env.MYOB_CLIENT_ID || !process.env.MYOB_CLIENT_SECRET

  if (missingCredentials) {
    return NextResponse.redirect(`/dashboard/integrations?error=Missing+${provider.toUpperCase()}+credentials`)
  }

  const tokenResponse = await fetch(tokenConfig.tokenUrl, {
    method: 'POST',
    headers: tokenConfig.headers,
    body: tokenConfig.body,
  })

  if (!tokenResponse.ok) {
    const details = await tokenResponse.text()
    return NextResponse.redirect(`/dashboard/integrations?error=${encodeURIComponent(`Token exchange failed: ${details}`)}`)
  }

  const tokenData = await tokenResponse.json()
  const accessToken = tokenData.access_token
  const refreshToken = tokenData.refresh_token
  const expiresIn = Number(tokenData.expires_in) || 0
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null
  // scopes from provider (if any) are available on tokenData.scope

  const accountInfo = await fetchExternalAccountInfo(provider, accessToken)

  const admin = createAdminClient()
  const { error: upsertError } = await admin
    .from('integrations')
    .upsert(
      {
        tenant_id: parsed.tenantId,
        provider,
        status: 'connected',
        external_account_id: accountInfo?.external_account_id ?? null,
        external_account_name: accountInfo?.external_account_name ?? provider.toUpperCase(),
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
        expires_at: expiresAt,
        created_by: authz.userId,
      },
      { onConflict: 'tenant_id,provider' }
    )

  if (upsertError) {
    return NextResponse.redirect(`/dashboard/integrations?error=${encodeURIComponent(upsertError.message)}`)
  }

  const response = NextResponse.redirect(
    `/dashboard/integrations?success=${encodeURIComponent(`${provider.toUpperCase()} connected successfully`)}`
  )
  response.cookies.delete('fieldms_oauth_state')

  return response
}
