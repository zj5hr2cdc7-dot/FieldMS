/**
 * One click unsubscribe.
 *
 * The Spam Act requires a functional unsubscribe in every marketing message,
 * honoured within five working days. The CSV export merges this URL into each
 * row, so an opt out from any campaign writes straight back to the customer
 * record and removes them from every future export.
 *
 * Deliberately server rendered and public: no login, no JavaScript needed,
 * and the token is the only thing that identifies the person.
 */

import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

async function unsubscribe(token: string): Promise<'done' | 'already' | 'unknown'> {
  try {
    const admin = createAdminClient()

    const { data: customer } = await admin
      .from('customers')
      .select('id, unsubscribed_at')
      .eq('unsubscribe_token', token)
      .maybeSingle()

    if (!customer) return 'unknown'
    if (customer.unsubscribed_at) return 'already'

    await admin
      .from('customers')
      .update({
        marketing_consent: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
        marketing_consent_at: new Date().toISOString(),
        marketing_consent_source: 'unsubscribe_link',
      })
      .eq('id', customer.id)

    return 'done'
  } catch {
    return 'unknown'
  }
}

export default async function UnsubscribePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const result = await unsubscribe(token)

  const copy = {
    done: {
      title: 'You have been unsubscribed',
      body: 'You will not receive any more marketing emails. Anything about a job you have booked will still reach you.',
    },
    already: {
      title: 'Already unsubscribed',
      body: 'This address was removed from the marketing list previously. Nothing further to do.',
    },
    unknown: {
      title: 'This link is not valid',
      body: 'It may have already been used or been mistyped. Reply to the email you received and the business will remove you directly.',
    },
  }[result]

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="card w-full max-w-md p-8 text-center shadow-xl sm:p-10">
        <div
          className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl ${
            result === 'unknown' ? 'bg-amber-50' : 'bg-green-50'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`h-6 w-6 ${result === 'unknown' ? 'text-amber-600' : 'text-brand-dark'}`}
          >
            {result === 'unknown' ? <path d="M12 8v4M12 16h.01M12 3l9 16H3z" /> : <path d="M20 6 9 17l-5-5" />}
          </svg>
        </div>
        <h1 className="mt-5 text-2xl font-black tracking-tight text-slate-900">{copy.title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{copy.body}</p>
      </div>
    </div>
  )
}
