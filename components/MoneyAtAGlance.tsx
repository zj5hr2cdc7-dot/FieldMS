'use client'

/* ============================================================
   The numbers a small business owner actually checks: money owed to them,
   quotes waiting on a yes, this week's work, and repeat testing coming up.
   Office staff only (owner and manager); technicians don't see money.
   ============================================================ */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useAuthContext } from '@/context/AuthContext'
import { isOffice } from '@/lib/roles'

const fmt = (n: number) => n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })

interface Numbers {
  owing: number
  owingCount: number
  overdueCount: number
  quotesValue: number
  quotesCount: number
  jobsThisWeek: number
  testsDue: number
}

function weekBounds(now = new Date()) {
  const start = new Date(now)
  const day = (start.getDay() + 6) % 7 // Monday = 0
  start.setDate(start.getDate() - day)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return { from: iso(start), to: iso(end) }
}

export default function MoneyAtAGlance() {
  const { currentTenant, userRole } = useAuthContext()
  const [n, setN] = useState<Numbers | null>(null)
  const office = isOffice(userRole)

  useEffect(() => {
    if (!currentTenant || !office) return
    let cancelled = false
    const supabase = createClient()
    const tenantId = currentTenant.id
    const { from, to } = weekBounds()
    const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)

    Promise.all([
      supabase
        .from('job_invoices')
        .select('total_inc_gst, amount_paid, status')
        .eq('tenant_id', tenantId)
        .in('status', ['sent', 'viewed', 'part_paid', 'overdue']),
      supabase
        .from('estimates')
        .select('total, status, approved_at, declined_at')
        .eq('business_id', tenantId)
        .in('status', ['sent', 'viewed'])
        .is('approved_at', null)
        .is('declined_at', null),
      supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('due_date', from)
        .lte('due_date', `${to}T23:59:59`)
        .not('status', 'in', '(cancelled)'),
      supabase
        .from('assets')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .not('next_test_due', 'is', null)
        .lte('next_test_due', in30),
    ])
      .then(([inv, quotes, jobs, assets]) => {
        if (cancelled) return
        const invoices = inv.data ?? []
        const owingRows = invoices.map((i) => Math.max(0, Number(i.total_inc_gst) - Number(i.amount_paid))).filter((v) => v > 0.005)
        setN({
          owing: owingRows.reduce((s, v) => s + v, 0),
          owingCount: owingRows.length,
          overdueCount: invoices.filter((i) => i.status === 'overdue').length,
          quotesValue: (quotes.data ?? []).reduce((s, q) => s + Number(q.total ?? 0), 0),
          quotesCount: (quotes.data ?? []).length,
          jobsThisWeek: jobs.count ?? 0,
          testsDue: assets.count ?? 0,
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [currentTenant, office])

  if (!office || !n) return null

  const tiles = [
    {
      label: 'Owed to you',
      value: fmt(n.owing),
      sub: n.owingCount ? `${n.owingCount} unpaid invoice${n.owingCount === 1 ? '' : 's'}${n.overdueCount ? `, ${n.overdueCount} overdue` : ''}` : 'All paid',
      href: '/dashboard/jobs',
      alert: n.overdueCount > 0,
    },
    {
      label: 'Quotes waiting',
      value: String(n.quotesCount),
      sub: n.quotesCount ? `${fmt(n.quotesValue)} waiting on a yes` : 'None waiting',
      href: '/estimates',
      alert: false,
    },
    {
      label: "This week's jobs",
      value: String(n.jobsThisWeek),
      sub: 'Monday to Sunday',
      href: '/dashboard/schedule',
      alert: false,
    },
    {
      label: 'Testing due',
      value: String(n.testsDue),
      sub: 'Overdue or due within 30 days',
      href: '/dashboard/compliance',
      alert: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {tiles.map((t) => (
        <Link key={t.label} href={t.href} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t.label}</p>
          <p className={`mt-2 text-3xl font-bold ${t.alert ? 'text-red-600' : 'text-slate-900'}`}>{t.value}</p>
          <p className="mt-1 text-xs text-slate-500">{t.sub}</p>
        </Link>
      ))}
    </div>
  )
}
