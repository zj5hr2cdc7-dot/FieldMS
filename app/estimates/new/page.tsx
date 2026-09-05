'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { createEstimate, NewEstimateItem } from '@/lib/estimate'
import MaterialPicker, { type PickedMaterial } from '@/components/MaterialPicker'

type LineItem = NewEstimateItem & { id: string }

const createEmptyItem = (): LineItem => ({
  id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
  name: '',
  quantity: 1,
  unit_price: 0,
  total: 0,
})

const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400'

export default function NewEstimatePage() {
  const router = useRouter()
  const { session, currentTenant, loading } = useAuthContext()
  const [customerName, setCustomerName] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyItem()])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !session) router.push('/login')
  }, [loading, session, router])

  const total = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [lineItems]
  )

  const updateLineItem = (id: string, field: keyof NewEstimateItem, value: string | number) => {
    setLineItems((current) =>
      current.map((item) => {
        if (item.id !== id) return item
        const quantity = field === 'quantity' ? Number(value) : item.quantity
        const unit_price = field === 'unit_price' ? Number(value) : item.unit_price
        const name = field === 'name' ? String(value) : item.name
        return { ...item, quantity, unit_price, name, total: quantity * unit_price }
      })
    )
  }

  const addLineItem = () => setLineItems((c) => [...c, createEmptyItem()])
  const removeLineItem = (id: string) => setLineItems((c) => c.filter((item) => item.id !== id))

  const addMaterial = (material: PickedMaterial) => {
    setLineItems((current) => {
      const existing = current.find((item) => item.name === material.name)
      if (existing) {
        return current.map((item) =>
          item.id === existing.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.unit_price }
            : item
        )
      }
      // Drop untouched placeholder rows when adding a picked material
      const kept = current.filter((item) => item.name.trim() !== '' || item.unit_price > 0)
      return [
        ...kept,
        {
          id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
          name: material.name,
          quantity: 1,
          unit_price: material.unitPrice,
          total: material.unitPrice,
        },
      ]
    })
    setMessage(`Added at live price: ${material.sourceLabel}`)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (!currentTenant) { setError('No workspace selected.'); return }
    if (!customerName.trim()) { setError('Customer name is required.'); return }

    const validItems = lineItems.map((item) => ({
      name: item.name.trim(),
      quantity: Number(item.quantity) || 0,
      unit_price: Number(item.unit_price) || 0,
      total: Number(item.quantity) * Number(item.unit_price),
    }))

    if (validItems.some((item) => !item.name)) { setError('Please enter a name for every line item.'); return }
    if (validItems.some((item) => item.quantity <= 0 || item.unit_price < 0)) {
      setError('Quantity must be at least 1 and unit price cannot be negative.')
      return
    }

    try {
      setSubmitting(true)
      await createEstimate(currentTenant.id, customerName.trim(), total, validItems)
      setMessage('Estimate created successfully.')
      setCustomerName('')
      setLineItems([createEmptyItem()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save estimate.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/estimates" className="text-sm text-slate-500 hover:text-slate-700 transition-colors">
          ← Estimates
        </Link>
        <span className="text-slate-300">/</span>
        <h1 className="text-3xl font-bold text-slate-900">New estimate</h1>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Customer */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Customer name *</label>
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Acme Corp"
            className={inputCls}
          />
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Line items</h2>
              <p className="text-sm text-slate-500 mt-0.5">Add items, quantities, and unit prices</p>
            </div>
            <button
              type="button"
              onClick={addLineItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-semibold transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14"/><path d="M12 5v14"/>
              </svg>
              Add item
            </button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-700">Item {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
                    className="text-xs text-red-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="lg:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                    <input
                      value={item.name}
                      onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                      placeholder="Item name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Unit price (A$)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(item.id, 'unit_price', Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="mt-2 text-right text-sm font-semibold text-slate-700">
                  Subtotal: A${item.total.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total + submit */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Estimate total</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">A${total.toFixed(2)}</p>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-brand hover:bg-brand-dark text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save estimate'}
          </button>
        </div>

        {/* Live-priced material lookup */}
        {currentTenant && (
          <MaterialPicker
            tenantId={currentTenant.id}
            onAdd={addMaterial}
            title="Add materials at live prices"
            subtitle="Straight from the pricing engine — your trade price, market median, or override, always current."
          />
        )}
      </form>
    </div>
  )
}
