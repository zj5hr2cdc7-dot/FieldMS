'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuthContext } from '@/context/AuthContext'
import { getTenant, updateTenant } from '@/lib/auth'
import type { Tenant } from '@/types/database'

const GOOGLE_REVIEW_HINT = 'https://g.page/r/YOUR_PLACE_ID/review'

export default function ReviewsPage() {
  const { currentTenant } = useAuthContext()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [url, setUrl] = useState('')
  const [inputUrl, setInputUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!currentTenant) return
    const t = await getTenant(currentTenant.id)
    if (!t) return
    setTenant(t)
    const saved = t.google_reviews_url ?? ''
    setUrl(saved)
    setInputUrl(saved)
  }, [currentTenant])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!currentTenant || !inputUrl.trim()) return
    setSaving(true)
    try {
      await updateTenant(currentTenant.id, { google_reviews_url: inputUrl.trim() })
      setUrl(inputUrl.trim())
      setSaveMsg('Saved.')
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
      window.setTimeout(() => setSaveMsg(''), 3000)
    }
  }

  const handleDownload = () => {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    // Create a padded version for printing/sharing
    const padded = document.createElement('canvas')
    const pad = 40
    padded.width = canvas.width + pad * 2
    padded.height = canvas.height + pad * 2
    const ctx = padded.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, padded.width, padded.height)
    ctx.drawImage(canvas, pad, pad)
    const link = document.createElement('a')
    link.download = `${tenant?.name ?? 'review'}-qr-code.png`
    link.href = padded.toDataURL('image/png')
    link.click()
  }

  const handleCopyUrl = () => {
    if (!url) return
    navigator.clipboard?.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handlePrint = () => window.print()

  const isValidUrl = (u: string) => {
    try { new URL(u); return true } catch { return false }
  }

  const hasUrl = url && isValidUrl(url)

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Google Reviews QR</h1>
        <p className="text-slate-500 text-sm mt-1">
          Generate a QR code your clients can scan to leave a Google review — post it on-site, add it to invoices, or share it digitally.
        </p>
      </div>

      {/* URL setup */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 mb-0.5">Your Google Reviews link</h2>
          <p className="text-xs text-slate-500">
            Find this in Google Business Profile → Get more reviews → Share review form.
          </p>
        </div>

        <div className="flex gap-3">
          <input
            type="url"
            value={inputUrl}
            onChange={e => setInputUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            placeholder={GOOGLE_REVIEW_HINT}
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400"
          />
          <button
            onClick={handleSave}
            disabled={saving || !inputUrl.trim()}
            className="rounded-lg bg-brand hover:bg-brand-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? 'Saving…' : 'Save & generate'}
          </button>
        </div>

        {saveMsg && (
          <p className={`text-sm ${saveMsg.includes('failed') || saveMsg.includes('Failed') ? 'text-red-500' : 'text-brand-dark'}`}>
            {saveMsg}
          </p>
        )}

        {/* How to find the link */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1.5 list-none">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-open:rotate-90">
              <path d="M9 18l6-6-6-6"/>
            </svg>
            How to find your Google Reviews link
          </summary>
          <ol className="mt-3 space-y-1.5 text-xs text-slate-500 list-decimal list-inside pl-1">
            <li>Go to <strong className="text-slate-700">business.google.com</strong> and sign in</li>
            <li>Select your business profile</li>
            <li>Click <strong className="text-slate-700">Ask for reviews</strong> (or &quot;Get more reviews&quot;)</li>
            <li>Copy the short link shown — it looks like <code className="bg-slate-100 px-1 rounded-md">g.page/r/…/review</code></li>
            <li>Paste it above and click Save</li>
          </ol>
        </details>
      </div>

      {/* QR code display */}
      {hasUrl ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {/* Print header — only shown when printing */}
          <div className="hidden print:block text-center pt-10 pb-4">
            <p className="text-2xl font-bold text-slate-900">{tenant?.name}</p>
            <p className="text-slate-500 mt-1">Scan to leave us a Google review</p>
          </div>

          <div className="p-8 flex flex-col items-center gap-6">
            {/* QR */}
            <div ref={qrRef} className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
              <QRCodeCanvas
                value={url}
                size={220}
                level="H"
                marginSize={2}
                imageSettings={{
                  src: '/fieldms-icon.png',
                  height: 44,
                  width: 44,
                  excavate: true,
                }}
              />
            </div>

            <div className="text-center">
              <p className="font-semibold text-slate-900 text-lg">Scan to leave a review</p>
              <p className="text-sm text-slate-500 mt-0.5">{tenant?.name}</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-center print:hidden">
              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-2 rounded-lg bg-ink hover:bg-ink-light px-4 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download PNG
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                </svg>
                Print
              </button>
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                {copied ? 'Copied!' : 'Copy link'}
              </button>
            </div>

            {/* URL shown small */}
            <p className="text-xs text-slate-400 break-all text-center max-w-xs print:hidden">{url}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              <path d="M14 14h.01M18 14h.01M14 18h.01M18 18h.01M14 21h.01M18 21h.01M21 14h.01M21 18h.01"/>
            </svg>
          </div>
          <h3 className="font-semibold text-slate-900">No link saved yet</h3>
          <p className="text-sm text-slate-500 mt-1">Paste your Google Reviews link above to generate the QR code.</p>
        </div>
      )}

      {/* Usage tips */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">How to use it</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          {[
            'Download the PNG and add it to your invoices or quote documents',
            'Print and laminate it — leave one with every client after a job',
            'Add it to your email signature or send as a follow-up text',
            'Display it in your van or on site signage',
          ].map(tip => (
            <li key={tip} className="flex items-start gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a9c4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Print isolation styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:hidden { display: none !important; }
          main, [data-nextjs-scroll-focus-boundary], body { display: block !important; }
        }
      `}</style>
    </div>
  )
}
