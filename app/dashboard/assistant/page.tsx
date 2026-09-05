'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/context/AuthContext'
import { canUseFaultFinder, getTradesCached } from '@/lib/onboarding'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const STARTERS = [
  'Why does my RCD keep tripping?',
  'How do I test insulation resistance?',
  'Circuit breaker tripping on load, where do I start?',
  'What clause covers socket outlet height?',
  'No power to GPOs on one circuit',
]

const WELCOME =
  'Describe the fault and I will work through it with you step by step: what you are seeing, the likely causes ranked, the next test to run and what the result means. Australian standards and safe work practices throughout.'

const FOOTER =
  'Always verify advice against current AS/NZS standards and your state’s electrical safety regulations.'

export default function FaultFinderPage() {
  const { currentTenant } = useAuthContext()
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fault Finder is an electrical product. HVAC and air conditioning
  // workspaces see an explainer instead of the chat; the API enforces the
  // same rule server side.
  useEffect(() => {
    if (!currentTenant) return
    getTradesCached(currentTenant.id)
      .then((trades) => setAllowed(canUseFaultFinder(trades)))
      .catch(() => setAllowed(true))
  }, [currentTenant])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...next, assistantMsg])

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, tenantId: currentTenant?.id }),
      })

      if (!res.ok || !res.body) {
        // Surface the server's reason (not configured, wrong trade) rather
        // than a generic failure.
        let reason = 'Sorry, something went wrong. Please try again.'
        try {
          const body = await res.json()
          if (body?.error) reason = body.error
        } catch {
          /* streaming response with no JSON body */
        }
        setMessages([...next, { role: 'assistant', content: reason }])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages((prev) => {
          const copy = [...prev]
          copy[copy.length - 1] = { role: 'assistant', content: accumulated }
          return copy
        })
      }
    } catch {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        }
        return copy
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (allowed === false) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink">
            <span className="text-2xl font-black text-brand-dark">F</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">FieldMS Fault Finder</h1>
          <p className="mt-2 text-sm text-slate-500">
            Fault Finder is built for electricians. It works from the electrical fault finding manual
            and AS/NZS wiring rules, so it is only available to workspaces doing electrical work.
          </p>
          <Link
            href="/dashboard/onboarding"
            className="mt-6 inline-block rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Update your trades
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">FieldMS Fault Finder</h1>
          <p className="text-sm text-slate-500">
            Electrical fault finding · AS/NZS 3000 · Australian standards
          </p>
        </div>
        <span className="text-sm text-slate-400 hidden sm:block">{currentTenant?.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div>
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink">
                <span className="text-2xl font-black text-brand-dark">F</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">FieldMS Fault Finder</h2>
              <p className="mt-1 text-sm text-slate-500 max-w-md">{WELCOME}</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:border-brand hover:text-brand-dark transition-colors shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="mr-3 mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink">
                <span className="text-xs font-black text-brand-dark">F</span>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-ink text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && msg.content === '' && loading && (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce delay-0 h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span
                    className="animate-bounce delay-100 h-1.5 w-1.5 rounded-full bg-slate-400"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <span
                    className="animate-bounce delay-200 h-1.5 w-1.5 rounded-full bg-slate-400"
                    style={{ animationDelay: '0.2s' }}
                  />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 bg-white px-4 sm:px-6 lg:px-8 py-4 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3 items-end max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe the fault, clause or reading… (Enter to send)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-white shadow-sm px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 placeholder:text-slate-400 max-h-40 overflow-y-auto"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-brand hover:bg-brand-dark disabled:opacity-40 px-5 py-3 text-sm font-semibold text-white transition-colors shrink-0"
          >
            Send
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-slate-400 max-w-4xl mx-auto">{FOOTER}</p>
      </div>
    </div>
  )
}
