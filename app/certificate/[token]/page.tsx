'use client'

import { use, useEffect, useState } from 'react'
import type { TestSheetCircuit } from '@/types/database'

interface CertificateData {
  certificate: {
    certificate_number: string
    test_date: string | null
    completed_at: string | null
    installation_address: string | null
    switchboard_location: string | null
    supply_type: string | null
    circuits: TestSheetCircuit[]
    tester_name: string | null
    tester_license: string | null
    notes: string | null
  }
  job: { title: string; customer_name: string | null; customer_address: string | null } | null
  business: { name: string; logo_url: string | null; abn: string | null; phone: string | null; website: string | null } | null
  clause: { reference: string; title: string } | null
  photos: { caption: string | null; url: string }[]
}

export default function PublicCertificatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<CertificateData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/certificates/${token}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Certificate not found'))))
      .then(setData)
      .catch((err) => setError(err.message))
  }, [token])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400">Loading certificate…</p>
      </div>
    )
  }

  const { certificate, job, business, clause, photos } = data

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-4xl bg-white shadow-sm rounded-xl print:shadow-none print:rounded-none p-8 sm:p-12">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Electrical Safety Test Certificate</h1>
            <p className="mt-1 text-sm text-slate-500">Tested in accordance with AS/NZS 3000 (Wiring Rules), Section 8</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-slate-900">{business?.name}</p>
            {business?.abn && <p className="text-xs text-slate-500">ABN {business.abn}</p>}
            {business?.phone && <p className="text-xs text-slate-500">{business.phone}</p>}
          </div>
        </div>

        {/* Certificate meta */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Meta label="Certificate no." value={certificate.certificate_number} strong />
          <Meta label="Test date" value={certificate.test_date ? new Date(certificate.test_date).toLocaleDateString() : '—'} />
          <Meta label="Tested by" value={certificate.tester_name || '—'} />
          <Meta label="Licence" value={certificate.tester_license || '—'} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Meta label="Customer" value={job?.customer_name || '—'} />
          <Meta label="Installation address" value={certificate.installation_address || job?.customer_address || '—'} />
          <Meta label="Supply" value={certificate.supply_type || '—'} />
        </div>

        {clause && (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-100 px-4 py-2.5 text-sm text-green-800">
            Applicable standard: {clause.reference} — {clause.title}
          </div>
        )}

        {/* Circuit results */}
        <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">Circuit test results</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-300 text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Circuit</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3">Protection</th>
                <th className="py-2 pr-3">Earth cont. (Ω)</th>
                <th className="py-2 pr-3">Insul. res. (MΩ)</th>
                <th className="py-2 pr-3">Polarity</th>
                <th className="py-2 pr-3">RCD (ms)</th>
                <th className="py-2">Visual</th>
              </tr>
            </thead>
            <tbody>
              {certificate.circuits.map((c, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-medium text-slate-900">{c.circuit_ref || `C${i + 1}`}</td>
                  <td className="py-2 pr-3 text-slate-700">{c.description}</td>
                  <td className="py-2 pr-3 text-slate-700">{[c.protection_type, c.protection_rating].filter(Boolean).join(' ')}</td>
                  <td className="py-2 pr-3 text-slate-700">{c.earth_continuity_ohms || '—'}</td>
                  <td className="py-2 pr-3 text-slate-700">{c.insulation_resistance_mohms || '—'}</td>
                  <td className="py-2 pr-3">{passFail(c.polarity_pass)}</td>
                  <td className="py-2 pr-3 text-slate-700">{c.rcd_trip_ms || '—'}</td>
                  <td className="py-2">{passFail(c.visual_pass)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {certificate.notes && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Notes</h2>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{certificate.notes}</p>
          </div>
        )}

        {/* Photo evidence */}
        {photos.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Photo evidence</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {photos.map((photo, i) => (
                <figure key={i}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={photo.caption || `Photo ${i + 1}`} className="rounded-lg border border-slate-200 w-full h-40 object-cover" />
                  {photo.caption && <figcaption className="mt-1 text-xs text-slate-500">{photo.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* Declaration */}
        <div className="mt-10 rounded-lg border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
          I certify that the electrical installation described above has been tested in accordance with
          AS/NZS 3000 and, at the time of testing, the results recorded were within acceptable limits.
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="font-semibold text-slate-900">{certificate.tester_name}</p>
              {certificate.tester_license && <p className="text-xs text-slate-500">Licence {certificate.tester_license}</p>}
            </div>
            <p className="text-xs text-slate-500">
              Issued {certificate.completed_at ? new Date(certificate.completed_at).toLocaleDateString() : ''}
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors"
          >
            Download / Print PDF
          </button>
        </div>
      </div>
    </div>
  )
}

function Meta({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm ${strong ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{value}</p>
    </div>
  )
}

function passFail(value: boolean | null) {
  if (value === true) return <span className="font-semibold text-green-600">Pass</span>
  if (value === false) return <span className="font-semibold text-red-600">Fail</span>
  return <span className="text-slate-400">—</span>
}
