'use client'

/* ============================================================
   Job packages — reusable labour + material bundles.

   Lives under Materials & pricing because that is where the rest of "what do
   we charge" lives. Owners and managers edit; everyone else is read-only
   (and the database says the same thing, via is_office in migration 028).

   Ships empty on purpose. There are no built-in packages, because every
   business prices its own work — the first one you create is yours.
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { capabilities } from '@/lib/roles'
import { searchProducts } from '@/lib/pricing/client'
import {
  listPackagesWithItems,
  createPackage,
  updatePackage,
  setPackageActive,
  deletePackage,
  validateLine,
  type PackageLineInput,
} from '@/lib/packages'
import type { JobPackageWithItems } from '@/types/database'
import type { MasterProduct } from '@/types/pricing'

const money = (v: number | null | undefined) =>
  v === null || v === undefined ? '—' : `$${Number(v).toFixed(2)}`

interface DraftLine extends PackageLineInput {
  /** Resolved product name, so the row reads properly before saving. */
  productName?: string | null
}

const emptyLabour = (): DraftLine => ({ kind: 'labour', description: '', hours: 1, ratePerHour: null })
const emptyMaterial = (): DraftLine => ({
  kind: 'material',
  description: '',
  quantity: 1,
  masterProductId: null,
  unitCostOverride: null,
})

export default function PackagesPage() {
  const { session, currentTenant, userRole } = useAuthContext()
  const canEdit = capabilities(userRole).seeSalePricing && capabilities(userRole).editAnyJob

  const [packages, setPackages] = useState<JobPackageWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRetired, setShowRetired] = useState(false)

  // Editor state. editingId === 'new' means the create form.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [lines, setLines] = useState<DraftLine[]>([])
  const [saving, setSaving] = useState(false)

  // Product picker
  const [productQuery, setProductQuery] = useState('')
  const [products, setProducts] = useState<MasterProduct[]>([])
  const [pickerFor, setPickerFor] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!currentTenant) return
    setLoading(true)
    try {
      setPackages(await listPackagesWithItems(currentTenant.id, { includeRetired: showRetired }))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load packages')
    } finally {
      setLoading(false)
    }
  }, [currentTenant, showRetired])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (pickerFor === null) return
    let cancelled = false
    searchProducts(productQuery, 25)
      .then((r) => !cancelled && setProducts(r))
      .catch(() => !cancelled && setProducts([]))
    return () => {
      cancelled = true
    }
  }, [productQuery, pickerFor])

  function startNew() {
    setEditingId('new')
    setName('')
    setDescription('')
    setLines([emptyLabour()])
  }

  function startEdit(pkg: JobPackageWithItems) {
    setEditingId(pkg.id)
    setName(pkg.name)
    setDescription(pkg.description ?? '')
    setLines(
      pkg.items.map((i) => ({
        kind: i.kind,
        description: i.description,
        hours: i.hours,
        ratePerHour: i.rate_per_hour,
        masterProductId: i.master_product_id,
        quantity: i.quantity,
        unitCostOverride: i.unit_cost_override,
      }))
    )
  }

  function cancel() {
    setEditingId(null)
    setLines([])
    setPickerFor(null)
    setError(null)
  }

  function patchLine(index: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  const firstProblem = useMemo(() => {
    if (!name.trim()) return 'Give the package a name.'
    if (!lines.length) return 'Add at least one line.'
    for (const line of lines) {
      const problem = validateLine(line)
      if (problem) return problem
    }
    return null
  }, [name, lines])

  async function save() {
    if (!currentTenant || !session?.user || firstProblem) return
    setSaving(true)
    setError(null)
    try {
      const payload = {
        tenantId: currentTenant.id,
        userId: session.user.id,
        name,
        description,
        lines: lines.map(({ productName: _productName, ...rest }) => rest),
      }
      if (editingId === 'new') await createPackage(payload)
      else if (editingId) await updatePackage(editingId, payload)
      cancel()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save this package')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/materials" className="text-sm font-semibold text-brand-dark hover:underline">
            ← Materials &amp; pricing
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Job packages</h1>
          <p className="mt-1 max-w-2xl text-slate-500">
            Bundle the labour and materials for work you do all the time, then add the whole lot to a
            job in one go instead of typing it out again.
          </p>
        </div>
        {canEdit && !editingId && (
          <button
            type="button"
            onClick={startNew}
            className="shrink-0 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            + New package
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {!canEdit && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          You can see packages but not change them. Packages set what customers are charged, so only
          the owner and managers can edit them.
        </div>
      )}

      {/* ── Editor ── */}
      {editingId && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-slate-900">
            {editingId === 'new' ? 'New package' : 'Edit package'}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">Name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="What is this job called?"
                className={`${inputCls} w-full`}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Description <span className="font-normal text-slate-400">(optional)</span>
              </span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything the crew should know"
                className={`${inputCls} w-full`}
              />
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">Lines</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setLines((p) => [...p, emptyLabour()])}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  + Labour
                </button>
                <button
                  type="button"
                  onClick={() => setLines((p) => [...p, emptyMaterial()])}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  + Material
                </button>
              </div>
            </div>

            {lines.map((line, i) => (
              <div key={i} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      line.kind === 'labour'
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-violet-100 text-violet-700'
                    }`}
                  >
                    {line.kind === 'labour' ? 'Labour' : 'Material'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLines((p) => p.filter((_, j) => j !== i))}
                    className="text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="sm:col-span-3">
                    <span className="mb-1 block text-xs font-semibold text-slate-600">Description</span>
                    <input
                      value={line.description}
                      onChange={(e) => patchLine(i, { description: e.target.value })}
                      className={`${inputCls} w-full`}
                    />
                  </label>

                  {line.kind === 'labour' ? (
                    <>
                      <label>
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Hours</span>
                        <input
                          type="number"
                          min={0.25}
                          step={0.25}
                          value={line.hours ?? ''}
                          onChange={(e) => patchLine(i, { hours: Number(e.target.value) })}
                          className={`${inputCls} w-full`}
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">
                          Rate per hour{' '}
                          <span className="font-normal text-slate-400">
                            — leave blank to use the job&apos;s rate
                          </span>
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={line.ratePerHour ?? ''}
                          placeholder="Job default"
                          onChange={(e) =>
                            patchLine(i, {
                              ratePerHour: e.target.value === '' ? null : Number(e.target.value),
                            })
                          }
                          className={`${inputCls} w-full`}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Quantity</span>
                        <input
                          type="number"
                          min={0.01}
                          step={0.5}
                          value={line.quantity ?? ''}
                          onChange={(e) => patchLine(i, { quantity: Number(e.target.value) })}
                          className={`${inputCls} w-full`}
                        />
                      </label>
                      <div className="sm:col-span-2">
                        <span className="mb-1 block text-xs font-semibold text-slate-600">Price</span>
                        {line.masterProductId ? (
                          <div className="flex items-center gap-2">
                            <span className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                              {line.productName ?? 'Catalogue product'}{' '}
                              <span className="text-xs text-slate-400">— live price</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => patchLine(i, { masterProductId: null, productName: null })}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                            >
                              Clear
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={line.unitCostOverride ?? ''}
                              placeholder="Fixed unit cost"
                              onChange={(e) =>
                                patchLine(i, {
                                  unitCostOverride:
                                    e.target.value === '' ? null : Number(e.target.value),
                                })
                              }
                              className={`${inputCls} flex-1`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setPickerFor(i)
                                setProductQuery('')
                              }}
                              className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              Pick product
                            </button>
                          </div>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          A catalogue product is priced from your current price list each time the
                          package is used. A fixed cost stays put until you change it.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Product picker for this line */}
                {pickerFor === i && (
                  <div className="mt-3 rounded-lg border border-slate-300 bg-white p-3">
                    <input
                      autoFocus
                      value={productQuery}
                      onChange={(e) => setProductQuery(e.target.value)}
                      placeholder="Search your materials…"
                      className={`${inputCls} mb-2 w-full`}
                    />
                    <div className="max-h-48 overflow-y-auto">
                      {products.length === 0 && (
                        <p className="px-2 py-3 text-sm text-slate-400">No matching materials.</p>
                      )}
                      {products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            patchLine(i, {
                              masterProductId: p.id,
                              productName: p.name,
                              unitCostOverride: null,
                              description: line.description || p.name,
                            })
                            setPickerFor(null)
                          }}
                          className="block w-full rounded px-2 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-800">{p.name}</span>
                          {p.category && <span className="ml-2 text-xs text-slate-400">{p.category}</span>}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerFor(null)}
                      className="mt-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {firstProblem && <p className="text-sm text-amber-700">{firstProblem}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={saving || !!firstProblem}
              className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save package'}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <p className="text-slate-400">Loading…</p>
      ) : packages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-slate-700">No packages yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            Think of the jobs you quote over and over. Build one as a package — the labour, the cable,
            the parts — and it is one click on every job after that.
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={startNew}
              className="mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              Create your first package
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {packages.map((pkg) => {
            const labourHours = pkg.items
              .filter((i) => i.kind === 'labour')
              .reduce((n, i) => n + Number(i.hours ?? 0), 0)
            const materials = pkg.items.filter((i) => i.kind === 'material').length
            return (
              <div
                key={pkg.id}
                className={`rounded-xl border bg-white p-5 shadow-sm ${
                  pkg.active ? 'border-slate-200' : 'border-slate-200 opacity-60'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-bold text-slate-900">{pkg.name}</h3>
                      {!pkg.active && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-600">
                          Retired
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="mt-1 text-sm text-slate-500">{pkg.description}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      {labourHours > 0 && `${labourHours} hr${labourHours === 1 ? '' : 's'} labour`}
                      {labourHours > 0 && materials > 0 && ' · '}
                      {materials > 0 && `${materials} material line${materials === 1 ? '' : 's'}`}
                      {pkg.items.length === 0 && 'No lines yet'}
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(pkg)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await setPackageActive(pkg.id, !pkg.active)
                          await load()
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {pkg.active ? 'Retire' : 'Restore'}
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Delete "${pkg.name}" permanently? Jobs already billed from it keep their lines.`)) return
                          await deletePackage(pkg.id)
                          await load()
                        }}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                {pkg.items.length > 0 && (
                  <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
                    {pkg.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="truncate text-slate-700">{item.description}</span>
                        <span className="shrink-0 text-xs text-slate-500">
                          {item.kind === 'labour'
                            ? `${item.hours} hr${Number(item.hours) === 1 ? '' : 's'}${
                                item.rate_per_hour !== null ? ` @ ${money(item.rate_per_hour)}/hr` : ' @ job rate'
                              }`
                            : `${item.quantity} × ${
                                item.unit_cost_override !== null
                                  ? money(item.unit_cost_override)
                                  : 'live price'
                              }`}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-500">
        <input
          type="checkbox"
          checked={showRetired}
          onChange={(e) => setShowRetired(e.target.checked)}
          className="rounded border-slate-300"
        />
        Show retired packages
      </label>
    </div>
  )
}
