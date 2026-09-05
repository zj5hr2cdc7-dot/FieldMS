'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import {
  getBranding,
  upsertBranding,
  uploadBrandingAsset,
  getBrandingAssetUrl,
  DEFAULT_BRANDING,
  type BrandingAssetKind,
} from '@/lib/branding'
import type { TenantBranding } from '@/types/forms'

type Draft = Omit<TenantBranding, 'tenant_id' | 'created_at' | 'updated_at'>

const FONTS = ['Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Source Sans Pro', 'Georgia', 'Helvetica']

const ASSETS: { kind: BrandingAssetKind; label: string; hint: string }[] = [
  { kind: 'logo', label: 'Logo', hint: 'Shown on every document header' },
  { kind: 'watermark', label: 'Watermark', hint: 'Faint background on PDFs (optional)' },
  { kind: 'header_image', label: 'Header image', hint: 'Full-width banner (optional)' },
  { kind: 'footer_image', label: 'Footer image', hint: 'Full-width footer strip (optional)' },
  { kind: 'stamp', label: 'Company stamp', hint: 'Shown beside signatures (optional)' },
]

export default function BrandingPage() {
  const { currentTenant } = useAuthContext()
  const [draft, setDraft] = useState<Draft>(DEFAULT_BRANDING)
  const [assetUrls, setAssetUrls] = useState<Record<string, string | null>>({})
  const [uploadingKind, setUploadingKind] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!currentTenant) return
    getBranding(currentTenant.id)
      .then(async (b) => {
        if (b) {
          const rest = { ...b } as Partial<TenantBranding>
          delete rest.tenant_id
          delete rest.created_at
          delete rest.updated_at
          setDraft({ ...DEFAULT_BRANDING, ...rest })
          const urls: Record<string, string | null> = {}
          for (const asset of ASSETS) {
            const path = b[`${asset.kind}_path` as keyof TenantBranding] as string | null
            urls[asset.kind] = await getBrandingAssetUrl(path)
          }
          setAssetUrls(urls)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load branding.'))
  }, [currentTenant])

  const patch = (updates: Partial<Draft>) => setDraft((d) => ({ ...d, ...updates }))

  const handleSave = async () => {
    if (!currentTenant) return
    setSaving(true); setError(null)
    try {
      await upsertBranding(currentTenant.id, draft)
      setSuccess('Branding saved — all new documents will use these settings.')
      window.setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpload = async (kind: BrandingAssetKind, file: File | null) => {
    if (!file || !currentTenant) return
    setUploadingKind(kind); setError(null)
    try {
      const path = await uploadBrandingAsset(currentTenant.id, kind, file)
      patch({ [`${kind}_path`]: path } as Partial<Draft>)
      setAssetUrls((prev) => ({ ...prev, [kind]: URL.createObjectURL(file) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Ensure the "branding" storage bucket exists.')
    } finally {
      setUploadingKind(null)
    }
  }

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand'
  const label = 'block text-sm text-slate-600 mb-1'

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Branding</h1>
          <p className="text-slate-500 mt-1">Every document, certificate and email carries your brand — never ours.</p>
        </div>
        <button type="button" onClick={handleSave} disabled={saving} className="self-start rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50">
          {saving ? 'Saving…' : 'Save branding'}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">{success}</div>}

      {/* Business identity */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Business identity</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div><label className={label}>Trading name</label><input value={draft.trading_name ?? ''} onChange={(e) => patch({ trading_name: e.target.value })} className={inputCls} /></div>
          <div><label className={label}>ACN (optional)</label><input value={draft.acn ?? ''} onChange={(e) => patch({ acn: e.target.value })} className={inputCls} /></div>
          <div><label className={label}>Licence number</label><input value={draft.license_number ?? ''} onChange={(e) => patch({ license_number: e.target.value })} className={inputCls} /></div>
          <div><label className={label}>Contractor licence</label><input value={draft.contractor_license ?? ''} onChange={(e) => patch({ contractor_license: e.target.value })} className={inputCls} /></div>
          <div><label className={label}>Electrical contractor licence</label><input value={draft.electrical_license ?? ''} onChange={(e) => patch({ electrical_license: e.target.value })} className={inputCls} placeholder="EC-XXXXX" /></div>
          <div><label className={label}>Business address</label><input value={draft.business_address ?? ''} onChange={(e) => patch({ business_address: e.target.value })} className={inputCls} /></div>
          <div><label className={label}>Postal address</label><input value={draft.postal_address ?? ''} onChange={(e) => patch({ postal_address: e.target.value })} className={inputCls} /></div>
          <div><label className={label}>Facebook (optional)</label><input value={draft.social_links.facebook ?? ''} onChange={(e) => patch({ social_links: { ...draft.social_links, facebook: e.target.value } })} className={inputCls} /></div>
          <div><label className={label}>Instagram (optional)</label><input value={draft.social_links.instagram ?? ''} onChange={(e) => patch({ social_links: { ...draft.social_links, instagram: e.target.value } })} className={inputCls} /></div>
        </div>
        <p className="mt-3 text-xs text-slate-400">Company name, ABN, phone and website come from Workspace settings and are included automatically.</p>
      </section>

      {/* Visual identity */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Colours & typography</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {([
            ['primary_color', 'Primary colour'],
            ['secondary_color', 'Secondary colour'],
            ['accent_color', 'Accent colour'],
          ] as [keyof Draft, string][]).map(([key, lbl]) => (
            <div key={key}>
              <label className={label}>{lbl}</label>
              <div className="flex gap-2">
                <input type="color" value={String(draft[key])} onChange={(e) => patch({ [key]: e.target.value } as Partial<Draft>)} className="h-9 w-12 rounded-md border border-slate-300 cursor-pointer" />
                <input value={String(draft[key])} onChange={(e) => patch({ [key]: e.target.value } as Partial<Draft>)} className={`${inputCls} font-mono`} />
              </div>
            </div>
          ))}
          <div>
            <label className={label}>Document font</label>
            <select value={draft.font_family} onChange={(e) => patch({ font_family: e.target.value })} className={inputCls}>
              {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Live preview strip */}
        <div className="mt-5 rounded-lg border border-slate-200 overflow-hidden" style={{ fontFamily: draft.font_family }}>
          <div className="px-5 py-3 flex items-center justify-between" style={{ backgroundColor: draft.secondary_color }}>
            <span className="text-white font-bold">{draft.trading_name || currentTenant?.name || 'Your Business'}</span>
            <span className="text-xs text-white/70">Document preview</span>
          </div>
          <div className="px-5 py-4 bg-white">
            <p className="font-semibold" style={{ color: draft.secondary_color }}>Certificate of Electrical Safety</p>
            <p className="text-xs text-slate-500 mt-1">Issued by {draft.trading_name || currentTenant?.name || 'Your Business'} · Licence {draft.electrical_license || '—'}</p>
            <button type="button" className="mt-3 rounded-md px-4 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: draft.primary_color }}>Approve</button>
            <span className="ml-2 text-xs font-semibold" style={{ color: draft.accent_color }}>Accent link</span>
          </div>
        </div>
      </section>

      {/* Assets */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Logo & images</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ASSETS.map((asset) => (
            <div key={asset.kind} className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-800">{asset.label}</p>
              <p className="text-xs text-slate-400 mb-3">{asset.hint}</p>
              {assetUrls[asset.kind] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetUrls[asset.kind]!} alt={asset.label} className="h-16 object-contain mb-3" />
              ) : (
                <div className="h-16 rounded-md bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-300 mb-3">None uploaded</div>
              )}
              <label className="inline-block cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                {uploadingKind === asset.kind ? 'Uploading…' : assetUrls[asset.kind] ? 'Replace' : 'Upload'}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingKind !== null} onChange={(e) => handleUpload(asset.kind, e.target.files?.[0] ?? null)} />
              </label>
            </div>
          ))}
        </div>
      </section>

      {/* Document settings */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Document settings</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={label}>Logo placement</label>
            <select value={draft.logo_position} onChange={(e) => patch({ logo_position: e.target.value as Draft['logo_position'] })} className={inputCls}>
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </div>
          <div>
            <label className={label}>Paper size</label>
            <select value={draft.paper_size} onChange={(e) => patch({ paper_size: e.target.value as Draft['paper_size'] })} className={inputCls}>
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
            </select>
          </div>
          <div>
            <label className={label}>Document number format</label>
            <input value={draft.doc_number_format} onChange={(e) => patch({ doc_number_format: e.target.value })} className={`${inputCls} font-mono`} />
            <p className="mt-1 text-xs text-slate-400">Tokens: {'{PREFIX} {YYYY} {YY} {MM} {SEQ} {SEQ4}'}</p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={draft.show_page_numbers} onChange={(e) => patch({ show_page_numbers: e.target.checked })} className="accent-brand" />
            Show page numbers on PDFs
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={draft.show_watermark} onChange={(e) => patch({ show_watermark: e.target.checked })} className="accent-brand" />
            Show watermark on documents
          </label>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={label}>Document footer text</label>
            <input value={draft.footer_text ?? ''} onChange={(e) => patch({ footer_text: e.target.value })} className={inputCls} placeholder="e.g. Thank you for choosing us · 24/7 emergency: 04xx xxx xxx" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={label}>Email signature</label>
            <textarea value={draft.email_signature ?? ''} onChange={(e) => patch({ email_signature: e.target.value })} rows={3} className={inputCls} placeholder="Appended to customer emails" />
          </div>
        </div>
      </section>
    </div>
  )
}
