'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { CONNECTORS } from '@/lib/pricing/connectors'
import {
  searchProducts,
  getSupplierOffers,
  getRecentChanges,
  getPricingSettings,
  savePricingSettings,
  setPriceOverride,
  clearPriceOverride,
  getSupplierAccounts,
  linkSupplierAccount,
  unlinkSupplierAccount,
  getAlerts,
  markAlertsRead,
  resolvePrices,
  triggerRefresh,
} from '@/lib/pricing/client'
import type {
  MasterProduct,
  PriceAlert,
  PriceChange,
  PriceSource,
  ResolvedPrice,
  SupplierProduct,
  TenantSupplierAccount,
  TrendWindows,
} from '@/types/pricing'

const PRICE_SOURCES: { value: PriceSource; label: string }[] = [
  { value: 'market_median', label: 'Median market price (default)' },
  { value: 'market_average', label: 'Australian market average' },
  { value: 'market_lowest', label: 'Lowest market price' },
  { value: 'cheapest_trade', label: 'Cheapest linked trade account' },
  { value: 'preferred_supplier', label: 'Preferred supplier price' },
  { value: 'manual', label: 'Manual pricing only' },
]

const THRESHOLDS = [2, 5, 10]

function money(v: number | null | undefined) {
  return v === null || v === undefined ? '—' : `$${v.toFixed(2)}`
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-300">—</span>
  const up = pct > 0
  return (
    <span className={`text-xs font-semibold ${up ? 'text-red-600' : pct < 0 ? 'text-green-600' : 'text-slate-400'}`}>
      {up ? '▲' : pct < 0 ? '▼' : '•'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

export default function MaterialsPage() {
  const { currentTenant, session } = useAuthContext()
  const user = session?.user ?? null

  const [products, setProducts] = useState<MasterProduct[]>([])
  const [resolved, setResolved] = useState<Map<string, ResolvedPrice>>(new Map())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Detail drawer
  const [selected, setSelected] = useState<MasterProduct | null>(null)
  const [offers, setOffers] = useState<SupplierProduct[]>([])
  const [changes, setChanges] = useState<PriceChange[]>([])
  const [trends, setTrends] = useState<TrendWindows | null>(null)
  const [overridePrice, setOverridePrice] = useState('')

  // Settings & accounts
  const [showSettings, setShowSettings] = useState(false)
  const [priceSource, setPriceSource] = useState<PriceSource>('market_median')
  const [preferredSupplier, setPreferredSupplier] = useState('')
  const [threshold, setThreshold] = useState(5)
  const [customThreshold, setCustomThreshold] = useState('')
  const [accounts, setAccounts] = useState<TenantSupplierAccount[]>([])
  const [linkSupplier, setLinkSupplier] = useState('')
  const [linkAccountRef, setLinkAccountRef] = useState('')
  const [alerts, setAlerts] = useState<PriceAlert[]>([])

  const loadProducts = useCallback(async (query: string) => {
    if (!currentTenant) return
    setLoading(true)
    try {
      const rows = await searchProducts(query)
      setProducts(rows)
      if (rows.length) {
        const { prices } = await resolvePrices(currentTenant.id, rows.map((r) => r.id))
        setResolved(new Map(prices.map((p) => [p.masterProductId, p])))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials.')
    } finally {
      setLoading(false)
    }
  }, [currentTenant])

  useEffect(() => {
    if (!currentTenant) return
    loadProducts('')
    getPricingSettings(currentTenant.id).then((s) => {
      if (s) {
        setPriceSource(s.price_source)
        setPreferredSupplier(s.preferred_supplier_key ?? '')
        setThreshold(Number(s.alert_threshold_pct))
      }
    }).catch(() => {})
    getSupplierAccounts(currentTenant.id).then(setAccounts).catch(() => {})
    getAlerts(currentTenant.id, true).then(setAlerts).catch(() => {})
  }, [currentTenant, loadProducts])

  // Debounced search
  useEffect(() => {
    const t = window.setTimeout(() => loadProducts(search), 350)
    return () => window.clearTimeout(t)
  }, [search, loadProducts])

  const openDetail = async (product: MasterProduct) => {
    if (!currentTenant) return
    setSelected(product)
    setOffers([])
    setChanges([])
    setTrends(null)
    setOverridePrice('')
    try {
      const [offerRows, changeRows, resolvedDetail] = await Promise.all([
        getSupplierOffers(product.id),
        getRecentChanges(product.id),
        resolvePrices(currentTenant.id, [product.id], true),
      ])
      setOffers(offerRows)
      setChanges(changeRows)
      setTrends(resolvedDetail.trends)
      setResolved((prev) => new Map(prev).set(product.id, resolvedDetail.prices[0]))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product detail.')
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true); setError(null)
    try {
      const result = await triggerRefresh()
      const changed = (result.results as { priceChanges?: number }[]).reduce((s, r) => s + (r.priceChanges ?? 0), 0)
      setSuccess(`Prices refreshed from ${result.results.length} supplier(s) — ${changed} price change(s) recorded.`)
      if (result.failures.length) setError(result.failures.map((f) => `${f.supplier}: ${f.error}`).join(' · '))
      await loadProducts(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!currentTenant) return
    const pct = customThreshold ? parseFloat(customThreshold) : threshold
    try {
      await savePricingSettings(currentTenant.id, {
        price_source: priceSource,
        preferred_supplier_key: preferredSupplier || null,
        alert_threshold_pct: Number.isFinite(pct) && pct > 0 ? pct : 5,
      })
      setSuccess('Pricing settings saved.')
      setShowSettings(false)
      await loadProducts(search)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    }
  }

  const linkedKeys = useMemo(() => new Set(accounts.filter((a) => a.status !== 'disconnected').map((a) => a.supplier_key)), [accounts])
  const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Materials & live pricing</h1>
          <p className="text-slate-500 mt-1">Always-current material prices — market data plus your own trade accounts. No more manual price books.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setShowSettings((v) => !v)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Pricing settings
          </button>
          <button type="button" onClick={handleRefresh} disabled={refreshing} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {refreshing ? 'Refreshing…' : '↻ Refresh prices now'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {/* Price movement alerts */}
      {alerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-amber-800 uppercase tracking-wide">Price movement alerts</h2>
            <button
              type="button"
              onClick={async () => { if (currentTenant) { await markAlertsRead(currentTenant.id); setAlerts([]) } }}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900"
            >
              Mark all read
            </button>
          </div>
          <ul className="space-y-1">
            {alerts.slice(0, 6).map((a) => (
              <li key={a.id} className="text-sm text-amber-800">• {a.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-semibold text-slate-900">Pricing settings</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Price source</label>
              <select value={priceSource} onChange={(e) => setPriceSource(e.target.value as PriceSource)} className={`${inputCls} w-full`}>
                {PRICE_SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            {priceSource === 'preferred_supplier' && (
              <div>
                <label className="block text-sm text-slate-600 mb-1">Preferred supplier</label>
                <select value={preferredSupplier} onChange={(e) => setPreferredSupplier(e.target.value)} className={`${inputCls} w-full`}>
                  <option value="">Select…</option>
                  {CONNECTORS.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-600 mb-1">Alert me when prices move by</label>
              <div className="flex gap-1.5">
                {THRESHOLDS.map((t) => (
                  <button key={t} type="button" onClick={() => { setThreshold(t); setCustomThreshold('') }}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold border ${threshold === t && !customThreshold ? 'bg-brand border-brand text-white' : 'bg-white border-slate-300 text-slate-600'}`}>
                    {t}%
                  </button>
                ))}
                <input value={customThreshold} onChange={(e) => setCustomThreshold(e.target.value)} placeholder="Custom %" className={`${inputCls} w-24`} />
              </div>
            </div>
          </div>

          {/* Linked trade accounts */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Linked wholesaler trade accounts</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {CONNECTORS.map((c) => {
                const linked = linkedKeys.has(c.key)
                return (
                  <span key={c.key} className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                    linked ? 'bg-green-50 border-green-300 text-green-700' : c.ready ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-50 border-dashed border-slate-300 text-slate-400'
                  }`}>
                    {c.name}{linked ? ' ✓ linked' : c.ready ? '' : ' · feed pending'}
                  </span>
                )
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <select value={linkSupplier} onChange={(e) => setLinkSupplier(e.target.value)} className={inputCls}>
                <option value="">Link a supplier…</option>
                {CONNECTORS.filter((c) => c.supportsTradeAccounts && !linkedKeys.has(c.key)).map((c) => (
                  <option key={c.key} value={c.key}>{c.name}</option>
                ))}
              </select>
              <input value={linkAccountRef} onChange={(e) => setLinkAccountRef(e.target.value)} placeholder="Your account / customer number" className={`${inputCls} flex-1`} />
              <button
                type="button"
                disabled={!linkSupplier || !linkAccountRef.trim()}
                onClick={async () => {
                  if (!currentTenant || !user) return
                  await linkSupplierAccount(currentTenant.id, user.id, linkSupplier, linkAccountRef.trim())
                  setAccounts(await getSupplierAccounts(currentTenant.id))
                  setLinkSupplier(''); setLinkAccountRef('')
                  setSuccess('Account linked. Trade pricing activates when this supplier’s feed goes live.')
                }}
                className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-light disabled:opacity-50"
              >
                Link account
              </button>
            </div>
            {accounts.filter((a) => a.status !== 'disconnected').map((a) => (
              <div key={a.id} className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="text-slate-600">
                  {CONNECTORS.find((c) => c.key === a.supplier_key)?.name ?? a.supplier_key} · acct {a.account_reference} ·{' '}
                  <span className={a.status === 'connected' ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>{a.status}</span>
                </span>
                <button type="button" onClick={async () => { await unlinkSupplierAccount(a.id); if (currentTenant) setAccounts(await getSupplierAccounts(currentTenant.id)) }} className="font-semibold text-red-500 hover:text-red-600">
                  Unlink
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={handleSaveSettings} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            Save settings
          </button>
        </div>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search materials — e.g. double GPO, RCBO, 2.5mm TPS…"
        className={`${inputCls} w-full`}
      />

      {/* Catalogue */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading materials…</div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">
            No materials yet — hit “Refresh prices now” to import supplier catalogues.
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 text-right">Your price</th>
                <th className="px-4 py-3 hidden sm:table-cell">Source</th>
                <th className="px-4 py-3 text-right hidden lg:table-cell">Market low / high</th>
                <th className="px-4 py-3 text-right">7d</th>
                <th className="px-4 py-3 hidden sm:table-cell">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const r = resolved.get(p.id)
                return (
                  <tr key={p.id} onClick={() => openDetail(p)} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-md truncate">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{p.category}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900">{money(r?.price)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell max-w-48 truncate">{r?.sourceLabel ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500 hidden lg:table-cell">
                      {money(r?.stats.lowest)} / {money(r?.stats.highest)}
                    </td>
                    <td className="px-4 py-3 text-right"><TrendBadge pct={r?.stats.trendPct7d ?? null} /></td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        r?.confidence === 'high' ? 'bg-green-100 text-green-700' : r?.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r?.confidence ?? 'low'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setSelected(null)}>
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">{selected.name}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {selected.category}{selected.brand ? ` · ${selected.brand}` : ''}{selected.mpn ? ` · MPN ${selected.mpn}` : ''} · per {selected.unit}
                </p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>

            {/* Resolved price + provenance */}
            {(() => {
              const r = resolved.get(selected.id)
              if (!r) return null
              return (
                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400">Your price (ex GST)</p>
                      <p className="text-3xl font-bold text-slate-900">{money(r.price)}</p>
                    </div>
                    <TrendBadge pct={r.stats.trendPct7d} />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{r.sourceLabel}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {r.supplierName ? `${r.supplierName}${r.sku ? ` · SKU ${r.sku}` : ''} · ` : ''}
                    {r.lastUpdated ? `Updated ${new Date(r.lastUpdated).toLocaleString('en-AU')}` : 'No update timestamp'} · Confidence: {r.confidence}
                  </p>
                  <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-white border border-slate-200 py-2"><p className="text-slate-400">Low</p><p className="font-bold text-slate-800">{money(r.stats.lowest)}</p></div>
                    <div className="rounded-lg bg-white border border-slate-200 py-2"><p className="text-slate-400">Median</p><p className="font-bold text-slate-800">{money(r.stats.median)}</p></div>
                    <div className="rounded-lg bg-white border border-slate-200 py-2"><p className="text-slate-400">Average</p><p className="font-bold text-slate-800">{money(r.stats.average)}</p></div>
                    <div className="rounded-lg bg-white border border-slate-200 py-2"><p className="text-slate-400">High</p><p className="font-bold text-slate-800">{money(r.stats.highest)}</p></div>
                  </div>
                </div>
              )
            })()}

            {/* Trends */}
            {trends && (
              <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                {([['7 day', trends.pct7d], ['30 day', trends.pct30d], ['90 day', trends.pct90d], ['12 month', trends.pct365d]] as [string, number | null][]).map(([label, pct]) => (
                  <div key={label} className="rounded-lg border border-slate-200 py-2">
                    <p className="text-slate-400">{label}</p>
                    <TrendBadge pct={pct} />
                  </div>
                ))}
                <div className="col-span-4 flex justify-between text-xs text-slate-400 px-1">
                  <span>Historical low {money(trends.historicalLow)}</span>
                  <span>avg {money(trends.historicalAverage)}</span>
                  <span>high {money(trends.historicalHigh)}</span>
                </div>
              </div>
            )}

            {/* Supplier comparison */}
            <h3 className="mt-6 text-sm font-semibold text-slate-800">Supplier comparison ({offers.length})</h3>
            <div className="mt-2 space-y-1.5">
              {offers.map((o, i) => (
                <div key={o.id} className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${i === 0 ? 'border-green-300 bg-green-50' : 'border-slate-200'}`}>
                  <div>
                    <p className="font-medium text-slate-800">{o.supplier_name} {i === 0 && <span className="text-xs font-bold text-green-600 uppercase ml-1">Best</span>}</p>
                    <p className="text-xs text-slate-400">SKU {o.sku} · {o.availability.replace('_', ' ')} · {new Date(o.last_updated).toLocaleDateString('en-AU')}</p>
                  </div>
                  <p className="font-bold text-slate-900">{money(o.price)}</p>
                </div>
              ))}
              {offers.length === 0 && <p className="text-xs text-slate-400">No supplier offers yet.</p>}
            </div>

            {/* Price change history */}
            <h3 className="mt-6 text-sm font-semibold text-slate-800">Price history</h3>
            <div className="mt-2 space-y-1">
              {changes.length === 0 && <p className="text-xs text-slate-400">No recorded price changes yet.</p>}
              {changes.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs text-slate-600 border-b border-slate-100 py-1.5">
                  <span>{new Date(c.recorded_at).toLocaleDateString('en-AU')} · {c.supplier_key.replace('_', ' ')}</span>
                  <span>
                    {money(c.old_price)} → <span className="font-semibold">{money(c.new_price)}</span>{' '}
                    <span className={c.pct_change > 0 ? 'text-red-600' : 'text-green-600'}>
                      ({c.pct_change > 0 ? '+' : ''}{c.pct_change.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* Manual override */}
            <h3 className="mt-6 text-sm font-semibold text-slate-800">Manual override</h3>
            <p className="text-xs text-slate-400 mb-2">Overrides are never overwritten unless you enable auto-updates in settings.</p>
            <div className="flex gap-2">
              <input type="number" step="0.01" min="0" value={overridePrice} onChange={(e) => setOverridePrice(e.target.value)} placeholder="Override price ex GST" className={`${inputCls} flex-1`} />
              <button
                type="button"
                disabled={!overridePrice}
                onClick={async () => {
                  if (!currentTenant || !user) return
                  await setPriceOverride(currentTenant.id, selected.id, user.id, parseFloat(overridePrice))
                  const { prices } = await resolvePrices(currentTenant.id, [selected.id])
                  setResolved((prev) => new Map(prev).set(selected.id, prices[0]))
                  setOverridePrice('')
                  setSuccess('Override saved.')
                }}
                className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
              >
                Set
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!currentTenant) return
                  await clearPriceOverride(currentTenant.id, selected.id)
                  const { prices } = await resolvePrices(currentTenant.id, [selected.id])
                  setResolved((prev) => new Map(prev).set(selected.id, prices[0]))
                  setSuccess('Override cleared — back to automatic pricing.')
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
