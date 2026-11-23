'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { createClient } from '@/utils/supabase/client'
import { getJobs } from '@/lib/jobs'
import { normaliseRole } from '@/lib/roles'
import type { Job } from '@/types/database'

interface Bill {
  id: string
  from_email: string | null
  subject: string | null
  attachment_name: string | null
  received_at: string
  supplier_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  reference: string | null
  total_ex_gst: number | null
  total_inc_gst: number | null
  job_id: string | null
  suggested_job_id: string | null
  match_reason: string | null
  status: 'needs_review' | 'assigned' | 'ignored' | 'unreadable'
  error: string | null
}

const INBOX_DOMAIN = 'invoices.fieldms.com.au'
const aud = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 })
const card = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'

export default function SupplierBillsPage() {
  const { currentTenant, userRole } = useAuthContext()
  const isOffice = ['owner', 'manager'].includes(normaliseRole(userRole))
  const [token, setToken] = useState<string | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [choice, setChoice] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!currentTenant) return
    const supabase = createClient()
    const [inbox, list, js] = await Promise.all([
      supabase.from('tenant_inboxes').select('token').eq('tenant_id', currentTenant.id).maybeSingle(),
      supabase.from('supplier_invoices').select('*').eq('tenant_id', currentTenant.id).order('received_at', { ascending: false }).limit(200),
      getJobs(currentTenant.id).catch(() => [] as Job[]),
    ])
    setToken((inbox.data?.token as string | undefined) ?? null)
    setBills((list.data as Bill[] | null) ?? [])
    setJobs(js.filter((j) => j.status !== 'cancelled'))
    setLoading(false)
  }, [currentTenant])

  useEffect(() => { load().catch(() => setLoading(false)) }, [load])

  const jobName = useMemo(() => new Map(jobs.map((j) => [j.id, j.title])), [jobs])
  const address = token ? `bills-${token}@${INBOX_DOMAIN}` : null
  const review = bills.filter((b) => b.status === 'needs_review')
  const unreadable = bills.filter((b) => b.status === 'unreadable')
  const assigned = bills.filter((b) => b.status === 'assigned')

  const act = async (bill: Bill, action: 'assign' | 'ignore' | 'reopen') => {
    if (!currentTenant) return
    const jobId = choice[bill.id] ?? bill.suggested_job_id ?? ''
    if (action === 'assign' && !jobId) { setError('Choose a job for that bill first.'); return }
    setBusy(bill.id); setError('')
    try {
      const res = await fetch('/api/supplier-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: currentTenant.id, id: bill.id, action, jobId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  if (!currentTenant) return null

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Supplier bills</h1>
        <p className="mt-1 text-slate-500">Wholesaler invoices emailed to FieldMS, read automatically and added to the right job.</p>
      </div>

      <section className={card}>
        <h2 className="text-lg font-semibold text-slate-900">Your bills address</h2>
        {address ? (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 break-all">{address}</code>
              <button
                onClick={() => { navigator.clipboard?.writeText(address).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {}) }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-600">
              <li>Ask your wholesaler branch to email your invoices to this address, or add it as an extra invoice email on your trade account.</li>
              <li>Or forward any invoice email to it yourself. The PDF needs to be attached.</li>
              <li>Put your FieldMS purchase order number as the order reference at the counter and the bill goes straight onto that job. Otherwise FieldMS suggests a job and you confirm it here.</li>
            </ul>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">{loading ? 'Loading…' : 'Your address is being set up. Refresh in a minute.'}</p>
        )}
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">To check {review.length > 0 && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">{review.length}</span>}</h2>
        {loading ? (
          <div className="h-20 animate-pulse rounded-xl border border-slate-200 bg-white" />
        ) : review.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Nothing waiting. New bills appear here a minute or so after they&apos;re emailed.</p>
        ) : (
          review.map((b) => (
            <div key={b.id} className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{b.supplier_name ?? 'Unknown supplier'}{b.invoice_number && <span className="font-normal text-slate-500"> · {b.invoice_number}</span>}</p>
                  <p className="text-sm text-slate-500">
                    {b.invoice_date ? new Date(b.invoice_date).toLocaleDateString('en-AU') : new Date(b.received_at).toLocaleDateString('en-AU')}
                    {b.reference && <> · Ref <span className="font-medium text-slate-700">{b.reference}</span></>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-slate-900">{aud(b.total_inc_gst)}</p>
                  <p className="text-xs text-slate-500">{aud(b.total_ex_gst)} ex GST</p>
                </div>
              </div>
              {b.match_reason && <p className="mt-2 text-xs text-slate-500">{b.match_reason}</p>}
              {isOffice && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <select
                    value={choice[b.id] ?? b.suggested_job_id ?? ''}
                    onChange={(e) => setChoice((c) => ({ ...c, [b.id]: e.target.value }))}
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Choose a job…</option>
                    {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}{j.id === b.suggested_job_id ? ' (suggested)' : ''}</option>)}
                  </select>
                  <button disabled={busy !== null} onClick={() => act(b, 'assign')} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
                    {busy === b.id ? 'Adding…' : 'Add to job'}
                  </button>
                  <button disabled={busy !== null} onClick={() => act(b, 'ignore')} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                    Not a job cost
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {unreadable.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Couldn&apos;t read</h2>
          {unreadable.map((b) => (
            <div key={b.id} className={`${card} text-sm`}>
              <p className="font-medium text-slate-800">{b.subject || '(no subject)'} <span className="font-normal text-slate-500">from {b.from_email}</span></p>
              <p className="mt-1 text-slate-500">{b.error}</p>
              {isOffice && <button onClick={() => act(b, 'ignore')} className="mt-2 text-xs font-semibold text-slate-500 underline">Dismiss</button>}
            </div>
          ))}
        </section>
      )}

      {assigned.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Added to jobs</h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-2">Supplier</th><th className="px-4 py-2">Invoice</th><th className="px-4 py-2">Job</th><th className="px-4 py-2 text-right">Ex GST</th><th className="px-4 py-2" /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assigned.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-2">{b.supplier_name ?? '—'}</td>
                    <td className="px-4 py-2">{b.invoice_number ?? '—'}</td>
                    <td className="px-4 py-2">{b.job_id ? <Link href={`/dashboard/jobs/${b.job_id}/billing`} className="text-brand-dark underline">{jobName.get(b.job_id) ?? 'Job'}</Link> : '—'}</td>
                    <td className="px-4 py-2 text-right">{aud(b.total_ex_gst)}</td>
                    <td className="px-4 py-2 text-right">{isOffice && <button onClick={() => act(b, 'reopen')} className="text-xs font-semibold text-slate-500 underline">Move</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
