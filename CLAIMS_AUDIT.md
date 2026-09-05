# Marketing claims audit

*Every public claim on the landing page and pricing table, checked against what the code actually does. August 2026.*

**Verdict: 5 claims cannot currently be substantiated. Three of them are on the pricing table, which is the highest-risk place for an unsubstantiated claim.**

Legend: 🟥 don't advertise · 🟨 needs rewording · 🟩 safe

---

## 🟥 1. "Works offline on site. No signal in the switchroom? Keep working. It all syncs when you are back in range."

**What exists:** `lib/offline-queue.ts` handles exactly one action type — `job_status`. That's it.

```
if (action.type === 'job_status') {
  await supabase.from('jobs').update({ status: action.status })
}
```

**What doesn't:** quotes, photos, forms, test sheets, signatures, timesheets, materials and notes are all live Supabase writes with no queueing. The service worker explicitly refuses to touch them:

```
// Never intercept API or Supabase traffic
if (url.pathname.startsWith('/api/') || url.hostname.includes('supabase')) return
```

So a sparky in a basement can mark a job complete. Everything else fails, and in most cases loses what they typed.

**Why this is the most dangerous claim you have.** Offline is the number one complaint in competitor reviews — it's precisely what people will switch to you for, and precisely what they'll test on day one. Your own service worker comment names Jobber and Housecall Pro for being read-only offline. You are currently *more* limited than what you're criticising: they at least let you read.

**Safe wording:** "Marks jobs done offline and syncs when you're back in range." Or build it out — the queue's shape is right, it just needs more action types.

---

## 🟥 2. "Live material pricing. Your negotiated wholesaler prices, always current, with full history."

**What exists:** one working connector — Sparky Direct — and it reads from a **hard-coded local array**, not a feed:

```
// Backed by the imported catalog; swap fetch logic for their live feed
return SPARKY_DIRECT_EQUIPMENT.map(...)
```

**Every real wholesaler is a stub that throws:**

```
pendingConnector('rexel', 'Rexel')
pendingConnector('haymans', 'Haymans')
...
throw new Error(`${name} connector is not activated. Live pricing requires a
data-feed or API agreement with the supplier`)
```

Middy's is listed with `methods: ['api', ...]` in the supplier list, which implies an API connection that isn't implemented.

"Always current" and "your negotiated prices" are both false today. Negotiated pricing requires a trade account feed you don't have agreements for. A CSV import is real and useful — call it that.

**Safe wording:** "Import your wholesaler price lists and track every price change."

---

## 🟥 3. "Xero / MYOB sync" (Team plan, $89/user)

`app/api/integrations/xero/sync` exists. **There is no MYOB sync route** — only the shared OAuth `[provider]/connect` and `[provider]/callback`. Selling MYOB sync on a paid tier when the endpoint doesn't exist is the clearest exposure on the page.

Also note: even Xero is a **manual one-way push**. No webhooks, no polling, nothing writes payment status back. See the invoice tracking finding from earlier.

**Safe wording:** "Export invoices to Xero." Remove MYOB until it's built.

---

## 🟥 4. "Reporting & analytics" (Business plan)

There is no reports page. `/dashboard/reports` is **photo site reports** for customers, not business analytics. No job profitability, no quote conversion, no debtor ageing, no tech utilisation. The dashboard has a single P&L-by-quarter chart.

Selling this as a tier-differentiating feature is charging money for something that isn't there.

---

## 🟥 5. "14 day free trial · No card required · Cancel anytime" + all three price points

**There is no billing system at all.** No Stripe, no subscription table, no trial expiry, no seat enforcement. Nothing counts users against "Field app for 1 user", "Up to 10 field users" or "Unlimited users".

Two problems:
1. You can't honour "cancel anytime" if there's nothing to cancel
2. Seat limits are unenforceable, so the pricing table is decoration

Not dangerous to customers, but "14 day free trial" implies something ends after 14 days. When nothing does, and you later start charging people who thought they were on a free plan, that's a dispute.

---

## 🟨 6. "Plan your crew's week in seconds. Everyone sees it live on their phone."

**No realtime anywhere in the codebase.** No Supabase `.channel()`, no `postgres_changes`, no subscriptions. Data updates on page load or refetch.

"Live" is doing work here that the code doesn't. A tech whose schedule changed at 9am sees it whenever they next open the app.

**Safe wording:** "Everyone sees this week's work on their phone." Or add a realtime subscription — with Supabase this is genuinely a small job.

---

## 🟨 7. "Quote on site, schedule the crew, capture signatures and **get paid**, even with no signal."

Two problems in one sentence. "Get paid" implies payment capture — `job_payments.method` is a free-text string with no processor wired in, so nothing can charge a card. And "even with no signal" inherits problem 1: none of quoting, signatures or payment works offline.

---

## 🟩 Claims that hold up

| Claim | Evidence |
|---|---|
| Compliance certificates, test sheets signed on site | `job_test_sheets` with circuit-level JSONB, certificate numbers, public token pages |
| FieldMS Fault Finder | Verified working end to end against a live API key |
| Roles & permissions | Real as of migration 024, enforced in RLS |
| Set up in minutes, tunes to your trade | The setup wizard genuinely gates modules by trade |
| Quotes, jobs & invoices | All exist and work |
| Site reports with photos | Real, with public share tokens |
| Customer list and history | Real as of migration 023 |

---

## Suggested order

1. **Pull the three pricing-table claims today** (MYOB sync, Reporting & analytics, seat limits). Paid-tier claims are the worst place to be wrong.
2. **Reword offline and live pricing** — both are one sentence each.
3. **Reword "live" schedule and "get paid"**.
4. Then build, in whatever order suits: payment processor → offline queue coverage → realtime → reports → MYOB.

The compliance and Fault Finder story is entirely true, differentiated, and nobody gets sued over a certificate template. Lead with it.

*Not legal advice. If you're spending real money on ad creative, worth ten minutes with an actual lawyer on the ACL exposure.*
