'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useAuthContext } from '@/context/AuthContext'
import { canUseFaultFinder, getTradesCached } from '@/lib/onboarding'

interface Message { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'Why does my RCD keep tripping?',
  'How do I test insulation resistance?',
  'What clause covers socket outlet height?',
  'No power to GPOs on one circuit',
]

function FaultFinderInner() {
  const { currentTenant } = useAuthContext()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Electrical trades only, mirroring the server side check in the API.
  useEffect(() => {
    if (!currentTenant) return
    getTradesCached(currentTenant.id)
      .then((trades) => setAllowed(canUseFaultFinder(trades)))
      .catch(() => setAllowed(true))
  }, [currentTenant])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const next: Message[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next); setInput(''); setLoading(true)
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, tenantId: currentTenant?.id }),
      })
      if (!res.ok || !res.body) {
        let reason = 'Fault Finder is unavailable right now.'
        try {
          const body = await res.json()
          if (body?.error) reason = body.error
        } catch {
          /* no JSON body */
        }
        setMessages([...next, { role: 'assistant', content: reason }])
        return
      }
      // The API streams plain text, append it live.
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      setMessages([...next, { role: 'assistant', content: '' }])
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages([...next, { role: 'assistant', content: acc }])
      }
    } catch {
      setMessages([...next, { role: 'assistant', content: 'Connection issue, try again when you have signal.' }])
    } finally { setLoading(false) }
  }

  if (allowed === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center" style={{ minHeight: 'calc(100vh - 11rem)' }}>
        <h1 className="text-xl font-bold text-slate-900">Fault Finder</h1>
        <p className="mt-2 max-w-xs text-sm text-slate-500">
          Fault Finder is built for electricians and is only available to workspaces doing electrical work.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100vh - 11rem)' }}>
      <div className="mb-3">
        <h1 className="text-xl font-bold text-slate-900">Fault Finder</h1>
        <p className="text-xs text-slate-500">Electrical fault finding · AS/NZS 3000</p>
      </div>

      {messages.length === 0 ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">Ask about wiring rules, testing, fault finding or safety. Tap to start:</p>
          {STARTERS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)} className="w-full rounded-xl border border-slate-200 bg-white shadow-sm p-3 text-left text-sm font-medium text-slate-700 active:bg-slate-50">
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto pb-2">
          {messages.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'ml-auto bg-brand text-white' : 'bg-white border border-slate-200 text-slate-800'}`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))}
          {loading && <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-400">Thinking…</div>}
          <div ref={bottomRef} />
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="sticky bottom-20 mt-3 flex gap-2 bg-slate-100 pt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the fault…"
          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-brand"
        />
        <button type="submit" disabled={loading || !input.trim()} className="rounded-full bg-brand px-5 text-white font-semibold disabled:opacity-50">Send</button>
      </form>
    </div>
  )
}

export default function FieldFaultFinder() {
  return <Suspense fallback={<p className="py-10 text-center text-slate-400">Loading…</p>}><FaultFinderInner /></Suspense>
}
