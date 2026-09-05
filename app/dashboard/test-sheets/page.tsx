'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { getJobs } from '@/lib/jobs'
import NoJobsYet from '@/components/NoJobsYet'
import {
  getTestSheetForJob,
  createTestSheet,
  updateTestSheet,
  completeTestSheet,
  emptyCircuit,
  checkCircuit,
  certificateUrl,
} from '@/lib/testsheets'
import type { Job, JobTestSheet, TestSheetCircuit } from '@/types/database'

export default function TestSheetsPage() {
  const { currentTenant, session } = useAuthContext()
  const user = session?.user ?? null
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [sheet, setSheet] = useState<JobTestSheet | null>(null)
  const [loadingSheet, setLoadingSheet] = useState(false)
  // Distinguish "still fetching" from "genuinely none", so the empty
  // state never flashes while jobs are on the way.
  const [jobsLoaded, setJobsLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTenant) return
    getJobs(currentTenant.id)
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setJobsLoaded(true))
  }, [currentTenant])

  useEffect(() => {
    if (!selectedJobId) { setSheet(null); return }
    setLoadingSheet(true)
    setError(null)
    getTestSheetForJob(selectedJobId)
      .then(setSheet)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSheet(false))
  }, [selectedJobId])

  const selectedJob = useMemo(() => jobs.find((j) => j.id === selectedJobId) ?? null, [jobs, selectedJobId])
  const isCompleted = sheet?.status === 'completed'

  const handleCreate = async () => {
    if (!currentTenant || !user || !selectedJob) return
    setSaving(true); setError(null)
    try {
      const created = await createTestSheet(currentTenant.id, selectedJob.id, user.id, {
        installation_address: selectedJob.customer_address,
      })
      setSheet(created)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create test sheet.')
    } finally {
      setSaving(false)
    }
  }

  const patchSheet = (updates: Partial<JobTestSheet>) => {
    setSheet((current) => (current ? { ...current, ...updates } : current))
  }

  const patchCircuit = (index: number, updates: Partial<TestSheetCircuit>) => {
    setSheet((current) => {
      if (!current) return current
      const circuits = current.circuits.map((c, i) => (i === index ? { ...c, ...updates } : c))
      return { ...current, circuits }
    })
  }

  const handleSave = async () => {
    if (!sheet) return
    setSaving(true); setError(null); setSuccess(null)
    try {
      const saved = await updateTestSheet(sheet.id, {
        installation_address: sheet.installation_address,
        switchboard_location: sheet.switchboard_location,
        supply_type: sheet.supply_type,
        circuits: sheet.circuits,
        tester_name: sheet.tester_name,
        tester_license: sheet.tester_license,
        test_date: sheet.test_date,
        notes: sheet.notes,
      })
      setSheet(saved)
      setSuccess('Test sheet saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!sheet) return
    setSaving(true); setError(null); setSuccess(null)
    try {
      // Persist latest edits first so the certificate reflects what's on screen
      const saved = await updateTestSheet(sheet.id, {
        installation_address: sheet.installation_address,
        switchboard_location: sheet.switchboard_location,
        supply_type: sheet.supply_type,
        circuits: sheet.circuits,
        tester_name: sheet.tester_name,
        tester_license: sheet.tester_license,
        test_date: sheet.test_date,
        notes: sheet.notes,
      })
      const completed = await completeTestSheet(saved)
      setSheet(completed)
      setSuccess(`Certificate ${completed.certificate_number} issued.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue certificate.')
    } finally {
      setSaving(false)
    }
  }

  const copyLink = async () => {
    if (!sheet) return
    const url = certificateUrl(sheet)
    if (!url) return
    await navigator.clipboard.writeText(url)
    setSuccess('Certificate link copied to clipboard.')
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-slate-500'
  const cellCls =
    'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-brand disabled:bg-slate-50 disabled:text-slate-500'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Test sheets & certificates</h1>
        <p className="text-slate-500 mt-1">
          Record AS/NZS 3000 test results per circuit and issue a shareable safety certificate — no second app needed.
        </p>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {/* Job selector */}
      {jobsLoaded && jobs.length === 0 ? (
        <NoJobsYet
          thing="test sheet"
          why="Test sheets and certificates are recorded against a job, so the certificate carries the site and customer details."
        />
      ) : (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium text-slate-700 mb-2">Job</label>
        <select value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)} className={inputCls} disabled={!jobsLoaded}>
          <option value="">Select a job…</option>
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}{job.customer_name ? ` — ${job.customer_name}` : ''}
            </option>
          ))}
        </select>

        {selectedJobId && !loadingSheet && !sheet && (
          <button
            type="button"
            onClick={handleCreate}
            disabled={saving}
            className="mt-4 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Start test sheet'}
          </button>
        )}
        {loadingSheet && <p className="mt-4 text-sm text-slate-400">Loading test sheet…</p>}
      </div>
      )}

      {sheet && (
        <>
          {/* Status banner */}
          {isCompleted && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-green-800">Certificate {sheet.certificate_number} issued</p>
                <p className="text-sm text-green-700 mt-0.5">This sheet is locked. Share the certificate link with your customer.</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={copyLink} className="rounded-lg border border-green-300 bg-white px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100 transition-colors">
                  Copy link
                </button>
                {certificateUrl(sheet) && (
                  <a href={certificateUrl(sheet)!} target="_blank" rel="noreferrer" className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors">
                    View certificate
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Installation details */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Installation details</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Installation address</label>
                <input disabled={isCompleted} value={sheet.installation_address ?? ''} onChange={(e) => patchSheet({ installation_address: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Switchboard location</label>
                <input disabled={isCompleted} value={sheet.switchboard_location ?? ''} onChange={(e) => patchSheet({ switchboard_location: e.target.value })} className={inputCls} placeholder="e.g. Garage wall" />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Supply type</label>
                <input disabled={isCompleted} value={sheet.supply_type ?? ''} onChange={(e) => patchSheet({ supply_type: e.target.value })} className={inputCls} placeholder="e.g. 230V single phase" />
              </div>
            </div>
          </div>

          {/* Circuits */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Circuit tests</h2>
              {!isCompleted && (
                <button
                  type="button"
                  onClick={() => patchSheet({ circuits: [...sheet.circuits, emptyCircuit()] })}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  + Add circuit
                </button>
              )}
            </div>

            <div className="space-y-4">
              {sheet.circuits.map((circuit, index) => {
                const failures = checkCircuit(circuit).filter((c) => !c.ok)
                return (
                  <div key={index} className={`rounded-lg border p-4 ${failures.length ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-6">
                      <Cell label="Circuit ref">
                        <input disabled={isCompleted} value={circuit.circuit_ref} onChange={(e) => patchCircuit(index, { circuit_ref: e.target.value })} className={cellCls} placeholder={`C${index + 1}`} />
                      </Cell>
                      <Cell label="Description">
                        <input disabled={isCompleted} value={circuit.description} onChange={(e) => patchCircuit(index, { description: e.target.value })} className={cellCls} placeholder="Lights, power…" />
                      </Cell>
                      <Cell label="Cable size">
                        <input disabled={isCompleted} value={circuit.cable_size} onChange={(e) => patchCircuit(index, { cable_size: e.target.value })} className={cellCls} placeholder="2.5mm²" />
                      </Cell>
                      <Cell label="Protection">
                        <input disabled={isCompleted} value={circuit.protection_type} onChange={(e) => patchCircuit(index, { protection_type: e.target.value })} className={cellCls} placeholder="MCB / RCBO" />
                      </Cell>
                      <Cell label="Rating">
                        <input disabled={isCompleted} value={circuit.protection_rating} onChange={(e) => patchCircuit(index, { protection_rating: e.target.value })} className={cellCls} placeholder="20A" />
                      </Cell>
                      <Cell label="Earth cont. (Ω)">
                        <input disabled={isCompleted} value={circuit.earth_continuity_ohms} onChange={(e) => patchCircuit(index, { earth_continuity_ohms: e.target.value })} className={cellCls} />
                      </Cell>
                      <Cell label="Insul. res. (MΩ)">
                        <input disabled={isCompleted} value={circuit.insulation_resistance_mohms} onChange={(e) => patchCircuit(index, { insulation_resistance_mohms: e.target.value })} className={cellCls} />
                      </Cell>
                      <Cell label="RCD trip (ms)">
                        <input disabled={isCompleted} value={circuit.rcd_trip_ms} onChange={(e) => patchCircuit(index, { rcd_trip_ms: e.target.value })} className={cellCls} />
                      </Cell>
                      <Cell label="RCD test (mA)">
                        <input disabled={isCompleted} value={circuit.rcd_trip_ma} onChange={(e) => patchCircuit(index, { rcd_trip_ma: e.target.value })} className={cellCls} placeholder="30" />
                      </Cell>
                      <Cell label="Polarity">
                        <TriState disabled={isCompleted} value={circuit.polarity_pass} onChange={(v) => patchCircuit(index, { polarity_pass: v })} />
                      </Cell>
                      <Cell label="Visual">
                        <TriState disabled={isCompleted} value={circuit.visual_pass} onChange={(v) => patchCircuit(index, { visual_pass: v })} />
                      </Cell>
                      <Cell label="Notes">
                        <input disabled={isCompleted} value={circuit.notes} onChange={(e) => patchCircuit(index, { notes: e.target.value })} className={cellCls} />
                      </Cell>
                    </div>

                    {failures.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {failures.map((f, i) => (
                          <li key={i} className="text-xs text-red-600">⚠ {f.message}</li>
                        ))}
                      </ul>
                    )}

                    {!isCompleted && sheet.circuits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => patchSheet({ circuits: sheet.circuits.filter((_, i) => i !== index) })}
                        className="mt-3 text-xs font-semibold text-red-500 hover:text-red-600"
                      >
                        Remove circuit
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Tester + actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Certification</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm text-slate-600 mb-1">Tester name</label>
                <input disabled={isCompleted} value={sheet.tester_name ?? ''} onChange={(e) => patchSheet({ tester_name: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Licence number</label>
                <input disabled={isCompleted} value={sheet.tester_license ?? ''} onChange={(e) => patchSheet({ tester_license: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">Test date</label>
                <input disabled={isCompleted} type="date" value={sheet.test_date ?? ''} onChange={(e) => patchSheet({ test_date: e.target.value })} className={inputCls} />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm text-slate-600 mb-1">Notes</label>
              <textarea disabled={isCompleted} value={sheet.notes ?? ''} onChange={(e) => patchSheet({ notes: e.target.value })} rows={3} className={inputCls} />
            </div>

            {!isCompleted && (
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={handleSave} disabled={saving} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save draft'}
                </button>
                <button type="button" onClick={handleComplete} disabled={saving} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50">
                  {saving ? 'Working…' : 'Complete & issue certificate'}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      {children}
    </div>
  )
}

function TriState({ value, onChange, disabled }: { value: boolean | null; onChange: (v: boolean | null) => void; disabled?: boolean }) {
  return (
    <div className="flex gap-1">
      <button type="button" disabled={disabled} onClick={() => onChange(value === true ? null : true)}
        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold border transition-colors disabled:opacity-60 ${value === true ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-green-400'}`}>
        Pass
      </button>
      <button type="button" disabled={disabled} onClick={() => onChange(value === false ? null : false)}
        className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold border transition-colors disabled:opacity-60 ${value === false ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-red-400'}`}>
        Fail
      </button>
    </div>
  )
}
