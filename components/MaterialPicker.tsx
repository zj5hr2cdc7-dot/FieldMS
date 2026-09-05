'use client'

/**
 * Live-priced material picker — reused by quotes (estimates) and job sheets
 * (billing). Searches the master catalog and resolves each product's price
 * for the current tenant (trade account / market / override) so whatever
 * gets added always reflects current pricing, with provenance attached.
 */

import { useCallback, useEffect, useState } from 'react'
import { searchProducts, resolvePrices } from '@/lib/pricing/client'
import type { MasterProduct, ResolvedPrice } from '@/types/pricing'

export interface PickedMaterial {
  masterProductId: string
  name: string
  unitPrice: number
  sourceLabel: string
}

export default function MaterialPicker({
  tenantId,
  onAdd,
  title = 'Add materials (live pricing)',
  subtitle = 'Prices reflect your pricing settings — trade accounts, market median, or overrides.',
}: {
  tenantId: string
  onAdd: (material: PickedMaterial) => void
  title?: string
  subtitle?: string
}) {
  const [search, setSearch] = useState('')
  const [products, setProducts] = useState<MasterProduct[]>([])
  const [resolved, setResolved] = useState<Map<string, ResolvedPrice>>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (query: string) => {
    setLoading(true)
    setError(null)
    try {
      const rows = await searchProducts(query, 25)
      setProducts(rows)
      if (rows.length) {
        const { prices } = await resolvePrices(tenantId, rows.map((r) => r.id))
        setResolved(new Map(prices.map((p) => [p.masterProductId, p])))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load materials.')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    const t = window.setTimeout(() => load(search), 350)
    return () => window.clearTimeout(t)
  }, [search, load])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search materials — GPO, RCBO, cable…"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 min-w-[240px]"
        />
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Material</th>
              <th className="px-4 py-2.5 text-right">Price (ex GST)</th>
              <th className="px-4 py-2.5 hidden md:table-cell">Source</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">Confidence</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Loading live prices…</td></tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  No materials found — refresh prices under Materials, or refine your search.
                </td>
              </tr>
            ) : (
              products.map((p) => {
                const r = resolved.get(p.id)
                const price = r?.price ?? null
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-900 max-w-sm truncate">{p.name}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      {price === null ? '—' : `A$${price.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 hidden md:table-cell max-w-48 truncate">
                      {r?.sourceLabel ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                        r?.confidence === 'high' ? 'bg-green-100 text-green-700' : r?.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {r?.confidence ?? 'low'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        disabled={price === null}
                        onClick={() =>
                          onAdd({
                            masterProductId: p.id,
                            name: p.name,
                            unitPrice: price ?? 0,
                            sourceLabel: r?.sourceLabel ?? 'Unknown source',
                          })
                        }
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-40"
                      >
                        Add
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
