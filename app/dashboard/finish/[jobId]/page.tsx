'use client'

/* ============================================================
   Finish a job on site: test results → certificate → invoice → complete.

   Everything needed already exists on separate screens. This page puts
   them in order for one job, shows what is done, and gets the certificate
   and invoice links to the customer from the phone before leaving site.
   Office roles (owner or manager), which in a small shop is the owner on
   the tools.
   ============================================================ */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { capabilities } from '@/lib/roles'
import { getJob } from '@/lib/jobs'
import { getTestSheetForJob, certificateUrl } from '@/lib/testsheets'
import { getInvoices, invoiceShareUrl } from '@/lib/job-billing'
import { updateJobStatusOfflineAware } from '@/lib/offline-queue'
import type { Job, JobTestSheet } from '@/types/database'
import type { JobInvoice } from '@/types/billing'

const money = (n: number) => `$${n.toFixed(2)}`

async function shareOrCopy(title: string, url: string): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url })
      return 'shared'
    } catch {
      /* cancelled: fall back to copy */
    }
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}

export default function FinishJobPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { userRole } = useAuthContext()
  const caps = capabilities(userRole)
  const [job, setJob] = useState<Job | null>(null)
  const [sheet, setSheet] = useState<JobTestSheet | null>(null)
  const [invoices, setInvoices] = useState<JobInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [j, s, inv] = await Promise.all([
      getJob(jobId),
      getTestSheetForJob(jobId).catch(() => null),
      caps.invoice ? getInvoices(jobId).catch(() => []) : Promise.resolve([]),
    ])
    return { j, s, inv }
  }, [jobId, caps.invoice])

  useEffect(() => {
    let cancelled = false
    load()
      .then(({ j, s, inv }) => {
        if (cancelled) return
        setJob(j)
        setSheet(s)
        setInvoices(inv)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  if (loading) return <p className="py-16 text-center text-slate-400">Loading…</p>
  if (!job) return <p className="py-16 text-center text-slate-500">Job not found.</p>

  const certIssued = sheet?.status === 'completed'
  const certLink = sheet ? certificateUrl(sheet) : null
  const invoice = invoices.find((i) => i.status !== 'void') ?? null
  const invLink = invoice ? invoiceShareUrl(invoice) : null
  const owing = invoice ? Math.max(0, invoice.total_inc_gst - invoice.amount_paid) : 0
  const completed = job.status === 'completed'

  const share = async (title: string, url: string) => {
    const how = await shareOrCopy(title, url).catch(() => null)
    if (how === 'copied') setMsg('Link copied. Paste it into a text or email to the customer.')
  }

  const markComplete = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const { queued } = await updateJobStatusOfflineAware(job.id, 'completed')
      setJob({ ...job, status: 'completed' })
      setMsg(queued ? 'Marked complete on this phone. It will sync when you have signal.' : 'Job marked complete.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not update the job')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div>
        <Link href="/dashboard/jobs" className="text-sm text-slate-500">← Jobs</Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Finish job</h1>
        <p className="text-sm text-slate-600">
          {job.title}
          {job.customer_name ? ` · ${job.customer_name}` : ''}
        </p>
      </div>

      {msg && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{msg}</div>}

      <Step n={1} title="Test results" done={Boolean(sheet && (sheet.circuits?.length ?? 0) > 0)}>
        {sheet ? (
          <p className="text-sm text-slate-600">
            {sheet.circuits?.length ?? 0} circuit{(sheet.circuits?.length ?? 0) === 1 ? '' : 's'} recorded
            {certIssued ? ', sheet locked.' : '.'}
          </p>
        ) : (
          <p className="text-sm text-slate-600">No test sheet for this job yet.</p>
        )}
        {!certIssued && (
          <Link href={`/dashboard/test-sheets?job=${job.id}`} className="btn btn-primary mt-3 inline-block">
            {sheet ? 'Open test sheet' : 'Start test sheet'}
          </Link>
        )}
      </Step>

      <Step n={2} title="Certificate" done={certIssued}>
        {certIssued ? (
          <>
            <p className="text-sm text-slate-600">Certificate {sheet?.certificate_number} issued.</p>
            {certLink && (
              <button type="button" onClick={() => share(`Certificate ${sheet?.certificate_number}`, certLink)} className="btn btn-primary mt-3">
                Send certificate to customer
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-600">Issue it from the test sheet once every circuit passes. It needs signal.</p>
        )}
      </Step>

      <Step n={3} title="Invoice" done={Boolean(invoice && invoice.status !== 'draft')}>
        {!caps.invoice ? (
          <p className="text-sm text-slate-600">The office will invoice this job.</p>
        ) : invoice ? (
          <>
            <p className="text-sm text-slate-600">
              Invoice {invoice.invoice_number} · {invoice.status.replace('_', ' ')} · {money(invoice.total_inc_gst)}
              {owing > 0 && invoice.status !== 'draft' ? ` · ${money(owing)} owing` : ''}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {invLink && invoice.status !== 'draft' && (
                <button type="button" onClick={() => share(`Invoice ${invoice.invoice_number}`, invLink)} className="btn btn-primary">
                  Send invoice to customer
                </button>
              )}
              <Link href={`/dashboard/jobs/${job.id}/billing`} className="btn btn-ghost inline-block">
                {invoice.status === 'draft' ? 'Finish and send invoice' : 'Open billing'}
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">No invoice yet.</p>
            <Link href={`/dashboard/jobs/${job.id}/billing`} className="btn btn-primary mt-3 inline-block">
              Create invoice
            </Link>
          </>
        )}
      </Step>

      <Step n={4} title="Job complete" done={completed}>
        {completed ? (
          <p className="text-sm text-slate-600">Done. Nice work.</p>
        ) : (
          <button type="button" onClick={markComplete} disabled={busy} className="btn btn-primary">
            {busy ? 'Saving…' : 'Mark job complete'}
          </button>
        )}
      </Step>
    </div>
  )
}

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-xl border bg-white p-5 shadow-sm ${done ? 'border-green-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          {done ? '✓' : n}
        </span>
        <h2 className="font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="mt-2 pl-10">{children}</div>
    </section>
  )
}
