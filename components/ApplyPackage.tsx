'use client'

/**
 * "Apply package" — adds a saved bundle of labour and materials to a job.
 *
 * Always previews before writing. The preview is not computed here: it comes
 * back from /api/packages/apply with dryRun, so what you see on screen is
 * produced by exactly the same code path that will write the lines. A preview
 * calculated in the browser and a write calculated on the server is how the
 * two quietly drift apart.
 *
 * Shown only to owners and managers. The API route checks the same thing, so
 * hiding the button is presentation rather than protection.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listPackages, previewPackage, applyPackageToJob, type PackagePreview } from '@/lib/packages'
import type { JobPackage } from '@/types/database'

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `$${Number(v).toFixed(2)}`

export default function ApplyPackage({
  tenantId,
  jobId,
  defaultMarkupPercent = 0,
  defaultRatePerHour = 0,
  onApplied,
}: {
  tenantId: string
  jobId: string
  defaultMarkupPercent?: number
  defaultRatePerHour?: number
  onApplied: (summary: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [packages, setPackages] = useState<JobPackage[]>([])
  const [selected, setSelected] = useState<string>('')
  const [markup, setMarkup] = useState(String(defaultMarkupPercent))
  const [rate, setRate] = useState(String(defaultRatePerHour))
  const [preview, setPreview] = useState<PackagePreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    listPackages(tenantId)
      .then(setPackages)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load packages'))
  }, [open, tenantId])

  // Re-price whenever the inputs change, so the figures on screen always match
  // what pressing Add would write.
  useEffect(() => {
    if (!selected) {
      setPreview(null)
      return
    }
    let cancelled = false
    setBusy(true)
    setError(null)
    previewPackage({
      tenantId,
      packageId: selected,
      markupPercent: Number(markup) || 0,
      defaultRatePerHour: Number(rate) || 0,
    })
      .then((p) => !cancelled && setPreview(p))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not price this package'))
      .finally(() => !cancelled && setBusy(false))
    return () => {
      cancelled = true
    }
  }, [selected, markup, rate, tenantId])

  async function apply() {
    if (!selected || !preview) return
    setBusy(true)
    setError(null)
    try {
      const result = await applyPackageToJob({
        tenantId,
        jobId,
        packageId: selected,
        markupPercent: Number(markup) || 0,
        defaultRatePerHour: Number(rate) || 0,
      })
      setOpen(false)
      setSelected('')
      setPreview(null)
      onApplied(`Added ${result.lines.length} line${result.lines.length === 1 ? '' : 's'} from ${result.packageName}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply this package')
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Apply package
      </button>
    )
  }

  return (
    <div className="w-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">Apply a package</h3>
        <button
          type="button"
          onClick={() => { setOpen(false); setSelected(''); setPreview(null); setError(null) }}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          Close
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {packages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
          <p className="text-sm font-semibold text-slate-700">No packages yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
            Build one for the jobs you quote over and over, and it is a single click from here after
            that.
          </p>
          <Link
            href="/dashboard/materials/packages"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Create a package
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="sm:col-span-3">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Package</span>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className={`${inputCls} w-full`}
              >
                <option value="">Choose a package…</option>
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Labour rate /hr</span>
              <input
                type="number" min={0} step={1} value={rate}
                onChange={(e) => setRate(e.target.value)}
                className={`${inputCls} w-full`}
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Markup %</span>
              <input
                type="number" min={0} step={1} value={markup}
                onChange={(e) => setMarkup(e.target.value)}
                className={`${inputCls} w-full`}
              />
            </label>
          </div>

          {busy && <p className="mt-4 text-sm text-slate-400">Pricing…</p>}

          {preview && !busy && (
            <div className="mt-4">
              {preview.warnings.length > 0 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Check these</p>
                  <ul className="mt-1 space-y-0.5 text-sm text-amber-900">
                    {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2">Line</th>
                    <th className="py-2 hidden sm:table-cell">Price from</th>
                    <th className="py-2 text-right">Charge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.lines.map((line, i) => (
                    <tr key={i}>
                      <td className="py-2">
                        <span className="text-slate-800">{line.description}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          {line.kind === 'labour'
                            ? `${line.hours} hr × ${money(line.ratePerHour)}`
                            : `${line.quantity} × ${money(line.unitCost)}`}
                        </span>
                      </td>
                      <td className="py-2 hidden sm:table-cell text-xs text-slate-500">{line.priceSource ?? '—'}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">{money(line.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td className="py-2 font-bold text-slate-900" colSpan={2}>Total ex GST</td>
                    <td className="py-2 text-right font-black text-slate-900">{money(preview.totalRevenue)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={apply}
                  disabled={busy || preview.lines.length === 0}
                  className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  Add {preview.lines.length} line{preview.lines.length === 1 ? '' : 's'} to this job
                </button>
                <button
                  type="button"
                  onClick={() => { setSelected(''); setPreview(null) }}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                These lines are added to whatever is already on the job — nothing is replaced.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
