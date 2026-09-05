'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getJobs } from '@/lib/jobs'
import { getTemplates, getSubmissions, duplicateTemplate, updateTemplate, documentUrl } from '@/lib/forms'
import { FORM_LIBRARY, installLibraryTemplate } from '@/lib/form-library'
import type { FormSubmission, FormTemplate } from '@/types/forms'
import type { Job } from '@/types/database'

type Tab = 'documents' | 'templates' | 'library'

const CATEGORY_COLORS: Record<string, string> = {
  electrical: 'bg-amber-100 text-amber-700',
  safety: 'bg-red-100 text-red-700',
  general: 'bg-sky-100 text-sky-700',
  hr: 'bg-purple-100 text-purple-700',
  assets: 'bg-teal-100 text-teal-700',
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  awaiting_signature: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
}

export default function FormsHubPage() {
  const router = useRouter()
  const { currentTenant, session } = useAuthContext()
  const user = session?.user ?? null

  const [tab, setTab] = useState<Tab>('documents')
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startTemplate, setStartTemplate] = useState<FormTemplate | null>(null)
  const [startJobId, setStartJobId] = useState('')

  const refresh = useCallback(async () => {
    if (!currentTenant) return
    try {
      const [t, s, j] = await Promise.all([
        getTemplates(currentTenant.id),
        getSubmissions(currentTenant.id),
        getJobs(currentTenant.id),
      ])
      setTemplates(t)
      setSubmissions(s)
      setJobs(j)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load forms.')
    }
  }, [currentTenant])

  useEffect(() => {
    refresh()
  }, [refresh])

  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])

  const filteredSubmissions = useMemo(() => {
    let list = submissions
    if (statusFilter !== 'all') list = list.filter((s) => s.status === statusFilter)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((s) => {
        const job = s.job_id ? jobById.get(s.job_id) : null
        return (
          s.template_name.toLowerCase().includes(q) ||
          s.doc_number?.toLowerCase().includes(q) ||
          job?.title.toLowerCase().includes(q) ||
          job?.customer_name?.toLowerCase().includes(q) ||
          job?.customer_address?.toLowerCase().includes(q)
        )
      })
    }
    return list
  }, [submissions, search, statusFilter, jobById])

  const installedNames = useMemo(() => new Set(templates.map((t) => t.name)), [templates])

  const handleInstall = async (key: string) => {
    if (!currentTenant || !user) return
    setBusyKey(key); setError(null)
    try {
      await installLibraryTemplate(key, currentTenant.id, user.id)
      await refresh()
      setTab('templates')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add template.')
    } finally {
      setBusyKey(null)
    }
  }

  const inputCls = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Forms & compliance</h1>
          <p className="text-slate-500 mt-1">Digital forms, certificates and safety documents — no paper, no second app.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/forms/builder')}
          className="self-start rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
        >
          + Build custom form
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {([
          ['documents', `Documents (${submissions.length})`],
          ['templates', `My templates (${templates.length})`],
          ['library', `Template library (${FORM_LIBRARY.length})`],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
              tab === key ? 'border-brand text-brand-dark' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Documents ── */}
      {tab === 'documents' && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer, address, job, document number…"
              className={`${inputCls} flex-1`}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls}>
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="awaiting_signature">Awaiting signature</option>
              <option value="completed">Completed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            {filteredSubmissions.length === 0 ? (
              <div className="p-10 text-center text-sm text-slate-400">
                No documents yet. Start one from your templates or the library.
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3 hidden md:table-cell">Job / customer</th>
                    <th className="px-4 py-3">Doc no.</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Date</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredSubmissions.map((s) => {
                    const job = s.job_id ? jobById.get(s.job_id) : null
                    return (
                      <tr
                        key={s.id}
                        onClick={() => router.push(`/dashboard/forms/fill?submission=${s.id}`)}
                        className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{s.template_name}</td>
                        <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
                          {job ? `${job.title}${job.customer_name ? ` — ${job.customer_name}` : ''}` : '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.doc_number ?? '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[s.status]}`}>
                            {s.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                          {new Date(s.created_at).toLocaleDateString('en-AU')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {s.public_token && ['completed', 'approved'].includes(s.status) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const url = documentUrl(s)
                                if (url) navigator.clipboard.writeText(url)
                              }}
                              className="text-xs font-semibold text-brand-dark hover:text-brand"
                            >
                              Copy link
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── My templates ── */}
      {tab === 'templates' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-400">
              No templates yet — add some from the library or build your own.
            </div>
          )}
          {templates.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-slate-900 leading-tight">{t.name}</h3>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${CATEGORY_COLORS[t.category] ?? 'bg-slate-100 text-slate-600'}`}>
                  {t.category}
                </span>
              </div>
              {t.description && <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{t.description}</p>}
              <p className="mt-2 text-xs text-slate-400">
                {t.schema.fields.length} fields · prefix {t.doc_prefix}
                {t.auto_on_job_complete && ' · auto on job completion'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setStartTemplate(t); setStartJobId('') }}
                  className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-brand-dark"
                >
                  Start form
                </button>
                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/forms/builder?template=${t.id}`)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busyKey === t.id}
                  onClick={async () => {
                    if (!currentTenant || !user) return
                    setBusyKey(t.id)
                    try { await duplicateTemplate(t, currentTenant.id, user.id); await refresh() } finally { setBusyKey(null) }
                  }}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={async () => { await updateTemplate(t.id, { archived: true }); refresh() }}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50"
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Library ── */}
      {tab === 'library' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FORM_LIBRARY.map((lib) => {
            const installed = installedNames.has(lib.name)
            return (
              <div key={lib.key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 leading-tight">{lib.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${CATEGORY_COLORS[lib.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {lib.category}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 flex-1">{lib.description}</p>
                <p className="mt-2 text-xs text-slate-400">{lib.schema.fields.length} fields · prefix {lib.doc_prefix}</p>
                <button
                  type="button"
                  disabled={busyKey === lib.key || installed}
                  onClick={() => handleInstall(lib.key)}
                  className={`mt-4 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                    installed
                      ? 'bg-slate-100 text-slate-400 cursor-default'
                      : 'bg-ink text-white hover:bg-ink-light'
                  } disabled:opacity-60`}
                >
                  {installed ? '✓ Added to my templates' : busyKey === lib.key ? 'Adding…' : 'Add to my templates'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Start form modal: pick a job for auto-fill */}
      {startTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setStartTemplate(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Start: {startTemplate.name}</h3>
            <p className="mt-1 text-sm text-slate-500">Link to a job to auto-fill customer, address, technician and dates.</p>
            <select value={startJobId} onChange={(e) => setStartJobId(e.target.value)} className={`${inputCls} mt-4 w-full`}>
              <option value="">No job (blank form)</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}{j.customer_name ? ` — ${j.customer_name}` : ''}</option>
              ))}
            </select>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/forms/fill?template=${startTemplate.id}${startJobId ? `&job=${startJobId}` : ''}`)
                }
                className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                Start form
              </button>
              <button type="button" onClick={() => setStartTemplate(null)} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
