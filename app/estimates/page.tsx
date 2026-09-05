'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getEstimatesForBusiness } from '@/lib/estimate'

type EstimateRow = {
  id: string
  customer_name: string
  total: number
  status: string
  created_at: string
}

const STATUS_OPTIONS = ['all', 'draft', 'sent', 'accepted', 'declined', 'completed']

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  sent: 'bg-amber-100 text-amber-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
  completed: 'bg-sky-100 text-sky-700',
}

export default function EstimatesPage() {
  const router = useRouter()
  const { currentTenant, loading } = useAuthContext()
  const [estimates, setEstimates] = useState<EstimateRow[]>([])
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadingEstimates, setLoadingEstimates] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEstimates = async () => {
      if (!currentTenant) return
      setLoadingEstimates(true)
      setError(null)
      try {
        const data = await getEstimatesForBusiness(currentTenant.id)
        setEstimates(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load estimates.')
      } finally {
        setLoadingEstimates(false)
      }
    }
    if (!loading && currentTenant) fetchEstimates()
  }, [currentTenant, loading])

  const filteredEstimates = useMemo(() => {
    if (statusFilter === 'all') return estimates
    return estimates.filter((e) => e.status === statusFilter)
  }, [estimates, statusFilter])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Estimates</h1>
          <p className="text-slate-500 mt-1">Browse and manage estimates for {currentTenant?.name || 'your workspace'}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt === 'all' ? 'All statuses' : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </option>
            ))}
          </select>
          <Link
            href="/estimates/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 12h14"/><path d="M12 5v14"/>
            </svg>
            New estimate
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-slate-100 text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</th>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Created</th>
              <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loadingEstimates ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">Loading estimates…</td>
              </tr>
            ) : filteredEstimates.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                        <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
                        <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-600">No estimates found</p>
                    <Link href="/estimates/new" className="text-sm text-brand-dark hover:underline font-medium">
                      Create your first estimate →
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredEstimates.map((estimate) => (
                <tr
                  key={estimate.id}
                  onClick={() => router.push(`/estimates/${estimate.id}`)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{estimate.customer_name || '—'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    A${estimate.total.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[estimate.status] || 'bg-slate-100 text-slate-600'}`}>
                      {estimate.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(estimate.created_at).toLocaleDateString('en-AU')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-sm text-brand-dark font-medium">View →</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
