'use client'

/**
 * Quick Start Setup Wizard — runs once for every new workspace.
 *
 * Welcome → Business → Trades → Branding → Wholesalers → Integrations →
 * Team → Finish.
 *
 * Setup is the front door. A new owner lands here before the dashboard, so
 * quotes, invoices and certificates are not produced from an unconfigured
 * workspace. Skipping is allowed and records 'skipped': the dashboard opens,
 * a banner keeps offering to finish, and Setup stays in the More menu.
 *
 * Every answer customises the app: trades gate modules (only electrical
 * trades see FieldMS Fault Finder), branding lands on every document,
 * wholesalers pre-populate the account centre, and the tour launches on the
 * dashboard at the end.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { updateTenant, addTenantMember } from '@/lib/auth'
import {
  TRADES,
  STEP_ORDER,
  STEP_LABELS,
  hasElectrical,
  hasHvac,
  getOnboarding,
  saveOnboarding,
  markStepDone,
  completeOnboarding,
  skipOnboarding,
  invalidateTradesCache,
  type OnboardingStep,
} from '@/lib/onboarding'
import { WHOLESALERS } from '@/lib/pricing/suppliers'
import {
  getBranding,
  upsertBranding,
  uploadBrandingAsset,
  getBrandingAssetUrl,
  DEFAULT_BRANDING,
} from '@/lib/branding'
import Logo from '@/components/Logo'

type Screen = 'welcome' | OnboardingStep | 'done'

/** Pull a readable message out of an Error, a Supabase error object, or anything else. */
function describeStepError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string }
    const parts = [e.message, e.details, e.hint].filter(Boolean)
    if (parts.length) return `${parts.join(' — ')}${e.code ? ` (${e.code})` : ''}`
  }
  return 'Something went wrong, please try again.'
}

const SIZES = [
  { key: 'solo', label: 'Just me' },
  { key: 'small', label: '2–5 employees' },
  { key: 'medium', label: '6–20' },
  { key: 'large', label: '20+' },
] as const

const ACCOUNTING = [
  { key: 'xero', label: 'Xero' },
  { key: 'myob', label: 'MYOB' },
  { key: 'quickbooks', label: 'QuickBooks' },
  { key: 'none', label: "Don't use any" },
  { key: 'later', label: 'Connect later' },
] as const

export default function OnboardingWizard() {
  const router = useRouter()
  const { currentTenant, session } = useAuthContext()
  const tenantId = currentTenant?.id

  const [screen, setScreen] = useState<Screen>('welcome')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  // Business step
  const [bizName, setBizName] = useState('')
  const [abn, setAbn] = useState('')
  const [phone, setPhone] = useState('')
  const [bizEmail, setBizEmail] = useState('')
  const [address, setAddress] = useState('')
  const [website, setWebsite] = useState('')
  const [gst, setGst] = useState<boolean | null>(null)
  const [size, setSize] = useState<string | null>(null)

  // Trades / wholesalers / accounting
  const [trades, setTrades] = useState<string[]>([])
  const [wholesalers, setWholesalers] = useState<string[]>([])
  const [accounting, setAccounting] = useState<string | null>(null)

  // Branding step
  const [brand, setBrand] = useState({
    primary_color: DEFAULT_BRANDING.primary_color,
    secondary_color: DEFAULT_BRANDING.secondary_color,
    accent_color: DEFAULT_BRANDING.accent_color,
    electrical_license: '',
    logo_path: null as string | null,
  })
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Team
  const [invites, setInvites] = useState<string>('')
  const [invited, setInvited] = useState<string[]>([])

  useEffect(() => {
    if (!tenantId) return
    setBizName(currentTenant?.name ?? '')
    getOnboarding(tenantId)
      .then((state) => {
        if (!state) return
        setCompletedSteps(state.completed_steps)
        setTrades(state.trades)
        setWholesalers(state.wholesaler_keys)
        setAccounting(state.accounting_provider)
        setGst(state.gst_registered)
        setSize(state.business_size)
        setAddress(state.address ?? '')
        setBizEmail(state.business_email ?? '')
      })
      .catch(() => {})

    // Branding lives in its own table; pull it in so re-running setup shows
    // what is already configured rather than resetting it to defaults.
    getBranding(tenantId)
      .then(async (b) => {
        if (!b) return
        setBrand({
          primary_color: b.primary_color,
          secondary_color: b.secondary_color,
          accent_color: b.accent_color,
          electrical_license: b.electrical_license ?? '',
          logo_path: b.logo_path,
        })
        if (b.logo_path) setLogoUrl(await getBrandingAssetUrl(b.logo_path))
      })
      .catch(() => {})
  }, [tenantId, currentTenant?.name])

  const handleLogo = async (file: File) => {
    if (!tenantId) return
    setUploadingLogo(true)
    setError(null)
    try {
      const path = await uploadBrandingAsset(tenantId, 'logo', file)
      setBrand((b) => ({ ...b, logo_path: path }))
      setLogoUrl(await getBrandingAssetUrl(path))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const stepIndex = screen === 'welcome' ? -1 : screen === 'done' ? STEP_ORDER.length : STEP_ORDER.indexOf(screen as OnboardingStep)
  const progress = Math.max(0, Math.round(((stepIndex + (screen === 'done' ? 0 : 0)) / STEP_ORDER.length) * 100))

  const relevantWholesalers = useMemo(() => {
    const wantsElec = !trades.length || hasElectrical(trades)
    const wantsHvac = !trades.length || hasHvac(trades)
    return WHOLESALERS.filter((w) => {
      if (w.key === 'sparky_direct') return false
      if (w.trade === 'hvac') return wantsHvac
      return wantsElec
    })
  }, [trades])

  const advance = useCallback(
    async (step: OnboardingStep, work: () => Promise<void>) => {
      if (!tenantId) return
      setSaving(true)
      setError(null)
      try {
        await work()
        const next = await markStepDone(tenantId, step, completedSteps)
        setCompletedSteps(next)
        const idx = STEP_ORDER.indexOf(step)
        setScreen(idx + 1 < STEP_ORDER.length ? STEP_ORDER[idx + 1] : 'done')
      } catch (err) {
        // Supabase rejects with a plain object, not an Error, so the previous
        // instanceof check swallowed every database message and showed a
        // useless generic string. Read whatever shape actually arrived.
        setError(describeStepError(err))
      } finally {
        setSaving(false)
      }
    },
    [tenantId, completedSteps]
  )

  const skip = async () => {
    if (tenantId) await skipOnboarding(tenantId).catch(() => {})
    router.push('/dashboard')
  }

  const finish = async (startTour: boolean) => {
    if (!tenantId) return
    setSaving(true)
    try {
      await markStepDone(tenantId, 'tour', completedSteps)
      await completeOnboarding(tenantId)
      invalidateTradesCache()
      if (startTour) {
        window.localStorage.setItem('fieldms-tour', '1')
      }
      router.push('/dashboard')
    } finally {
      setSaving(false)
    }
  }

  if (!tenantId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-brand" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Progress tracker */}
      {screen !== 'welcome' && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>{screen === 'done' ? 'All done!' : STEP_LABELS[screen as OnboardingStep]}</span>
            <span>{screen === 'done' ? 100 : progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-brand transition-all duration-500"
              style={{ width: `${screen === 'done' ? 100 : Math.max(progress, 6)}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {STEP_ORDER.map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  completedSteps.includes(s)
                    ? 'bg-green-50 text-green-700'
                    : s === screen
                      ? 'bg-brand/10 text-brand-dark'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {completedSteps.includes(s) && '✓ '}
                {STEP_LABELS[s]}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* ── Welcome ── */}
      {screen === 'welcome' && (
        <div className="card p-8 text-center sm:p-12">
          <div className="mx-auto w-fit"><Logo size="md" textColor="text-slate-900" /></div>
          <h1 className="mt-8 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Welcome to FieldMS.</h1>
          <p className="mx-auto mt-4 max-w-md text-lg leading-8 text-slate-500">
            Let&apos;s get your business set up in just a few minutes. We&apos;ll customise everything to suit your
            trade and show you how it all works.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={() => setScreen('business')} className="btn btn-primary btn-lg w-full sm:w-auto">
              Start setup
            </button>
            <button type="button" onClick={skip} className="btn btn-ghost btn-lg w-full sm:w-auto">
              Skip for now
            </button>
          </div>
          <p className="mt-6 text-xs text-slate-400">
            Takes 2 to 5 minutes · Everything here can be changed later from Setup
          </p>
        </div>
      )}

      {/* ── Business details ── */}
      {screen === 'business' && (
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Tell us about your business</h2>
          <p className="mt-2 text-sm text-slate-500">This appears on your quotes, invoices and certificates.</p>
          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              advance('business', async () => {
                await updateTenant(tenantId, {
                  name: bizName.trim() || currentTenant!.name,
                  abn: abn.trim() || null,
                  phone: phone.trim() || null,
                  website: website.trim() || null,
                } as Parameters<typeof updateTenant>[1])
                await saveOnboarding(tenantId, {
                  gst_registered: gst,
                  business_size: (size as 'solo' | 'small' | 'medium' | 'large' | null) ?? null,
                  address: address.trim() || null,
                  business_email: bizEmail.trim() || null,
                })
              })
            }}
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="ob-name">Business name</label>
                <input id="ob-name" className="input" value={bizName} onChange={(e) => setBizName(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="ob-abn">ABN <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="ob-abn" className="input" value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="11 222 333 444" />
              </div>
              <div>
                <label className="label" htmlFor="ob-phone">Business phone</label>
                <input id="ob-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0400 000 000" />
              </div>
              <div>
                <label className="label" htmlFor="ob-email">Business email</label>
                <input id="ob-email" type="email" className="input" value={bizEmail} onChange={(e) => setBizEmail(e.target.value)} placeholder="admin@yourbusiness.com.au" />
              </div>
              <div className="sm:col-span-2">
                <label className="label" htmlFor="ob-address">Business address</label>
                <input id="ob-address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="1 Example St, Brisbane QLD" />
              </div>
              <div>
                <label className="label" htmlFor="ob-web">Website <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="ob-web" className="input" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" />
              </div>
              <div>
                <label className="label">GST registered?</label>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      onClick={() => setGst(v)}
                      className={`btn flex-1 ${gst === v ? 'btn-primary' : 'btn-secondary'}`}
                    >
                      {v ? 'Yes' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="label">Business size</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SIZES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSize(s.key)}
                    className={`btn ${size === s.key ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Your logo and colours come next, and flow onto every document automatically.
            </p>
            <WizardNav saving={saving} onSkip={skip} onBack={() => setScreen('welcome')} />
          </form>
        </div>
      )}

      {/* ── Trades ── */}
      {screen === 'trades' && (
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">What services does your business provide?</h2>
          <p className="mt-2 text-sm text-slate-500">
            Select everything that applies and FieldMS customises your tools to match. Electrical trades also get
            FieldMS Fault Finder and the electrical test sheets.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TRADES.map((t) => {
              const on = trades.includes(t.key)
              // Not selectable yet: we would be taking money for a product
              // that does not cover this trade. See TRADES in lib/onboarding.
              if (t.comingSoon) {
                return (
                  <div
                    key={t.key}
                    aria-disabled="true"
                    className="flex cursor-not-allowed items-start gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-left opacity-70"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-500">{t.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-400">{t.hint}</span>
                    </span>
                    <span className="ml-auto mt-0.5 shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      Coming soon
                    </span>
                  </div>
                )
              }
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTrades((prev) => (on ? prev.filter((x) => x !== t.key) : [...prev, t.key]))}
                  className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                    on ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${on ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-900">{t.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{t.hint}</span>
                  </span>
                  <span className={`ml-auto mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${on ? 'border-brand bg-brand text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                </button>
              )
            })}
          </div>
          {hasHvac(trades) && !hasElectrical(trades) && (
            <p className="mt-4 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">
              We&apos;ll set you up with jobs, quotes, scheduling and invoicing. FieldMS Fault Finder and the
              electrical test sheets are built for electricians, so we&apos;ll keep those out of your way.
            </p>
          )}
          {hasHvac(trades) && hasElectrical(trades) && (
            <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              You&apos;ll get the full toolset, including FieldMS Fault Finder for the electrical side of the work.
            </p>
          )}
          <WizardNav
            saving={saving}
            onSkip={skip}
            disabled={!trades.length}
            onBack={() => setScreen('business')}
            onNext={() => advance('trades', async () => {
              await saveOnboarding(tenantId, { trades })
              invalidateTradesCache()
            })}
          />
        </div>
      )}

      {/* ── Branding ── */}
      {screen === 'branding' && (
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Make it look like your business</h2>
          <p className="mt-2 text-sm text-slate-500">
            Your logo and colours go on every quote, invoice and certificate you send. Customers see this, not us.
          </p>

          <div className="mt-8 space-y-6">
            <div>
              <label className="label">Logo</label>
              <div className="mt-1 flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="Your logo" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">No logo</span>
                  )}
                </div>
                <div>
                  <label className="btn btn-ghost cursor-pointer border border-slate-300">
                    {uploadingLogo ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleLogo(f) }}
                    />
                  </label>
                  <p className="mt-1.5 text-xs text-slate-400">PNG or SVG works best. Transparent background ideal.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="label">Document colours</label>
              <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([
                  ['primary_color', 'Primary'],
                  ['secondary_color', 'Secondary'],
                  ['accent_color', 'Accent'],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-3">
                    <input
                      type="color"
                      aria-label={label}
                      value={brand[key]}
                      onChange={(e) => setBrand((b) => ({ ...b, [key]: e.target.value }))}
                      className="h-9 w-11 cursor-pointer rounded-md border border-slate-300"
                    />
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {hasElectrical(trades) && (
              <div>
                <label className="label" htmlFor="ob-licence">Electrical licence number</label>
                <input
                  id="ob-licence"
                  className="input"
                  placeholder="e.g. QLD Electrical Contractor 88421"
                  value={brand.electrical_license}
                  onChange={(e) => setBrand((b) => ({ ...b, electrical_license: e.target.value }))}
                />
                <p className="mt-1.5 text-xs text-slate-400">Printed on certificates and test sheets.</p>
              </div>
            )}

            {/* Live preview so the choice is not abstract */}
            <div>
              <p className="label">Preview</p>
              <div className="mt-1 overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: brand.secondary_color }}>
                  <span className="text-sm font-bold text-white">{bizName || 'Your business'}</span>
                  <span className="text-xs text-white/70">Tax Invoice</span>
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="text-sm font-semibold" style={{ color: brand.secondary_color }}>Switchboard upgrade</p>
                  <p className="mt-1 text-xs text-slate-500">14 Kingsford Smith Dr, Hamilton QLD</p>
                  <button type="button" className="mt-3 rounded-md px-4 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: brand.primary_color }}>
                    Pay now
                  </button>
                  <span className="ml-2 text-xs font-semibold" style={{ color: brand.accent_color }}>View online</span>
                </div>
              </div>
            </div>
          </div>

          <WizardNav
            saving={saving}
            onSkip={skip}
            onBack={() => setScreen('trades')}
            onNext={() => advance('branding', async () => {
              await upsertBranding(tenantId, {
                primary_color: brand.primary_color,
                secondary_color: brand.secondary_color,
                accent_color: brand.accent_color,
                electrical_license: brand.electrical_license || null,
                logo_path: brand.logo_path,
              })
            })}
          />
        </div>
      )}

      {/* ── Wholesalers ── */}
      {screen === 'wholesalers' && (
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Which wholesalers do you buy from?</h2>
          <p className="mt-2 text-sm text-slate-500">
            Pricing and catalogues will only ever show suppliers you actually use. Connect trade accounts later for
            live negotiated pricing.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {relevantWholesalers.map((w) => {
              const on = wholesalers.includes(w.key)
              return (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => setWholesalers((prev) => (on ? prev.filter((x) => x !== w.key) : [...prev, w.key]))}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition-colors ${
                    on ? 'border-brand bg-brand/5' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white"
                    style={{ backgroundColor: w.color }}
                  >
                    {w.monogram}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{w.name}</span>
                    <span className="block text-[11px] uppercase tracking-wide text-slate-400">{w.trade}</span>
                  </span>
                </button>
              )
            })}
          </div>
          <WizardNav
            saving={saving}
            onSkip={skip}
            onBack={() => setScreen('trades')}
            nextLabel={wholesalers.length ? 'Next' : 'Skip this step'}
            onNext={() => advance('wholesalers', async () => {
              await saveOnboarding(tenantId, { wholesaler_keys: wholesalers })
            })}
          />
        </div>
      )}

      {/* ── Integrations ── */}
      {screen === 'integrations' && (
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Do you use accounting software?</h2>
          <p className="mt-2 text-sm text-slate-500">FieldMS syncs invoices and payments with Xero and MYOB.</p>
          <div className="mt-8 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {ACCOUNTING.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAccounting(a.key)}
                className={`rounded-xl border p-4 text-left text-sm font-semibold transition-colors ${
                  accounting === a.key ? 'border-brand bg-brand/5 text-slate-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-500">
            Choosing Xero or MYOB here saves the choice. You finish the actual connection from this page once
            setup is done, and it takes about a minute. Everything else keeps working either way.
          </p>
          <WizardNav
            saving={saving}
            onSkip={skip}
            disabled={!accounting}
            onBack={() => setScreen('wholesalers')}
            onNext={() => advance('integrations', async () => {
              await saveOnboarding(tenantId, { accounting_provider: accounting as 'xero' | 'myob' | 'quickbooks' | 'none' | 'later' })
            })}
          />
        </div>
      )}

      {/* ── Team ── */}
      {screen === 'team' && (
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Invite your team</h2>
          <p className="mt-2 text-sm text-slate-500">
            Add crew by email — technicians get the mobile field app, office staff get the full dashboard. Fine-grained
            roles live under <span className="font-semibold">Team</span>.
          </p>
          <div className="mt-8">
            <label className="label" htmlFor="ob-invites">Email addresses <span className="font-normal text-slate-400">(one per line)</span></label>
            <textarea
              id="ob-invites"
              rows={4}
              className="input h-auto py-3"
              placeholder={'dave@example.com\namy@example.com'}
              value={invites}
              onChange={(e) => setInvites(e.target.value)}
            />
            {invited.length > 0 && (
              <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                Invited: {invited.join(', ')}
              </p>
            )}
          </div>
          <WizardNav
            saving={saving}
            onSkip={skip}
            onBack={() => setScreen('integrations')}
            nextLabel={invites.trim() ? 'Invite & continue' : 'Skip this step'}
            onNext={() => advance('team', async () => {
              const emails = invites.split('\n').map((e) => e.trim()).filter((e) => /.+@.+\..+/.test(e))
              const ok: string[] = []
              for (const email of emails) {
                try {
                  await addTenantMember(tenantId, email, 'member')
                  ok.push(email)
                } catch {
                  // Unregistered emails can be invited again from Team later
                }
              }
              setInvited(ok)
            })}
          />
        </div>
      )}

      {/* ── Done ── */}
      {screen === 'done' && (
        <div className="card p-8 text-center sm:p-12">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-3xl text-brand-dark">✓</div>
          <h2 className="mt-6 text-3xl font-black tracking-tight text-slate-900">You&apos;re set up!</h2>
          <p className="mx-auto mt-3 max-w-md text-slate-500">
            {hasHvac(trades) && !hasElectrical(trades)
              ? 'FieldMS is now tuned for your HVAC work: jobs, quotes, scheduling and invoicing are ready to go.'
              : 'FieldMS is tuned for electrical work. FieldMS Fault Finder, AS/NZS 3000 help and test sheets are ready.'}
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" disabled={saving} onClick={() => finish(true)} className="btn btn-primary btn-lg w-full sm:w-auto">
              Take the 60-second tour
            </button>
            <button type="button" disabled={saving} onClick={() => finish(false)} className="btn btn-secondary btn-lg w-full sm:w-auto">
              Go to dashboard
            </button>
          </div>
        </div>
      )}

      {/* Signed in as */}
      <p className="mt-6 text-center text-xs text-slate-400">
        Signed in as {session?.user?.email} · {currentTenant?.name}
      </p>
    </div>
  )
}

function WizardNav({
  saving,
  disabled,
  onBack,
  onSkip,
  onNext,
  nextLabel = 'Next',
}: {
  saving: boolean
  disabled?: boolean
  onBack: () => void
  onSkip?: () => void
  onNext?: () => void
  nextLabel?: string
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
      <button type="button" onClick={onBack} className="btn btn-ghost">
        ← Back
      </button>
      <div className="flex items-center gap-3">
        {onSkip && (
          <button type="button" onClick={onSkip} className="btn btn-ghost text-slate-400">
            Skip setup
          </button>
        )}
        {onNext ? (
          <button type="button" disabled={saving || disabled} onClick={onNext} className="btn btn-primary">
            {saving ? 'Saving…' : nextLabel}
          </button>
        ) : (
          <button type="submit" disabled={saving || disabled} className="btn btn-primary">
            {saving ? 'Saving…' : nextLabel}
          </button>
        )}
      </div>
    </div>
  )
}
