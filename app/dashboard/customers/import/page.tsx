'use client'

/* ============================================================
   Import customers from a spreadsheet (CSV).

   Accepts the column names other job apps and spreadsheets commonly use, so
   a ServiceM8, Tradify or Excel export works without editing. Duplicates
   (same email, or same name when there is no email) are skipped by the
   database's unique match_key, so running an import twice is safe.
   ============================================================ */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { isOffice } from '@/lib/roles'
import { createClient } from '@/utils/supabase/client'
import { parseCsv, normaliseHeader } from '@/lib/csv'

type Field = 'name' | 'first' | 'last' | 'company' | 'email' | 'phone' | 'billing_address' | 'abn' | 'notes'

const ALIASES: Record<Field, string[]> = {
  name: ['name', 'customername', 'fullname', 'contactname', 'client', 'clientname'],
  first: ['firstname', 'givenname', 'first'],
  last: ['lastname', 'surname', 'familyname', 'last'],
  company: ['company', 'companyname', 'business', 'businessname', 'organisation', 'organization'],
  email: ['email', 'emailaddress', 'email1', 'contactemail'],
  phone: ['phone', 'mobile', 'phonenumber', 'mobilenumber', 'contactphone', 'cell', 'telephone'],
  billing_address: ['address', 'billingaddress', 'streetaddress', 'postaladdress', 'jobaddress', 'siteaddress'],
  abn: ['abn'],
  notes: ['notes', 'note', 'comments'],
}

interface Row {
  name: string
  email: string | null
  phone: string | null
  billing_address: string | null
  abn: string | null
  notes: string | null
}

function mapRows(table: string[][]): { rows: Row[]; matched: Field[]; skipped: number } {
  if (table.length < 2) return { rows: [], matched: [], skipped: 0 }
  const headers = table[0].map(normaliseHeader)
  const col = {} as Record<Field, number>
  const matched: Field[] = []
  for (const f of Object.keys(ALIASES) as Field[]) {
    const idx = headers.findIndex((h) => ALIASES[f].includes(h))
    col[f] = idx
    if (idx >= 0) matched.push(f)
  }
  const get = (r: string[], f: Field) => (col[f] >= 0 ? (r[col[f]] ?? '').trim() : '')
  let skipped = 0
  const rows: Row[] = []
  for (const r of table.slice(1)) {
    const full = [get(r, 'first'), get(r, 'last')].filter(Boolean).join(' ')
    const name = get(r, 'name') || full || get(r, 'company')
    if (!name) {
      skipped++
      continue
    }
    rows.push({
      name: name.slice(0, 200),
      email: get(r, 'email') || null,
      phone: get(r, 'phone') || null,
      billing_address: get(r, 'billing_address') || null,
      abn: get(r, 'abn') || null,
      notes: get(r, 'notes') || null,
    })
  }
  return { rows, matched, skipped }
}

export default function ImportCustomersPage() {
  const { currentTenant, userRole } = useAuthContext()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<{ added: number; total: number } | null>(null)
  const [error, setError] = useState('')

  const parsed = useMemo(() => mapRows(parseCsv(text)), [text])

  if (!currentTenant) return null
  if (!isOffice(userRole)) {
    return <p className="px-4 py-16 text-center text-sm text-slate-500">Only owners and managers can import customers.</p>
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setDone(null)
    setError('')
    setText(await file.text())
  }

  const runImport = async () => {
    setBusy(true)
    setError('')
    const supabase = createClient()
    let added = 0
    try {
      for (let i = 0; i < parsed.rows.length; i += 200) {
        const batch = parsed.rows.slice(i, i + 200).map((r) => ({ tenant_id: currentTenant.id, ...r }))
        const { data, error: err } = await supabase
          .from('customers')
          .upsert(batch, { onConflict: 'tenant_id,match_key', ignoreDuplicates: true })
          .select('id')
        if (err) throw err
        added += data?.length ?? 0
      }
      setDone({ added, total: parsed.rows.length })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed. Nothing after the error was imported.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link href="/dashboard/customers" className="text-sm text-slate-500 hover:text-slate-700">← Customers</Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Import customers</h1>
        <p className="mt-1 text-slate-500">
          Export your customer list from your old software or spreadsheet as a CSV file, then drop it in here.
          Columns like Name, Email, Phone, Address and ABN are picked up automatically.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-semibold text-slate-800">CSV file</label>
        <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="mt-2 block text-sm" />
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-slate-500">Or paste the CSV text</summary>
          <textarea
            value={text}
            onChange={(e) => {
              setDone(null)
              setText(e.target.value)
            }}
            rows={6}
            placeholder={'Name,Email,Phone,Address\nJane Smith,jane@example.com,0400 000 000,"1 Main St, Southport QLD"'}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-mono text-xs"
          />
        </details>
      </div>

      {text && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {parsed.rows.length === 0 ? (
            <p className="text-sm text-amber-700">
              No customers found. The first row must be column headings, and there needs to be a Name (or First name
              and Last name, or Company) column.
            </p>
          ) : (
            <>
              <p className="text-sm text-slate-700">
                <span className="font-semibold">{parsed.rows.length}</span> customers ready to import.
                {parsed.skipped > 0 && ` ${parsed.skipped} rows without a name will be skipped.`} Columns found:{' '}
                {parsed.matched.join(', ').replace('billing_address', 'address')}.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase text-slate-500">
                    <tr><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Email</th><th className="py-2 pr-3">Phone</th><th className="py-2">Address</th></tr>
                  </thead>
                  <tbody>
                    {parsed.rows.slice(0, 8).map((r, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="py-2 pr-3">{r.name}</td>
                        <td className="py-2 pr-3 text-slate-600">{r.email}</td>
                        <td className="py-2 pr-3 text-slate-600">{r.phone}</td>
                        <td className="py-2 text-slate-600">{r.billing_address}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.rows.length > 8 && <p className="mt-2 text-xs text-slate-400">and {parsed.rows.length - 8} more</p>}
              </div>
              {done ? (
                <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                  Imported {done.added} new customers.{' '}
                  {done.total - done.added > 0 && `${done.total - done.added} were already in FieldMS and were left as they are. `}
                  <Link href="/dashboard/customers" className="font-semibold underline">View customers</Link>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={runImport}
                  className="mt-5 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  {busy ? 'Importing…' : `Import ${parsed.rows.length} customers`}
                </button>
              )}
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
