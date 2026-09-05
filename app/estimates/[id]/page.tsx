'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { EstimateItem } from '@/types/database'
import { useAuthContext } from '@/context/AuthContext'
import {
  getEstimateWithItems,
  updateEstimateStatus,
  updateEstimateDeposit,
  markEstimateSent,
  quoteShareUrl,
  convertEstimateToJob,
} from '@/lib/estimate'

const STATUS_OPTIONS = ['draft', 'sent', 'accepted', 'declined', 'completed']

function formatCurrency(value: number) {
  return `A$${value.toFixed(2)}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function EstimateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: estimateId } = use(params)
  const router = useRouter()
  const { currentTenant, loading, session } = useAuthContext()
  const [customerName, setCustomerName] = useState('')
  const [status, setStatus] = useState('draft')
  const [total, setTotal] = useState(0)
  const [createdAt, setCreatedAt] = useState('')
  const [items, setItems] = useState<EstimateItem[]>([])
  const [loadingEstimate, setLoadingEstimate] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [depositPercent, setDepositPercent] = useState(0)
  const [approvedAt, setApprovedAt] = useState<string | null>(null)
  const [declinedAt, setDeclinedAt] = useState<string | null>(null)
  const [approvalName, setApprovalName] = useState<string | null>(null)
  const [savingDeposit, setSavingDeposit] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [convertingJob, setConvertingJob] = useState(false)
  const [estimateData, setEstimateData] = useState<Awaited<ReturnType<typeof getEstimateWithItems>> | null>(null)

  useEffect(() => {
    const fetchEstimate = async () => {
      if (!currentTenant) return
      setLoadingEstimate(true)
      setError(null)
      setSuccess(null)

      try {
        const estimate = await getEstimateWithItems(estimateId, currentTenant.id)
        setEstimateData(estimate)
        setCustomerName(estimate.customer_name)
        setStatus(estimate.status)
        setTotal(estimate.total)
        setCreatedAt(estimate.created_at)
        setItems(estimate.items)
        setPublicToken(estimate.public_token)
        setDepositPercent(estimate.deposit_percent)
        setApprovedAt(estimate.approved_at)
        setDeclinedAt(estimate.declined_at)
        setApprovalName(estimate.approval_name)
        setJobId(estimate.job_id)
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load estimate.')
      } finally {
        setLoadingEstimate(false)
      }
    }

    if (!loading && currentTenant) {
      fetchEstimate()
    }
  }, [currentTenant, estimateId, loading])

  useEffect(() => {
    if (!loading && !currentTenant) {
      router.push('/login')
    }
  }, [loading, currentTenant, router])

  const handleStatusChange = async (nextStatus: string) => {
    if (!currentTenant) return
    setSavingStatus(true)
    setError(null)
    setSuccess(null)

    try {
      await updateEstimateStatus(estimateId, currentTenant.id, nextStatus)
      setStatus(nextStatus)
      setSuccess('Status updated successfully.')
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update status.')
    } finally {
      setSavingStatus(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="">
        <div className="mb-6 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => router.push('/estimates')}
              className="text-sm font-medium text-brand-dark transition-colors hover:text-brand"
            >
              ← Back to estimates
            </button>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">Estimate details</h1>
            <p className="text-sm text-slate-500">Review estimate information and update status.</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-5 py-4 text-sm text-slate-700">
            Workspace: <span className="font-semibold text-slate-900">{currentTenant?.name || 'Loading...'}</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm text-red-900">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
              <div className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-widest text-slate-500">Customer</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{customerName || '—'}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Created</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      {createdAt ? formatDate(createdAt) : '—'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm text-slate-500">Total</p>
                    <p className="mt-2 text-3xl font-semibold text-slate-900">{formatCurrency(total)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div>
                  <p className="text-sm text-slate-500">Status</p>
                  <select
                    value={status}
                    onChange={(event) => handleStatusChange(event.target.value)}
                    className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
                    disabled={savingStatus || loadingEstimate}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-widest text-slate-500">Status note</p>
                  <p className="mt-2 text-sm text-slate-700">
                    Use the dropdown to update the estimate workflow state.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-widest text-slate-500">Line items</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Estimate items</h2>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Item</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Quantity</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Unit price</th>
                    <th className="px-4 py-3 text-sm font-semibold text-slate-600">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingEstimate ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                        Loading estimate details...
                      </td>
                    </tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                        No line items found.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="border-t border-slate-200 last:border-b">
                        <td className="px-4 py-4 align-top text-sm text-slate-900">{item.name}</td>
                        <td className="px-4 py-4 align-top text-sm text-slate-700">{item.quantity}</td>
                        <td className="px-4 py-4 align-top text-sm text-slate-700">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-4 align-top text-sm font-medium text-slate-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Customer approval — share link, deposit, status */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-500">Customer approval</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">One-tap quote approval</h2>
            </div>
            {approvedAt ? (
              <span className="rounded-full bg-green-100 px-4 py-1.5 text-sm font-semibold text-green-700">
                Approved{approvalName ? ` by ${approvalName}` : ''}
              </span>
            ) : declinedAt ? (
              <span className="rounded-full bg-red-100 px-4 py-1.5 text-sm font-semibold text-red-700">Declined</span>
            ) : (
              <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-600">Awaiting response</span>
            )}
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
            <div>
              <label className="block text-sm text-slate-600 mb-1">Public quote link</label>
              <input
                readOnly
                value={publicToken ? `${typeof window !== 'undefined' ? window.location.origin : ''}/quote/${publicToken}` : 'Save the estimate to generate a link'}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none"
                onFocus={(e) => e.target.select()}
              />
            </div>
            <button
              type="button"
              disabled={!publicToken}
              onClick={async () => {
                const url = quoteShareUrl({ public_token: publicToken })
                if (!url) return
                await navigator.clipboard.writeText(url)
                if (currentTenant && status === 'draft') {
                  try {
                    await markEstimateSent(estimateId, currentTenant.id)
                    setStatus('sent')
                  } catch { /* non-fatal */ }
                }
                setSuccess('Quote link copied — send it to your customer.')
              }}
              className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              Copy link
            </button>
            <div>
              <label className="block text-sm text-slate-600 mb-1">Deposit %</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={depositPercent}
                  onChange={(e) => setDepositPercent(Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand"
                />
                <button
                  type="button"
                  disabled={savingDeposit || !currentTenant}
                  onClick={async () => {
                    if (!currentTenant) return
                    setSavingDeposit(true)
                    try {
                      await updateEstimateDeposit(estimateId, currentTenant.id, depositPercent)
                      setSuccess('Deposit percentage saved.')
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to save deposit.')
                    } finally {
                      setSavingDeposit(false)
                    }
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  {savingDeposit ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
          {depositPercent > 0 && (
            <p className="mt-3 text-sm text-slate-500">
              Customers see a deposit of A${((total * depositPercent) / 100).toFixed(2)} ({depositPercent}%) when approving.
            </p>
          )}
        </div>

        {/* Job link — connect the quote to a job so approval seeds billing */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-widest text-slate-500">Job</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">Linked job</h2>
              <p className="mt-1 text-sm text-slate-500">
                {jobId
                  ? 'This quote is linked to a job. Approving it sets the job’s quoted value automatically.'
                  : 'Create a job from this quote so it flows into scheduling, materials and billing.'}
              </p>
            </div>
            {jobId ? (
              <button
                type="button"
                onClick={() => router.push(`/dashboard/jobs/${jobId}/billing`)}
                className="shrink-0 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-ink-light transition-colors"
              >
                Open job billing
              </button>
            ) : (
              <button
                type="button"
                disabled={convertingJob || !currentTenant || !session?.user || !estimateData}
                onClick={async () => {
                  if (!currentTenant || !session?.user || !estimateData) return
                  setConvertingJob(true)
                  setError(null)
                  try {
                    const newJobId = await convertEstimateToJob(estimateData, currentTenant.id, session.user.id)
                    setJobId(newJobId)
                    setSuccess('Job created and linked to this quote.')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Failed to create job.')
                  } finally {
                    setConvertingJob(false)
                  }
                }}
                className="shrink-0 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
              >
                {convertingJob ? 'Creating…' : 'Create job from quote'}
              </button>
            )}
          </div>
        </div>

        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-6 py-4 text-sm text-green-900">
            {success}
          </div>
        )}
      </div>
    </div>
  )
}
