'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { billingCapabilities, type BillingCapabilities } from '@/lib/permissions'
import { getJob } from '@/lib/jobs'
import { recordPayment } from '@/lib/payments'
import { syncJobToAccounting } from '@/lib/payments'
import {
  loadJobBilling,
  createVariation,
  updateVariationStatus,
  createInvoice,
  updateInvoiceStatus,
  applyInvoicePayment,
  invoiceShareUrl,
  variationShareUrl,
  updateJobBillingSettings,
  getBillingTimeline,
  logBilling,
} from '@/lib/job-billing'
import type { Job, JobPayment, PaymentKind } from '@/types/database'
import type {
  BillingAuditEvent,
  InvoiceKind,
  JobFinancials,
  JobInvoice,
  JobVariation,
  VariationStatus,
} from '@/types/billing'

type Tab = 'dashboard' | 'variations' | 'invoices' | 'payments' | 'timeline'
const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `A$${n.toFixed(2)}`)

const VARIATION_COLORS: Record<VariationStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-green-100 text-green-800',
}
const INVOICE_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-sky-100 text-sky-700',
  viewed: 'bg-sky-100 text-sky-700',
  part_paid: 'bg-amber-100 text-amber-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  void: 'bg-slate-100 text-slate-400',
}

export default function JobBillingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params)
  const router = useRouter()
  const { currentTenant, session, userRole } = useAuthContext()
  const user = session?.user ?? null
  const actorName = session?.profile?.full_name ?? session?.user?.email ?? null
  const caps = billingCapabilities(userRole)

  const [tab, setTab] = useState<Tab>('dashboard')
  const [job, setJob] = useState<Job | null>(null)
  const [financials, setFinancials] = useState<JobFinancials | null>(null)
  const [variations, setVariations] = useState<JobVariation[]>([])
  const [invoices, setInvoices] = useState<JobInvoice[]>([])
  const [payments, setPayments] = useState<JobPayment[]>([])
  const [timeline, setTimeline] = useState<BillingAuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const j = await getJob(jobId)
    if (!j) { setError('Job not found'); setLoading(false); return }
    setJob(j)
    const b = await loadJobBilling(jobId, j)
    setFinancials(b.financials)
    setVariations(b.variations)
    setInvoices(b.invoices)
    setPayments(b.payments)
    setTimeline(await getBillingTimeline(jobId))
    setLoading(false)
  }, [jobId])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        await refresh()
      } catch (e) {
        if (active) { setError(e instanceof Error ? e.message : 'Failed to load'); setLoading(false) }
      }
    })()
    return () => { active = false }
  }, [refresh])

  const flash = (msg: string) => { setSuccess(msg); window.setTimeout(() => setSuccess(null), 3500) }

  if (loading) return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400">Loading billing…</div>
  if (!job || !financials) return <div className="max-w-6xl mx-auto px-4 py-16 text-center text-slate-400">{error ?? 'Job not found'}</div>

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button type="button" onClick={() => router.push('/dashboard/jobs')} className="text-sm font-medium text-brand-dark hover:text-brand">← Jobs</button>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{job.title}</h1>
          <p className="text-sm text-slate-500">
            {job.customer_name}{job.customer_address ? ` · ${job.customer_address}` : ''}
            {job.po_number ? ` · PO ${job.po_number}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/dashboard/billing?job=${job.id}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Quote / materials</Link>
          <Link href={`/dashboard/forms?job=${job.id}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Forms</Link>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {([
          ['dashboard', 'Dashboard'],
          ['variations', `Variations (${variations.length})`],
          ['invoices', `Invoices (${invoices.length})`],
          ['payments', `Payments (${payments.length})`],
          ['timeline', 'Timeline'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === key ? 'border-brand text-brand-dark' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab job={job} f={financials} caps={caps} onSaved={refresh} flash={flash} />}
      {tab === 'variations' && (
        <VariationsTab
          variations={variations} caps={caps} tenantId={currentTenant?.id ?? ''} jobId={jobId} userId={user?.id ?? ''} actorName={actorName}
          markup={job.gst_rate} onChange={async () => { await refresh(); flash('Variations updated.') }} setError={setError}
        />
      )}
      {tab === 'invoices' && (
        <InvoicesTab
          invoices={invoices} financials={financials} caps={caps} tenantId={currentTenant?.id ?? ''} jobId={jobId} userId={user?.id ?? ''} actorName={actorName}
          gstRate={financials.gstRate}
          onChange={async () => { await refresh(); flash('Invoice updated.') }} setError={setError}
        />
      )}
      {tab === 'payments' && (
        <PaymentsTab
          payments={payments} invoices={invoices} financials={financials} caps={caps} tenantId={currentTenant?.id ?? ''} jobId={jobId} userId={user?.id ?? ''} actorName={actorName}
          onChange={async () => { await refresh(); flash('Payment recorded.') }} setError={setError}
        />
      )}
      {tab === 'timeline' && <TimelineTab events={timeline} />}
    </div>
  )
}

// ── Dashboard ───────────────────────────────────────────────────────────────

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ?? 'text-slate-900'}`}>{value}</p>
    </div>
  )
}

function DashboardTab({ job, f, caps, onSaved, flash }: { job: Job; f: JobFinancials; caps: BillingCapabilities; onSaved: () => Promise<void>; flash: (m: string) => void }) {
  const [quoteTotal, setQuoteTotal] = useState(String(job.quote_total || ''))
  const [gstRate, setGstRate] = useState(String(job.gst_rate ?? 10))
  const [po, setPo] = useState(job.po_number ?? '')
  const [saving, setSaving] = useState(false)

  return (
    <div className="space-y-5">
      {f.overdue && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          ⚠ Payment overdue — {money(f.outstandingBalance)} outstanding (due {f.nextDueDate ? new Date(f.nextDueDate).toLocaleDateString('en-AU') : ''}).
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Stat label="Job value (inc GST)" value={money(f.jobValueIncGst)} accent="text-ink" />
        <Stat label="Quoted (ex GST)" value={money(f.quotedValueExGst)} />
        <Stat label="Approved variations" value={money(f.approvedVariationsExGst)} accent="text-brand-dark" />
        <Stat label="Pending variations" value={money(f.pendingVariationsExGst)} accent="text-amber-600" />
        <Stat label="GST" value={money(f.gstAmount)} />
        <Stat label="Total paid" value={money(f.totalPaid)} accent="text-brand-dark" />
        <Stat label="Outstanding" value={money(f.outstandingBalance)} accent={f.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-900'} />
        <Stat label="Deposit received" value={money(f.depositReceived)} />
        {caps.viewCosts && <Stat label="Material cost" value={money(f.materialCost)} />}
        {caps.viewCosts && <Stat label="Labour cost" value={money(f.labourCost)} />}
        {caps.viewCosts && <Stat label="Gross margin" value={`${money(f.grossMargin)}${f.grossMarginPct !== null ? ` · ${f.grossMarginPct}%` : ''}`} accent={f.grossMargin >= 0 ? 'text-brand-dark' : 'text-red-600'} />}
        <Stat label="Credit balance" value={money(f.customerCreditBalance)} />
      </div>

      {!caps.viewCosts && (
        <p className="text-xs text-slate-400">Cost and margin figures are hidden for your role. Contact your office administrator for full financials.</p>
      )}

      {/* Job billing settings — office/admin only */}
      {caps.editPrices && (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Job billing settings</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Quoted value (ex GST)</label>
            <input type="number" step="0.01" value={quoteTotal} onChange={(e) => setQuoteTotal(e.target.value)} placeholder="Auto from line items if blank"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">GST rate (%)</label>
            <input type="number" step="0.1" value={gstRate} onChange={(e) => setGstRate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Purchase order number</label>
            <input value={po} onChange={(e) => setPo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand" />
          </div>
        </div>
        <button type="button" disabled={saving}
          onClick={async () => {
            setSaving(true)
            try {
              await updateJobBillingSettings(job.id, {
                quote_total: parseFloat(quoteTotal) || 0,
                gst_rate: parseFloat(gstRate) || 10,
                po_number: po || undefined,
              })
              await onSaved()
              flash('Billing settings saved.')
            } finally { setSaving(false) }
          }}
          className="mt-4 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
      )}
    </div>
  )
}

// ── Variations ──────────────────────────────────────────────────────────────

function VariationsTab({ variations, caps, tenantId, jobId, userId, actorName, onChange, setError }: {
  variations: JobVariation[]; caps: BillingCapabilities; tenantId: string; jobId: string; userId: string; actorName: string | null
  markup: number; onChange: () => Promise<void>; setError: (m: string) => void
}) {
  const [show, setShow] = useState(false)
  const [desc, setDesc] = useState('')
  const [reason, setReason] = useState('')
  const [materialCost, setMaterialCost] = useState('')
  const [labourCost, setLabourCost] = useState('')
  const [markupPct, setMarkupPct] = useState('20')
  const [busy, setBusy] = useState(false)

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShow((v) => !v)} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          {show ? 'Cancel' : '+ New variation'}
        </button>
      </div>
      {!caps.viewCosts && (
        <p className="text-xs text-slate-400">Material/labour cost inputs record the job cost; the sell value shown to the customer excludes markup detail.</p>
      )}

      {show && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div><label className="block text-sm text-slate-600 mb-1">Description</label><input value={desc} onChange={(e) => setDesc(e.target.value)} className={inputCls} /></div>
          <div><label className="block text-sm text-slate-600 mb-1">Reason</label><input value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} placeholder="Customer request, site condition…" /></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="block text-sm text-slate-600 mb-1">Material cost</label><input type="number" step="0.01" value={materialCost} onChange={(e) => setMaterialCost(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-sm text-slate-600 mb-1">Labour cost</label><input type="number" step="0.01" value={labourCost} onChange={(e) => setLabourCost(e.target.value)} className={inputCls} /></div>
            <div><label className="block text-sm text-slate-600 mb-1">Markup %</label><input type="number" step="1" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} className={inputCls} /></div>
          </div>
          <p className="text-sm text-slate-500">
            Variation value (ex GST): <span className="font-bold text-slate-900">{money(((parseFloat(materialCost) || 0) + (parseFloat(labourCost) || 0)) * (1 + (parseFloat(markupPct) || 0) / 100))}</span>
          </p>
          <button type="button" disabled={busy || !desc.trim()}
            onClick={async () => {
              setBusy(true)
              try {
                await createVariation({
                  tenantId, jobId, userId, actorName, description: desc.trim(), reason: reason.trim() || undefined,
                  materialCost: parseFloat(materialCost) || 0, labourCost: parseFloat(labourCost) || 0, markupPercent: parseFloat(markupPct) || 0,
                })
                setDesc(''); setReason(''); setMaterialCost(''); setLabourCost(''); setShow(false)
                await onChange()
              } catch (e) { setError(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
            }}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {busy ? 'Saving…' : 'Create variation'}
          </button>
        </div>
      )}

      {variations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">No variations yet.</div>
      ) : variations.map((v) => (
        <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">#{v.variation_number} · {v.description}</p>
              {v.reason && <p className="text-xs text-slate-500 mt-0.5">{v.reason}</p>}
              <p className="text-xs text-slate-400 mt-1">Material {money(v.material_cost)} · Labour {money(v.labour_cost)} · +{v.markup_percent}%</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">{money(v.total_ex_gst)}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${VARIATION_COLORS[v.status]}`}>{v.status}</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {v.status === 'pending' && caps.approveVariations && (
              <>
                <button type="button" onClick={async () => { await updateVariationStatus(v, 'approved', actorName); await onChange() }} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark">Approve</button>
                <button type="button" onClick={async () => { await updateVariationStatus(v, 'rejected', actorName); await onChange() }} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Reject</button>
              </>
            )}
            {v.status === 'approved' && caps.approveVariations && (
              <button type="button" onClick={async () => { await updateVariationStatus(v, 'completed', actorName); await onChange() }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Mark completed</button>
            )}
            {variationShareUrl(v) && (
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(variationShareUrl(v)!) }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Copy approval link</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Invoices ────────────────────────────────────────────────────────────────

function InvoicesTab({ invoices, financials, caps, tenantId, jobId, userId, actorName, gstRate, onChange, setError }: {
  invoices: JobInvoice[]; financials: JobFinancials; caps: BillingCapabilities; tenantId: string; jobId: string; userId: string; actorName: string | null
  gstRate: number; onChange: () => Promise<void>; setError: (m: string) => void
}) {
  const [show, setShow] = useState(false)
  const [kind, setKind] = useState<InvoiceKind>('tax')
  const [progressPct, setProgressPct] = useState('50')
  const [dueDate, setDueDate] = useState('')
  const [busy, setBusy] = useState(false)

  const createFor = async () => {
    setBusy(true)
    try {
      let items: { description: string; quantity: number; unitPrice: number }[] = []
      if (kind === 'deposit') {
        items = [{ description: 'Deposit', quantity: 1, unitPrice: financials.quotedValueExGst * 0.1 }]
      } else if (kind === 'progress') {
        const pct = parseFloat(progressPct) || 50
        items = [{ description: `Progress claim ${pct}%`, quantity: 1, unitPrice: (financials.jobValueExGst * pct) / 100 }]
      } else if (kind === 'final') {
        const outstandingExGst = Math.max(0, financials.jobValueExGst - (financials.totalPaid / (1 + gstRate / 100)))
        items = [{ description: 'Final claim — balance of works', quantity: 1, unitPrice: outstandingExGst }]
      } else {
        items = [{ description: 'Electrical works as per job', quantity: 1, unitPrice: financials.jobValueExGst }]
      }
      await createInvoice({
        tenantId, jobId, userId, actorName, kind, items, gstRate,
        dueDate: dueDate || null, progressPercent: kind === 'progress' ? parseFloat(progressPct) : null,
      })
      setShow(false)
      await onChange()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand'

  if (!caps.issueInvoices) {
    return (
      <div className="space-y-4">
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">No invoices yet. Invoicing is handled by your office team.</div>
        ) : invoices.map((inv) => (
          <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex items-center justify-between">
            <div><p className="font-semibold text-slate-900 font-mono">{inv.invoice_number}</p><p className="text-xs text-slate-500 capitalize">{inv.kind} invoice</p></div>
            <div className="text-right"><p className="font-bold text-slate-900">{money(inv.total_inc_gst)}</p><span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${INVOICE_COLORS[inv.status]}`}>{inv.status.replace('_', ' ')}</span></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => setShow((v) => !v)} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
          {show ? 'Cancel' : '+ New invoice'}
        </button>
      </div>

      {show && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Invoice type</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as InvoiceKind)} className={inputCls}>
                <option value="deposit">Deposit invoice (10%)</option>
                <option value="progress">Progress claim</option>
                <option value="tax">Tax invoice (full value)</option>
                <option value="final">Final invoice (balance)</option>
                <option value="credit">Credit note</option>
              </select>
            </div>
            {kind === 'progress' && (
              <div><label className="block text-sm text-slate-600 mb-1">Progress %</label><input type="number" value={progressPct} onChange={(e) => setProgressPct(e.target.value)} className={inputCls} /></div>
            )}
            <div><label className="block text-sm text-slate-600 mb-1">Due date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputCls} /></div>
          </div>
          <p className="text-xs text-slate-400">GST {gstRate}% applied automatically. Job value ex GST: {money(financials.jobValueExGst)}.</p>
          <button type="button" disabled={busy} onClick={createFor} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {busy ? 'Creating…' : 'Create invoice'}
          </button>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">No invoices yet.</div>
      ) : invoices.map((inv) => (
        <div key={inv.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900 font-mono">{inv.invoice_number}</p>
              <p className="text-xs text-slate-500 capitalize mt-0.5">{inv.kind} invoice{inv.progress_percent ? ` · ${inv.progress_percent}%` : ''}{inv.due_date ? ` · due ${new Date(inv.due_date).toLocaleDateString('en-AU')}` : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-slate-900">{money(inv.total_inc_gst)}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${INVOICE_COLORS[inv.status]}`}>{inv.status.replace('_', ' ')}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">Subtotal {money(inv.subtotal_ex_gst)} · GST {money(inv.gst_amount)} · Paid {money(inv.amount_paid)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {inv.status === 'draft' && (
              <button type="button" onClick={async () => { await updateInvoiceStatus(inv, 'sent', actorName); await onChange() }} className="rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-light">Mark sent</button>
            )}
            {invoiceShareUrl(inv) && (
              <button type="button" onClick={async () => { await navigator.clipboard.writeText(invoiceShareUrl(inv)!) }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">Copy link</button>
            )}
            {inv.status !== 'void' && inv.status !== 'paid' && caps.deleteInvoices && (
              <button type="button" onClick={async () => { await updateInvoiceStatus(inv, 'void', actorName); await onChange() }} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50">Void</button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Payments ────────────────────────────────────────────────────────────────

function PaymentsTab({ payments, invoices, financials, caps, tenantId, jobId, userId, actorName, onChange, setError }: {
  payments: JobPayment[]; invoices: JobInvoice[]; financials: JobFinancials; caps: BillingCapabilities; tenantId: string; jobId: string; userId: string; actorName: string | null
  onChange: () => Promise<void>; setError: (m: string) => void
}) {
  const [kind, setKind] = useState<PaymentKind>('payment')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('bank_transfer')
  const [reference, setReference] = useState('')
  const [invoiceId, setInvoiceId] = useState('')
  const [busy, setBusy] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const openInvoices = invoices.filter((i) => i.status !== 'void' && i.status !== 'paid')

  const inputCls = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand'

  const record = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return
    setBusy(true)
    try {
      await recordPayment({ tenantId, jobId, userId, kind, amount: amt, method, reference: reference || undefined, invoiceId: invoiceId || undefined })
      // Allocate against the chosen invoice so it moves toward Paid
      if (invoiceId && kind !== 'refund') {
        const inv = invoices.find((i) => i.id === invoiceId)
        if (inv) await applyInvoicePayment(inv, amt)
      }
      await logBilling(tenantId, jobId, 'payment_recorded', { actorName, amount: amt, meta: { kind, method, reference, invoice_id: invoiceId || null } })
      setAmount(''); setReference(''); setInvoiceId('')
      await onChange()
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total paid" value={money(financials.totalPaid)} accent="text-brand-dark" />
        <Stat label="Outstanding" value={money(financials.outstandingBalance)} accent={financials.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-900'} />
        <Stat label="Deposit" value={money(financials.depositReceived)} />
        <Stat label="Progress" value={money(financials.progressReceived)} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Record a payment</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)} className={inputCls}>
            <option value="deposit">Deposit</option>
            <option value="payment">Payment</option>
            {caps.createCredits && <option value="refund">Refund</option>}
          </select>
          <input type="number" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
            <option value="bank_transfer">Bank transfer / EFT</option>
            <option value="card">Credit card</option>
            <option value="cash">Cash</option>
            <option value="cheque">Cheque</option>
            <option value="online">Online payment</option>
          </select>
          <input placeholder="Reference / receipt no." value={reference} onChange={(e) => setReference(e.target.value)} className={inputCls} />
        </div>
        {openInvoices.length > 0 && kind !== 'refund' && (
          <div className="mt-3">
            <label className="block text-xs text-slate-500 mb-1">Allocate to invoice (optional)</label>
            <select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)} className={`${inputCls} w-full sm:w-auto`}>
              <option value="">Don&apos;t allocate</option>
              {openInvoices.map((i) => (
                <option key={i.id} value={i.id}>{i.invoice_number} — {money(i.total_inc_gst - i.amount_paid)} owing</option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy || !amount} onClick={record} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {busy ? 'Recording…' : 'Record payment'}
          </button>
          {caps.issueInvoices && (
            <button type="button" disabled={syncing} onClick={async () => {
              setSyncing(true); setSyncMsg('')
              const r = await syncJobToAccounting(jobId)
              setSyncMsg(r.ok ? `Synced to Xero — ${r.payments_synced ?? 0} payment(s).` : (r.error ?? 'Sync failed'))
              setSyncing(false)
            }} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-light disabled:opacity-50">
              {syncing ? 'Syncing…' : 'Sync to Xero'}
            </button>
          )}
          {syncMsg && <span className="self-center text-xs text-slate-500">{syncMsg}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th></tr>
          </thead>
          <tbody>
            {payments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payments recorded.</td></tr>
            ) : payments.map((p) => (
              <tr key={p.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-600">{new Date(p.received_at).toLocaleDateString('en-AU')}</td>
                <td className="px-4 py-3 capitalize">{p.kind}</td>
                <td className="px-4 py-3 text-slate-600">{p.method?.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-slate-500">{p.reference ?? '—'}</td>
                <td className={`px-4 py-3 text-right font-semibold ${p.kind === 'refund' ? 'text-red-600' : 'text-slate-900'}`}>{p.kind === 'refund' ? '-' : ''}{money(p.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {invoices.length > 0 && <p className="text-xs text-slate-400">Tip: create invoices under the Invoices tab to track staged billing against these payments.</p>}
    </div>
  )
}

// ── Timeline ────────────────────────────────────────────────────────────────

function TimelineTab({ events }: { events: BillingAuditEvent[] }) {
  if (events.length === 0) return <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">No billing activity yet.</div>
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <ol className="relative border-l border-slate-200 ml-2">
        {events.map((e) => (
          <li key={e.id} className="mb-5 ml-5">
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-brand border border-white" />
            <p className="text-sm font-medium text-slate-800 capitalize">{e.event_type.replace(/_/g, ' ')}{e.amount ? ` · ${money(Number(e.amount))}` : ''}</p>
            <p className="text-xs text-slate-400">
              {new Date(e.created_at).toLocaleString('en-AU')}{e.actor_name ? ` · ${e.actor_name}` : ''}
              {e.reason ? ` · ${e.reason}` : ''}
            </p>
          </li>
        ))}
      </ol>
    </div>
  )
}
