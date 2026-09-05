'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/context/AuthContext'
import { getProfile, signOut } from '@/lib/auth'
import { updateMyProfile } from '@/lib/profile'

export default function FieldProfile() {
  const router = useRouter()
  const { session, refetchSession } = useAuthContext()
  const userId = session?.user?.id

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [emergency, setEmergency] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [quals, setQuals] = useState('')
  const [licences, setLicences] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    getProfile(userId).then((p) => {
      if (p) {
        setFullName(p.full_name ?? '')
        setPhone(p.phone ?? '')
        setEmergency(p.emergency_contact ?? '')
        setVehicle(p.vehicle ?? '')
        setQuals((p.qualifications ?? []).join(', '))
        setLicences((p.licences ?? []).join(', '))
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [userId])

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base outline-none focus:border-brand'
  const toArr = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean)

  if (loading) return <p className="py-10 text-center text-slate-400">Loading…</p>

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">My profile</h1>

      {msg && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>}

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <div><label className="block text-sm text-slate-600 mb-1">Name</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></div>
        <div><label className="block text-sm text-slate-600 mb-1">Phone</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
        <div><label className="block text-sm text-slate-600 mb-1">Emergency contact</label><input value={emergency} onChange={(e) => setEmergency(e.target.value)} className={inputCls} placeholder="Name & number" /></div>
        <div><label className="block text-sm text-slate-600 mb-1">Assigned vehicle</label><input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className={inputCls} placeholder="Rego / description" /></div>
        <div><label className="block text-sm text-slate-600 mb-1">Qualifications</label><input value={quals} onChange={(e) => setQuals(e.target.value)} className={inputCls} placeholder="Comma separated" /></div>
        <div><label className="block text-sm text-slate-600 mb-1">Licences & tickets</label><input value={licences} onChange={(e) => setLicences(e.target.value)} className={inputCls} placeholder="e.g. A-Grade, EWP, White Card" /></div>
      </div>

      <button type="button" disabled={saving}
        onClick={async () => {
          if (!userId) return
          setSaving(true); setMsg(null)
          try {
            await updateMyProfile(userId, {
              full_name: fullName, phone, emergency_contact: emergency, vehicle,
              qualifications: toArr(quals), licences: toArr(licences),
            })
            await refetchSession()
            setMsg('Profile saved.')
          } catch { setMsg('Failed to save.') } finally { setSaving(false) }
        }}
        className="w-full rounded-xl bg-brand py-3.5 text-base font-bold text-white active:bg-brand-dark disabled:opacity-50">
        {saving ? 'Saving…' : 'Save profile'}
      </button>

      <button type="button"
        onClick={async () => { await signOut(); router.push('/login') }}
        className="w-full rounded-xl border border-slate-200 bg-white shadow-sm py-3 text-base font-semibold text-slate-600">
        Log out
      </button>
    </div>
  )
}
