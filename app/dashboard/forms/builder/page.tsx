'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getTemplate, createTemplate, updateTemplate } from '@/lib/forms'
import FormRenderer from '@/components/FormRenderer'
import type { FormField, FormFieldType, FormTemplate, SignatureRole } from '@/types/forms'

// ── Component palette ───────────────────────────────────────────────────────

const PALETTE: { type: FormFieldType; label: string; icon: string }[] = [
  { type: 'heading', label: 'Heading', icon: 'H' },
  { type: 'paragraph', label: 'Paragraph', icon: '¶' },
  { type: 'divider', label: 'Divider', icon: '—' },
  { type: 'text', label: 'Text', icon: 'Aa' },
  { type: 'textarea', label: 'Long text', icon: '☰' },
  { type: 'number', label: 'Number', icon: '#' },
  { type: 'currency', label: 'Currency', icon: '$' },
  { type: 'email', label: 'Email', icon: '@' },
  { type: 'phone', label: 'Phone', icon: '☎' },
  { type: 'address', label: 'Address', icon: '⌂' },
  { type: 'date', label: 'Date', icon: '📅' },
  { type: 'time', label: 'Time', icon: '🕐' },
  { type: 'select', label: 'Dropdown', icon: '▾' },
  { type: 'multiselect', label: 'Multi-select', icon: '≣' },
  { type: 'radio', label: 'Radio', icon: '◉' },
  { type: 'checkbox', label: 'Checkbox', icon: '☑' },
  { type: 'toggle', label: 'Toggle', icon: '⏻' },
  { type: 'passfail', label: 'Pass / Fail', icon: '✓✗' },
  { type: 'table', label: 'Table / rows', icon: '⊞' },
  { type: 'photo', label: 'Photos', icon: '📷' },
  { type: 'gps', label: 'GPS location', icon: '📍' },
  { type: 'calculated', label: 'Calculated', icon: '=' },
  { type: 'signature', label: 'Signature', icon: '✍' },
  { type: 'initials', label: 'Initials', icon: 'JG' },
]

const AUTOFILL_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'No autofill' },
  { value: 'job.title', label: 'Job title' },
  { value: 'job.number', label: 'Job number' },
  { value: 'job.description', label: 'Job description' },
  { value: 'job.customer_name', label: 'Customer name' },
  { value: 'job.customer_phone', label: 'Customer phone' },
  { value: 'job.customer_email', label: 'Customer email' },
  { value: 'job.customer_address', label: 'Site address' },
  { value: 'job.due_date', label: 'Job date' },
  { value: 'business.name', label: 'Business name' },
  { value: 'business.trading_name', label: 'Trading name' },
  { value: 'business.abn', label: 'ABN' },
  { value: 'business.license', label: 'Licence number' },
  { value: 'business.electrical_license', label: 'Electrical licence' },
  { value: 'technician.name', label: 'Technician name' },
  { value: 'technician.email', label: 'Technician email' },
  { value: 'date.today', label: "Today's date" },
  { value: 'time.now', label: 'Current time' },
  { value: 'gps.current', label: 'GPS position' },
]

const newField = (type: FormFieldType): FormField => ({
  id: `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
  type,
  label:
    type === 'heading' ? 'Section heading'
    : type === 'paragraph' ? 'Descriptive text shown on the form.'
    : type === 'divider' ? ''
    : type === 'signature' ? 'Signature'
    : type === 'passfail' ? 'Check item'
    : 'New field',
  ...(type === 'select' || type === 'radio' || type === 'multiselect' ? { options: ['Option 1', 'Option 2'] } : {}),
  ...(type === 'table' ? { columns: [{ key: 'col1', label: 'Column 1', type: 'text' as const }] } : {}),
  ...(type === 'signature' ? { signatureRole: 'technician' as SignatureRole, required: true } : {}),
})

function BuilderInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { currentTenant, session } = useAuthContext()
  const user = session?.user ?? null

  const [template, setTemplate] = useState<FormTemplate | null>(null)
  const [name, setName] = useState('Untitled form')
  const [category, setCategory] = useState('general')
  const [docPrefix, setDocPrefix] = useState('DOC')
  const [autoOnComplete, setAutoOnComplete] = useState(false)
  const [fields, setFields] = useState<FormField[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  const templateId = params.get('template')

  useEffect(() => {
    if (!templateId) return
    getTemplate(templateId).then((t) => {
      if (!t) return
      setTemplate(t)
      setName(t.name)
      setCategory(t.category)
      setDocPrefix(t.doc_prefix)
      setAutoOnComplete(t.auto_on_job_complete)
      setFields(t.schema.fields)
    }).catch((err) => setError(err instanceof Error ? err.message : 'Failed to load template'))
  }, [templateId])

  const selected = fields.find((f) => f.id === selectedId) ?? null

  const patchField = (id: string, updates: Partial<FormField>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)))

  const addField = (type: FormFieldType, atIndex?: number) => {
    const field = newField(type)
    setFields((prev) => {
      const next = [...prev]
      next.splice(atIndex ?? prev.length, 0, field)
      return next
    })
    setSelectedId(field.id)
  }

  const moveField = (from: number, to: number) => {
    if (to < 0 || to >= fields.length) return
    setFields((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const handleSave = async () => {
    if (!currentTenant || !user) return
    setSaving(true); setError(null)
    try {
      if (template) {
        const updated = await updateTemplate(template.id, {
          name, category: category as FormTemplate['category'], doc_prefix: docPrefix,
          schema: { fields }, auto_on_job_complete: autoOnComplete,
        })
        setTemplate(updated)
      } else {
        const created = await createTemplate(currentTenant.id, user.id, {
          name, category, doc_prefix: docPrefix, schema: { fields }, auto_on_job_complete: autoOnComplete,
        })
        setTemplate(created)
        router.replace(`/dashboard/forms/builder?template=${created.id}`)
      }
      setSuccess('Template saved.')
      window.setTimeout(() => setSuccess(null), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template.')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'
  const smallInput = 'w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-brand'

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <button type="button" onClick={() => router.push('/dashboard/forms')} className="text-sm font-medium text-brand-dark hover:text-brand">← Forms</button>
          <input value={name} onChange={(e) => setName(e.target.value)} className="text-lg font-bold text-slate-900 border-b-2 border-transparent focus:border-brand outline-none bg-transparent min-w-64" />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs">
            <option value="electrical">Electrical</option>
            <option value="safety">Safety</option>
            <option value="general">General</option>
            <option value="hr">HR</option>
            <option value="assets">Assets</option>
          </select>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            Doc prefix
            <input value={docPrefix} onChange={(e) => setDocPrefix(e.target.value.toUpperCase().slice(0, 6))} className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-mono" />
          </div>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input type="checkbox" checked={autoOnComplete} onChange={(e) => setAutoOnComplete(e.target.checked)} className="accent-brand" />
            Auto-create when job completes
          </label>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setPreview((v) => !v)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim()} className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
            {saving ? 'Saving…' : 'Save template'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {success && <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}

      {preview ? (
        <div className="max-w-2xl mx-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <FormRenderer schema={{ fields }} data={{}} readOnly={false} onChange={() => {}} />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[220px_1fr_280px]">
          {/* Palette */}
          <aside className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm h-fit lg:sticky lg:top-20">
            <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Components</p>
            <div className="grid grid-cols-2 gap-1.5">
              {PALETTE.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('palette-type', item.type)}
                  onClick={() => addField(item.type)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2.5 text-xs font-medium text-slate-600 hover:border-brand hover:bg-green-50 cursor-grab active:cursor-grabbing transition-colors"
                  title="Click or drag onto the canvas"
                >
                  <span className="text-sm leading-none">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <p className="px-1 pt-2 text-xs text-slate-400">Click or drag to add</p>
          </aside>

          {/* Canvas */}
          <div
            className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-4 min-h-[400px]"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const type = e.dataTransfer.getData('palette-type') as FormFieldType
              if (type) addField(type)
            }}
          >
            {fields.length === 0 && (
              <div className="flex h-64 items-center justify-center text-sm text-slate-400">
                Drag components here, or click one in the palette
              </div>
            )}
            <div className="space-y-2">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const type = e.dataTransfer.getData('palette-type') as FormFieldType
                    if (type) { addField(type, index); return }
                    if (dragIndex !== null && dragIndex !== index) moveField(dragIndex, index)
                    setDragIndex(null)
                  }}
                  onClick={() => setSelectedId(field.id)}
                  className={`group flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                    selectedId === field.id ? 'border-brand bg-green-50/50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className="cursor-grab text-slate-300 group-hover:text-slate-400 select-none">⠿</span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${field.type === 'heading' ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {field.label || <span className="italic text-slate-400">({field.type})</span>}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      {field.type}{field.autofill ? ` · autofill: ${field.autofill}` : ''}{field.condition ? ' · conditional' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveField(index, index - 1) }} className="rounded-md px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-200">↑</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveField(index, index + 1) }} className="rounded-md px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-200">↓</button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFields((prev) => prev.filter((f) => f.id !== field.id))
                        if (selectedId === field.id) setSelectedId(null)
                      }}
                      className="rounded-md px-1.5 py-0.5 text-xs text-red-500 hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Property panel */}
          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm h-fit lg:sticky lg:top-20">
            <p className="pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Field settings</p>
            {!selected ? (
              <p className="text-sm text-slate-400">Select a field on the canvas.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Label</label>
                  <input value={selected.label} onChange={(e) => patchField(selected.id, { label: e.target.value })} className={inputCls} />
                </div>
                {!['heading', 'paragraph', 'divider', 'calculated', 'signature', 'initials'].includes(selected.type) && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Placeholder</label>
                      <input value={selected.placeholder ?? ''} onChange={(e) => patchField(selected.id, { placeholder: e.target.value })} className={inputCls} />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={Boolean(selected.required)} onChange={(e) => patchField(selected.id, { required: e.target.checked })} className="accent-brand" />
                      Required
                    </label>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Smart auto-fill</label>
                      <select
                        value={selected.autofill ?? ''}
                        onChange={(e) => patchField(selected.id, { autofill: (e.target.value || undefined) as FormField['autofill'] })}
                        className={inputCls}
                      >
                        {AUTOFILL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </>
                )}

                {(selected.type === 'select' || selected.type === 'radio' || selected.type === 'multiselect') && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Options (one per line)</label>
                    <textarea
                      value={(selected.options || []).join('\n')}
                      onChange={(e) => patchField(selected.id, { options: e.target.value.split('\n').filter(Boolean) })}
                      rows={4}
                      className={inputCls}
                    />
                  </div>
                )}

                {selected.type === 'table' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Columns</label>
                    <div className="space-y-1.5">
                      {(selected.columns || []).map((col, ci) => (
                        <div key={ci} className="flex gap-1.5">
                          <input
                            value={col.label}
                            onChange={(e) => {
                              const columns = [...(selected.columns || [])]
                              columns[ci] = { ...col, label: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') || col.key }
                              patchField(selected.id, { columns })
                            }}
                            className={smallInput}
                          />
                          <select
                            value={col.type}
                            onChange={(e) => {
                              const columns = [...(selected.columns || [])]
                              columns[ci] = { ...col, type: e.target.value as 'text' | 'number' | 'passfail' }
                              patchField(selected.id, { columns })
                            }}
                            className="rounded-lg border border-slate-300 px-1 py-1.5 text-xs"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="passfail">Pass/Fail</option>
                          </select>
                          <button type="button" onClick={() => patchField(selected.id, { columns: (selected.columns || []).filter((_, i) => i !== ci) })} className="text-red-400 hover:text-red-600 text-sm px-1">×</button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => patchField(selected.id, { columns: [...(selected.columns || []), { key: `col${(selected.columns?.length ?? 0) + 1}`, label: `Column ${(selected.columns?.length ?? 0) + 1}`, type: 'text' }] })}
                        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        + Add column
                      </button>
                    </div>
                  </div>
                )}

                {selected.type === 'calculated' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Formula (use field IDs)</label>
                    <input value={selected.formula ?? ''} onChange={(e) => patchField(selected.id, { formula: e.target.value })} placeholder="e.g. qty * rate * 1.1" className={inputCls} />
                    <p className="mt-1 text-xs text-slate-400">Field ID of this field: <code>{selected.id}</code></p>
                  </div>
                )}

                {(selected.type === 'signature' || selected.type === 'initials') && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Who signs</label>
                    <select value={selected.signatureRole ?? 'technician'} onChange={(e) => patchField(selected.id, { signatureRole: e.target.value as SignatureRole })} className={inputCls}>
                      <option value="technician">Technician</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="customer">Customer</option>
                      <option value="property_owner">Property owner</option>
                      <option value="site_manager">Site manager</option>
                    </select>
                  </div>
                )}

                {/* Conditional logic */}
                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-xs text-slate-500 mb-1">Show only when… (conditional logic)</label>
                  <select
                    value={selected.condition?.fieldId ?? ''}
                    onChange={(e) => {
                      const fieldId = e.target.value
                      patchField(selected.id, { condition: fieldId ? { fieldId, equals: true } : undefined })
                    }}
                    className={inputCls}
                  >
                    <option value="">Always visible</option>
                    {fields
                      .filter((f) => f.id !== selected.id && ['checkbox', 'toggle', 'passfail', 'select', 'radio'].includes(f.type))
                      .map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  {selected.condition && (
                    <input
                      value={String(selected.condition.equals)}
                      onChange={(e) => {
                        const raw = e.target.value
                        const equals = raw === 'true' ? true : raw === 'false' ? false : raw
                        patchField(selected.id, { condition: { ...selected.condition!, equals } })
                      }}
                      placeholder="equals value (true/false/text)"
                      className={`${inputCls} mt-1.5`}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-1">Help text</label>
                  <input value={selected.helpText ?? ''} onChange={(e) => patchField(selected.id, { helpText: e.target.value })} className={inputCls} />
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center text-slate-400">Loading builder…</div>}>
      <BuilderInner />
    </Suspense>
  )
}
