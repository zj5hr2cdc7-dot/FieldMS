'use client'

/* ============================================================
   Dashboard card for the sample job (lib/sample-job.ts).

   - Empty workspace: offer to add a sample job to click through.
   - Sample data present: say so plainly and offer to remove it, so nobody
     mistakes a demo booking for real work.
   Office staff only; technicians never see it.
   ============================================================ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { isOffice } from '@/lib/roles'
import { createSampleJob, hasSampleData, removeSampleData } from '@/lib/sample-job'

export default function SampleJobCard({ jobCount, onChange }: { jobCount: number; onChange?: () => void }) {
  const { currentTenant, session, userRole } = useAuthContext()
  const router = useRouter()
  const [hasSample, setHasSample] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const office = isOffice(userRole)

  useEffect(() => {
    if (!currentTenant || !office) return
    let cancelled = false
    hasSampleData(currentTenant.id)
      .then((v) => {
        if (!cancelled) setHasSample(v)
      })
      .catch(() => {
        if (!cancelled) setHasSample(false)
      })
    return () => {
      cancelled = true
    }
  }, [currentTenant, office, jobCount])

  if (!currentTenant || !office || hasSample === null) return null
  if (!hasSample && jobCount > 0) return null

  const add = async () => {
    if (!session?.user) return
    setBusy(true)
    setError('')
    try {
      await createSampleJob(currentTenant.id, session.user.id)
      setHasSample(true)
      onChange?.()
      router.push('/dashboard/jobs')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the sample job')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setError('')
    try {
      await removeSampleData(currentTenant.id)
      setHasSample(false)
      onChange?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the sample data')
    } finally {
      setBusy(false)
    }
  }

  if (hasSample) {
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-amber-900">You have sample data in this workspace</p>
          <p className="mt-0.5 text-sm text-amber-800">
            A sample customer, job and quote, marked SAMPLE. Remove them when you are ready to start for real.
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="shrink-0 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {busy ? 'Removing…' : 'Remove sample data'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-bold text-slate-900">Want to see how it works first?</p>
        <p className="mt-0.5 text-sm text-slate-500">
          Add a sample switchboard job with a priced quote. Try the test sheet and invoice on it, then remove it in one click.
          Nothing is sent to anyone.
        </p>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
      <button
        type="button"
        onClick={add}
        disabled={busy}
        className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
      >
        {busy ? 'Adding…' : 'Add a sample job'}
      </button>
    </div>
  )
}
