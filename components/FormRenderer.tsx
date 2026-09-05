'use client'

/**
 * Renders a form schema for filling (editable) or as a read-only document.
 * Handles conditional visibility, calculated fields, tables/repeating
 * sections, pass/fail toggles and photo placeholders.
 */

import type { FormField, FormFieldValue, FormTemplateSchema } from '@/types/forms'
import { evaluateFormula, isFieldVisible } from '@/lib/forms'

type Data = Record<string, FormFieldValue>

interface Props {
  schema: FormTemplateSchema
  data: Data
  onChange?: (fieldId: string, value: FormFieldValue) => void
  readOnly?: boolean
  accentColor?: string
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-slate-50 disabled:text-slate-600'

export default function FormRenderer({ schema, data, onChange, readOnly = false, accentColor = '#4a9c4a' }: Props) {
  const set = (fieldId: string, value: FormFieldValue) => {
    if (!readOnly && onChange) onChange(fieldId, value)
  }

  return (
    <div className="space-y-5">
      {schema.fields.map((field) => {
        if (!isFieldVisible(field, data)) return null
        return (
          <FieldBlock
            key={field.id}
            field={field}
            data={data}
            set={set}
            readOnly={readOnly}
            accentColor={accentColor}
          />
        )
      })}
    </div>
  )
}

function FieldBlock({
  field,
  data,
  set,
  readOnly,
  accentColor,
}: {
  field: FormField
  data: Data
  set: (id: string, v: FormFieldValue) => void
  readOnly: boolean
  accentColor: string
}) {
  const value = data[field.id]

  switch (field.type) {
    case 'heading':
      return <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">{field.label}</h2>
    case 'paragraph':
      return <p className="text-sm text-slate-600">{field.label}</p>
    case 'divider':
      return <hr className="border-slate-200" />

    case 'text':
    case 'email':
    case 'phone':
    case 'address':
      return (
        <Labeled field={field}>
          <input
            type={field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            disabled={readOnly}
            onChange={(e) => set(field.id, e.target.value)}
            className={inputCls}
          />
        </Labeled>
      )

    case 'textarea':
      return (
        <Labeled field={field}>
          <textarea
            value={String(value ?? '')}
            placeholder={field.placeholder}
            disabled={readOnly}
            rows={3}
            onChange={(e) => set(field.id, e.target.value)}
            className={inputCls}
          />
        </Labeled>
      )

    case 'number':
    case 'currency':
      return (
        <Labeled field={field}>
          <div className="relative">
            {field.type === 'currency' && (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">A$</span>
            )}
            <input
              type="number"
              step="any"
              value={value === null || value === undefined ? '' : String(value)}
              disabled={readOnly}
              onChange={(e) => set(field.id, e.target.value === '' ? null : Number(e.target.value))}
              className={`${inputCls} ${field.type === 'currency' ? 'pl-9' : ''}`}
            />
          </div>
        </Labeled>
      )

    case 'date':
      return (
        <Labeled field={field}>
          <input type="date" value={String(value ?? '')} disabled={readOnly} onChange={(e) => set(field.id, e.target.value)} className={inputCls} />
        </Labeled>
      )
    case 'time':
      return (
        <Labeled field={field}>
          <input type="time" value={String(value ?? '')} disabled={readOnly} onChange={(e) => set(field.id, e.target.value)} className={inputCls} />
        </Labeled>
      )

    case 'select':
      return (
        <Labeled field={field}>
          <select value={String(value ?? '')} disabled={readOnly} onChange={(e) => set(field.id, e.target.value)} className={inputCls}>
            <option value="">Select…</option>
            {(field.options || []).map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Labeled>
      )

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : []
      return (
        <Labeled field={field}>
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map((o) => {
              const on = selected.includes(o)
              return (
                <button
                  key={o}
                  type="button"
                  disabled={readOnly}
                  onClick={() => set(field.id, on ? selected.filter((s) => s !== o) : [...selected, o])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-70 ${
                    on ? 'text-white border-transparent' : 'bg-white border-slate-300 text-slate-600'
                  }`}
                  style={on ? { backgroundColor: accentColor } : undefined}
                >
                  {o}
                </button>
              )
            })}
          </div>
        </Labeled>
      )
    }

    case 'radio':
      return (
        <Labeled field={field}>
          <div className="space-y-1.5">
            {(field.options || []).map((o) => (
              <label key={o} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="radio" checked={value === o} disabled={readOnly} onChange={() => set(field.id, o)} className="accent-brand" />
                {o}
              </label>
            ))}
          </div>
        </Labeled>
      )

    case 'checkbox':
    case 'toggle':
      return (
        <label className="flex items-center gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(value)}
            disabled={readOnly}
            onChange={(e) => set(field.id, e.target.checked)}
            className="h-4 w-4 accent-brand"
          />
          <span>
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
        </label>
      )

    case 'passfail': {
      const v = value === true ? true : value === false ? false : null
      return (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="text-sm text-slate-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </span>
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              disabled={readOnly}
              onClick={() => set(field.id, v === true ? null : true)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors disabled:opacity-70 ${
                v === true ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-slate-300 text-slate-500'
              }`}
            >
              PASS
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={() => set(field.id, v === false ? null : false)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold border transition-colors disabled:opacity-70 ${
                v === false ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-slate-300 text-slate-500'
              }`}
            >
              FAIL
            </button>
          </div>
        </div>
      )
    }

    case 'table': {
      const rows = (Array.isArray(value) ? value : []) as Record<string, string>[]
      const columns = field.columns || []
      const setCell = (rowIndex: number, key: string, cellValue: string) => {
        const next = rows.map((r, i) => (i === rowIndex ? { ...r, [key]: cellValue } : r))
        set(field.id, next)
      }
      return (
        <Labeled field={field}>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-2.5 py-2 font-semibold text-slate-600 whitespace-nowrap">{c.label}</th>
                  ))}
                  {!readOnly && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {columns.map((c) => (
                      <td key={c.key} className="px-1.5 py-1">
                        {c.type === 'passfail' ? (
                          <select
                            value={row[c.key] ?? ''}
                            disabled={readOnly}
                            onChange={(e) => setCell(i, c.key, e.target.value)}
                            className="w-full rounded-md border border-slate-200 px-1.5 py-1 text-xs disabled:bg-slate-50"
                          >
                            <option value="">—</option>
                            <option value="pass">Pass</option>
                            <option value="fail">Fail</option>
                            <option value="na">N/A</option>
                          </select>
                        ) : (
                          <input
                            type={c.type === 'number' ? 'number' : 'text'}
                            value={row[c.key] ?? ''}
                            disabled={readOnly}
                            onChange={(e) => setCell(i, c.key, e.target.value)}
                            className="w-full min-w-20 rounded-md border border-slate-200 px-1.5 py-1 text-xs disabled:bg-slate-50"
                          />
                        )}
                      </td>
                    ))}
                    {!readOnly && (
                      <td className="px-1">
                        <button type="button" onClick={() => set(field.id, rows.filter((_, ri) => ri !== i))} className="text-red-400 hover:text-red-600 text-sm">×</button>
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={columns.length + 1} className="px-3 py-3 text-center text-slate-400">No rows</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={() => set(field.id, [...rows, Object.fromEntries(columns.map((c) => [c.key, '']))])}
              className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              + Add row
            </button>
          )}
        </Labeled>
      )
    }

    case 'calculated': {
      const result = field.formula ? evaluateFormula(field.formula, data) : null
      return (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="text-sm text-slate-700">{field.label}</span>
          <span className="text-sm font-bold text-slate-900">{result === null ? '—' : result}</span>
        </div>
      )
    }

    case 'gps': {
      const v = typeof value === 'string' ? value : null
      return (
        <Labeled field={field}>
          <div className="flex gap-2">
            <input value={v ?? ''} readOnly placeholder="lat, lng" className={inputCls} />
            {!readOnly && (
              <button
                type="button"
                onClick={() => {
                  navigator.geolocation?.getCurrentPosition((p) =>
                    set(field.id, `${p.coords.latitude.toFixed(6)}, ${p.coords.longitude.toFixed(6)}`)
                  )
                }}
                className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                📍 Capture
              </button>
            )}
          </div>
        </Labeled>
      )
    }

    case 'photo':
    case 'file': {
      // Photos attach via the job photo library; here we record references/notes.
      const v = String(value ?? '')
      return (
        <Labeled field={field}>
          <input
            value={v}
            disabled={readOnly}
            onChange={(e) => set(field.id, e.target.value)}
            placeholder="Photos are attached from the job's photo library — note references here"
            className={inputCls}
          />
        </Labeled>
      )
    }

    case 'signature':
    case 'initials':
      // Signatures are captured in the signing panel (multiple roles per doc)
      return (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          ✍️ {field.label} — captured in the signature panel below
        </div>
      )

    default:
      return null
  }
}

function Labeled({ field, children }: { field: FormField; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {field.helpText && <p className="mt-1 text-xs text-slate-400">{field.helpText}</p>}
    </div>
  )
}
