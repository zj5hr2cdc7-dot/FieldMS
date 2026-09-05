'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { disconnectIntegration, getIntegrations } from '@/lib/integrations'
import type { Integration, IntegrationProvider } from '@/types/database'

const providers: { provider: IntegrationProvider; name: string; description: string }[] = [
  {
    provider: 'xero',
    name: 'Xero',
    description: 'Sync invoices, customers, and chart of accounts from Xero.',
  },
  {
    provider: 'myob',
    name: 'MYOB',
    description: 'Connect your MYOB company file and share financial data.',
  },
]

export default function IntegrationsPage() {
  const { currentTenant } = useAuthContext()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const message = searchParams?.get('success')
    const errorMessage = searchParams?.get('error')

    if (message) {
      setSuccess(message)
    }

    if (errorMessage) {
      setError(errorMessage)
    }

    if ((message || errorMessage) && typeof window !== 'undefined') {
      const params = new URLSearchParams(searchParams as unknown as URLSearchParams)
      params.delete('success')
      params.delete('error')
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`
      router.replace(newUrl, { scroll: false })
    }
  }, [searchParams, router])

  const refreshIntegrations = async () => {
    if (!currentTenant) return
    setLoading(true)
    setError(null)

    try {
      const data = await getIntegrations(currentTenant.id)
      setIntegrations(data)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unable to load integrations')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshIntegrations()
  }, [currentTenant])

  const handleDisconnect = async (integration: Integration) => {
    setSaving(true)
    setError(null)

    try {
      await disconnectIntegration(integration.id)
      await refreshIntegrations()
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Disconnection failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const getStatus = (provider: IntegrationProvider) => integrations.find((item) => item.provider === provider)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Integrations</h1>
          <p className="text-slate-500 mt-1">Connect Xero and MYOB to keep your books in sync</p>
        </div>
        <span className="text-sm text-slate-500">Workspace: <span className="font-medium text-slate-700">{currentTenant?.name}</span></span>
      </div>

      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
          Loading integrations…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => {
            const integration = getStatus(provider.provider)
            const isConnected = integration?.status === 'connected'

            return (
              <div key={provider.provider} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{provider.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{provider.description}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isConnected ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isConnected ? 'Connected' : 'Not connected'}
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  {isConnected && integration ? (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 text-sm">
                      <p className="font-medium text-slate-900">{integration.external_account_name}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Connected {new Date(integration.connected_at || '').toLocaleDateString('en-AU')}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Click Connect to add your {provider.name} account.</p>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`/api/integrations/${provider.provider}/connect?tenant_id=${currentTenant?.id}`}
                      className="inline-flex items-center justify-center rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors"
                    >
                      {isConnected ? 'Reconnect' : 'Connect'}
                    </a>
                    {isConnected && (
                      <button
                        disabled={saving}
                        onClick={() => handleDisconnect(integration!)}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">Note</p>
        <p className="mt-1 text-sm text-slate-500">
          This starts the real OAuth flow for Xero and MYOB. After authentication, connection details are stored in your workspace.
        </p>
      </div>
    </div>
  )
}
