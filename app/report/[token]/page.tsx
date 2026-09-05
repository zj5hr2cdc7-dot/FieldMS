'use client'

import { use, useEffect, useState } from 'react'

interface ReportData {
  report: { title: string; summary: string | null; created_at: string }
  job: { title: string; customer_name: string | null; customer_address: string | null } | null
  business: { name: string; logo_url: string | null; abn: string | null; phone: string | null; website: string | null } | null
  photos: { caption: string | null; taken_at: string; url: string }[]
}

export default function PublicReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/reports/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Report not found'))))
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-500">{error}</p></div>
  }
  if (!data) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><p className="text-slate-400">Loading report…</p></div>
  }

  const { report, job, business, photos } = data

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl bg-white shadow-sm rounded-xl print:shadow-none print:rounded-none p-8 sm:p-10">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{report.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {job?.title}{job?.customer_address ? ` — ${job.customer_address}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-slate-400">{new Date(report.created_at).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-900">{business?.name}</p>
            {business?.abn && <p className="text-xs text-slate-500">ABN {business.abn}</p>}
            {business?.phone && <p className="text-xs text-slate-500">{business.phone}</p>}
          </div>
        </div>

        {report.summary && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Summary of work</h2>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{report.summary}</p>
          </div>
        )}

        {photos.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Photos ({photos.length})</h2>
            <div className="mt-3 grid gap-5 sm:grid-cols-2">
              {photos.map((photo, i) => (
                <figure key={i} className="break-inside-avoid">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.caption || `Photo ${i + 1}`} className="w-full rounded-lg border border-slate-200 object-cover" />
                  <figcaption className="mt-1.5 text-xs text-slate-500">
                    {photo.caption || `Photo ${i + 1}`} · {new Date(photo.taken_at).toLocaleString()}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        <div className="mt-10 border-t border-slate-200 pt-5 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Prepared by {business?.name}{business?.website ? ` · ${business.website}` : ''}
          </p>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors print:hidden"
          >
            Download / Print PDF
          </button>
        </div>
      </div>
    </div>
  )
}
