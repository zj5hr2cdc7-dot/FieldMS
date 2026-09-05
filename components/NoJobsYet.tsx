import Link from 'next/link'

/**
 * Empty state for pages that hang off a job.
 *
 * Test sheets, site reports and job plans all start with "pick a job". When a
 * workspace has no jobs, those pages rendered a dropdown containing only its
 * own placeholder and nothing else — which reads as broken software rather
 * than an empty account, and is exactly the sort of thing that loses a trial
 * user on day one. Say what's happening and give them the next step.
 */
export default function NoJobsYet({
  thing,
  why,
}: {
  /** What they were trying to make, e.g. "test sheet". */
  thing: string
  /** One line on why a job is needed first. */
  why: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-slate-400"
        >
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <path d="M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2z" />
        </svg>
      </div>
      <h3 className="mt-4 font-bold text-slate-900">No jobs yet</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-6 text-slate-500">
        {why} Create a job first, then come back and the {thing} will attach to it.
      </p>
      <Link href="/dashboard/jobs" className="btn btn-primary mt-6 inline-block">
        Create a job
      </Link>
    </div>
  )
}
