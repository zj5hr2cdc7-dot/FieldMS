'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { getJobs } from '@/lib/jobs'
import { getBillingItemsForJob, saveBillingItems } from '@/lib/billing'
import { getPaymentsForJob, recordPayment, syncJobToAccounting } from '@/lib/payments'
import MaterialPicker, { type PickedMaterial } from '@/components/MaterialPicker'
import type { Job, JobPayment, PaymentKind } from '@/types/database'
import { useAuthContext } from '@/context/AuthContext'

const SETTINGS_KEY = 'fieldms-business-settings'

function getDefaultMargin(): number {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw).profitMargin ?? 20
  } catch { /* ignore */ }
  return 20
}

interface LabourLineItem {
  id: string
  description: string
  hours: number
  rate: number
}

interface MaterialLineItem {
  id: string
  description: string
  quantity: number
  unitCost: number
  masterProductId: string | null
  priceSource: string | null
}

const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20'

export default function DashboardBillingPage() {
  const { currentTenant, session } = useAuthContext()
  const searchParams = useSearchParams()
  const jobParam = searchParams.get('job')

  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>('')
  const [markupPercent, setMarkupPercent] = useState<number>(20)
  const [labourItems, setLabourItems] = useState<LabourLineItem[]>([])
  const [materialItems, setMaterialItems] = useState<MaterialLineItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [loadingItems, setLoadingItems] = useState(false)

  const [labourDesc, setLabourDesc] = useState('')
  const [labourHours, setLabourHours] = useState('1')
  const [labourRate, setLabourRate] = useState('85')

  const [payments, setPayments] = useState<JobPayment[]>([])
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentKind, setPaymentKind] = useState<PaymentKind>('deposit')
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer')
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  // Load jobs list
  useEffect(() => {
    if (!currentTenant) return
    getJobs(currentTenant.id).then((data) => {
      setJobs(data)
      const target = jobParam && data.find(j => j.id === jobParam) ? jobParam : data[0]?.id ?? ''
      setSelectedJobId(target)
    })
  }, [currentTenant, jobParam])

  // When job changes, load its saved billing items from DB
  const loadJobBilling = useCallback(async (jobId: string) => {
    if (!jobId) return
    setLoadingItems(true)
    try {
      const items = await getBillingItemsForJob(jobId)
      if (items.length > 0) {
        setMarkupPercent(items[0].markup_percent)
        setLabourItems(items.filter(i => i.kind !== 'material').map(i => ({
          id: i.id,
          description: i.description,
          hours: i.hours,
          rate: i.rate_per_hour,
        })))
        setMaterialItems(items.filter(i => i.kind === 'material').map(i => ({
          id: i.id,
          description: i.description,
          quantity: Number(i.quantity) || 1,
          unitCost: Number(i.unit_cost) || 0,
          masterProductId: i.master_product_id,
          priceSource: i.price_source,
        })))
      } else {
        setLabourItems([])
        setMaterialItems([])
        setMarkupPercent(getDefaultMargin())
      }
    } finally {
      setLoadingItems(false)
    }
  }, [])

  useEffect(() => {
    loadJobBilling(selectedJobId)
  }, [selectedJobId, loadJobBilling])

  // Load payments for the selected job
  useEffect(() => {
    if (!selectedJobId) { setPayments([]); return }
    getPaymentsForJob(selectedJobId).then(setPayments).catch(() => setPayments([]))
  }, [selectedJobId])

  const handleRecordPayment = async () => {
    if (!currentTenant || !session?.user || !selectedJobId) return
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return
    setRecordingPayment(true)
    try {
      const payment = await recordPayment({
        tenantId: currentTenant.id,
        jobId: selectedJobId,
        userId: session.user.id,
        kind: paymentKind,
        amount,
        method: paymentMethod,
      })
      setPayments(prev => [...prev, payment])
      setPaymentAmount('')
    } catch (err: unknown) {
      setSyncMsg(err instanceof Error ? err.message : 'Failed to record payment')
    } finally {
      setRecordingPayment(false)
    }
  }

  const handleSync = async () => {
    if (!selectedJobId) return
    setSyncing(true)
    setSyncMsg('')
    const result = await syncJobToAccounting(selectedJobId)
    if (result.ok) {
      setSyncMsg(
        result.invoice_unchanged
          ? `Already up to date — nothing re-pushed. ${result.payments_synced ?? 0} new payment(s) synced.`
          : `Invoice synced to Xero with ${result.payments_synced ?? 0} payment(s). Safe to re-run — duplicates are impossible.`
      )
    } else {
      setSyncMsg(result.error || 'Sync failed')
    }
    setSyncing(false)
  }

  const addLabourItem = () => {
    const hours = parseFloat(labourHours) || 0
    const rate = parseFloat(labourRate) || 0
    if (!labourDesc.trim() || hours <= 0 || rate <= 0) return
    setLabourItems(prev => [
      ...prev,
      { id: crypto.randomUUID(), description: labourDesc.trim(), hours, rate },
    ])
    setLabourDesc('')
    setLabourHours('1')
    setLabourRate('85')
  }

  const removeLabourItem = (id: string) => setLabourItems(prev => prev.filter(l => l.id !== id))

  const lineItems = useMemo(() =>
    labourItems.map(l => ({
      ...l,
      markedUpRate: l.rate * (1 + markupPercent / 100),
      total: l.hours * l.rate * (1 + markupPercent / 100),
    })),
    [labourItems, markupPercent],
  )

  const materialLines = useMemo(() =>
    materialItems.map(m => ({
      ...m,
      total: m.quantity * m.unitCost * (1 + markupPercent / 100),
    })),
    [materialItems, markupPercent],
  )

  const labourTotal = lineItems.reduce((sum, l) => sum + l.total, 0)
  const materialsTotal = materialLines.reduce((sum, m) => sum + m.total, 0)
  const grandTotal = labourTotal + materialsTotal
  const totalCost = labourItems.reduce((sum, l) => sum + l.hours * l.rate, 0)
    + materialItems.reduce((sum, m) => sum + m.quantity * m.unitCost, 0)
  const totalProfit = grandTotal - totalCost

  const addMaterialFromPicker = (material: PickedMaterial) => {
    setMaterialItems(prev => {
      const existing = prev.find(m => m.masterProductId === material.masterProductId)
      if (existing) {
        return prev.map(m => (m.id === existing.id ? { ...m, quantity: m.quantity + 1 } : m))
      }
      return [...prev, {
        id: crypto.randomUUID(),
        description: material.name,
        quantity: 1,
        unitCost: material.unitPrice,
        masterProductId: material.masterProductId,
        priceSource: material.sourceLabel,
      }]
    })
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId)

  const handleSave = async () => {
    if (!currentTenant || !session?.user || !selectedJobId) return
    setSaving(true)
    setSaveMsg('')
    try {
      await saveBillingItems({
        jobId: selectedJobId,
        tenantId: currentTenant.id,
        userId: session.user.id,
        markupPercent,
        items: labourItems.map(l => ({ description: l.description, hours: l.hours, ratePerHour: l.rate })),
        materials: materialItems.map(m => ({
          description: m.description,
          quantity: m.quantity,
          unitCost: m.unitCost,
          masterProductId: m.masterProductId,
          priceSource: m.priceSource,
        })),
      })
      setSaveMsg('Quote saved.')
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
      window.setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Job billing</h1>
            <p className="mt-1 text-sm text-slate-500">Build and save a labour quote. Saved quotes feed the dashboard PnL.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Job</p>
              <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} className={inputCls}>
                {jobs.length === 0
                  ? <option value="">No jobs available</option>
                  : jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)
                }
              </select>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Markup %</p>
              <div className="flex items-center gap-2">
                <input
                  type="number" min={0} max={500} value={markupPercent}
                  onChange={e => setMarkupPercent(Number(e.target.value))}
                  className={`w-20 ${inputCls}`}
                />
                <span className="text-sm text-slate-500">%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loadingItems && (
        <div className="text-sm text-slate-400 px-1">Loading saved quote…</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">

        {/* Add labour form */}
        <section className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Add labour item</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-[1fr_120px_120px]">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Description</label>
                <input
                  type="text" value={labourDesc} onChange={e => setLabourDesc(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addLabourItem() }}
                  placeholder="e.g. Panel installation, Site inspection"
                  className={`w-full ${inputCls} placeholder:text-slate-400`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Hours</label>
                <input type="number" min="0.25" step="0.25" value={labourHours}
                  onChange={e => setLabourHours(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Cost rate ($/hr)</label>
                <input type="number" min="0" step="5" value={labourRate}
                  onChange={e => setLabourRate(e.target.value)} className={`w-full ${inputCls}`} />
              </div>
            </div>
            <button type="button" onClick={addLabourItem}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
              Add
            </button>
          </div>

          {/* Labour table */}
          {lineItems.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hrs</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost rate</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Bill rate</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-medium text-slate-900">{item.description}</td>
                      <td className="px-5 py-3.5 text-slate-600">{item.hours}h</td>
                      <td className="px-5 py-3.5 text-slate-400">A${item.rate.toFixed(2)}</td>
                      <td className="px-5 py-3.5 text-slate-600">A${item.markedUpRate.toFixed(2)}/hr</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">A${item.total.toFixed(2)}</td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => removeLabourItem(item.id)} className="text-xs font-semibold text-red-500 hover:text-red-600">Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Materials on the job sheet (live pricing) */}
          <div className="mt-6 space-y-4">
            {materialLines.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Materials ({materialLines.length})</h3>
                  <span className="text-xs text-slate-400">Marked up {markupPercent}% · sell prices shown</span>
                </div>
                <table className="min-w-full text-left text-sm">
                  <tbody>
                    {materialLines.map(m => (
                      <tr key={m.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{m.description}</p>
                          {m.priceSource && <p className="text-xs text-slate-400">{m.priceSource}</p>}
                        </td>
                        <td className="px-3 py-3 w-24">
                          <input
                            type="number" min="0.001" step="any" value={m.quantity}
                            onChange={e => setMaterialItems(prev => prev.map(x => x.id === m.id ? { ...x, quantity: Number(e.target.value) || 0 } : x))}
                            className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-brand"
                          />
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">× A${m.unitCost.toFixed(2)}</td>
                        <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">A${m.total.toFixed(2)}</td>
                        <td className="px-3 py-3">
                          <button onClick={() => setMaterialItems(prev => prev.filter(x => x.id !== m.id))} className="text-xs font-semibold text-red-500 hover:text-red-600">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {currentTenant && selectedJobId && (
              <MaterialPicker
                tenantId={currentTenant.id}
                onAdd={addMaterialFromPicker}
                title="Add materials to job sheet"
                subtitle="Live pricing — your trade price, market median, or override. Markup applies automatically."
              />
            )}
          </div>
        </section>

        {/* Summary sidebar */}
        <aside className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4 h-fit sticky top-20">
          <h2 className="text-base font-semibold text-slate-900">Quote summary</h2>
          <div className="text-sm text-slate-500 font-medium truncate">{selectedJob?.title ?? 'No job selected'}</div>

          {lineItems.length === 0 && materialLines.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">
              Add labour or materials to build the quote.
            </div>
          ) : (
            <div className="space-y-2">
              {lineItems.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{item.description}</p>
                    <p className="text-xs text-slate-400">{item.hours}h × A${item.markedUpRate.toFixed(2)}</p>
                  </div>
                  <span className="shrink-0 font-semibold text-slate-900">A${item.total.toFixed(2)}</span>
                </div>
              ))}
              {materialLines.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg bg-green-50/50 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900 truncate">{m.description}</p>
                    <p className="text-xs text-slate-400">{m.quantity} × A${(m.unitCost * (1 + markupPercent / 100)).toFixed(2)} <span className="text-brand-dark">· material</span></p>
                  </div>
                  <span className="shrink-0 font-semibold text-slate-900">A${m.total.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          {(lineItems.length > 0 || materialLines.length > 0) && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Labour</span><span>A${labourTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Materials</span><span>A${materialsTotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>Total cost</span><span>A${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-brand-dark font-semibold px-1">
                <span>Profit ({markupPercent}% markup)</span><span>A${totalProfit.toFixed(2)}</span>
              </div>
              <div className="rounded-lg bg-ink px-4 py-3 flex items-center justify-between text-sm font-semibold text-white">
                <span>Total revenue</span>
                <span>A${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || (labourItems.length === 0 && materialItems.length === 0) || !selectedJobId}
            className="w-full rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save quote to job'}
          </button>
          {saveMsg && (
            <p className={`text-sm ${saveMsg.includes('failed') || saveMsg.includes('Failed') ? 'text-red-500' : 'text-brand-dark'}`}>
              {saveMsg}
            </p>
          )}
          <p className="text-xs text-slate-400">Saved quotes appear in the dashboard PnL once the job is completed.</p>

          {/* Payments & accounting sync */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Payments</h3>
            {payments.length > 0 && (
              <div className="space-y-1.5">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                    <span className="capitalize text-slate-600">{p.kind} · {p.method?.replace('_', ' ')}</span>
                    <span className="font-semibold text-slate-900">A${p.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-3 text-xs text-slate-500">
                  <span>Balance owing</span>
                  <span className="font-semibold">
                    A${Math.max(0, grandTotal - payments.reduce((s, p) => s + (p.kind === 'refund' ? -p.amount : p.amount), 0)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <select value={paymentKind} onChange={e => setPaymentKind(e.target.value as PaymentKind)} className={`${inputCls} w-28`}>
                <option value="deposit">Deposit</option>
                <option value="payment">Payment</option>
                <option value="refund">Refund</option>
              </select>
              <input
                type="number" min="0" step="0.01" placeholder="Amount"
                value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                className={`${inputCls} flex-1 min-w-0`}
              />
            </div>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={`${inputCls} w-full`}>
              <option value="bank_transfer">Bank transfer</option>
              <option value="card">Card</option>
              <option value="cash">Cash</option>
            </select>
            <button
              type="button"
              onClick={handleRecordPayment}
              disabled={recordingPayment || !paymentAmount || !selectedJobId}
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {recordingPayment ? 'Recording…' : 'Record payment'}
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || !selectedJobId || (labourItems.length === 0 && materialItems.length === 0)}
              className="w-full rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-light transition-colors disabled:opacity-50"
            >
              {syncing ? 'Syncing…' : 'Sync invoice + payments to Xero'}
            </button>
            {syncMsg && <p className="text-xs text-slate-500">{syncMsg}</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}
