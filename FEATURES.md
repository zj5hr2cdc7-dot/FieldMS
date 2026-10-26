# FieldMS — complete feature inventory

18 October 2026. Taken from the codebase on `feature/payments`, not from
marketing copy. 57 pages, 30 API routes, 58 tables, 52 library modules.

**Status key**

| | |
|---|---|
| **Live** | Built, on `main`, running at fieldms.com.au |
| **Off** | Built and tested, switched off behind a flag in `lib/features.ts` |
| **Branch** | Built and working, on a branch, not deployed |
| **Needs key** | Code complete; dead until an env var or migration is set |
| **Unverified** | Written, never run against the real third party |
| **Blocked** | Needs something no code can supply |

---

## 1. Jobs and scheduling

| Feature | Status | Notes |
|---|---|---|
| Job list, detail, create, edit | Live | `/dashboard/jobs` |
| Job status lifecycle | Live | Quoted → scheduled → in progress → completed |
| Week schedule across crew | Live | `/dashboard/schedule`, conflict detection |
| Job assignment to technicians | Live | |
| Job events (travel started, arrived, completed) | Live | `job_events` |
| Live GPS tracking during travel | Live | `job_location_updates`, 12s refresh |
| Customer tracking page (no login) | Live | `/track/[token]` |
| Map on the tracking page | **Needs key** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`. Falls back to address + status |
| Offline job status changes | Live | Queued locally, flushed on reconnect. **Status only** — not photos or forms |
| Job photos with captions | Live | `/field/photos`, private bucket |
| Job plans / drawings | Live | `/dashboard/plans`, 50MB |

## 2. Customers and sites

| Feature | Status | Notes |
|---|---|---|
| Customer records | Live | `/dashboard/customers` |
| Multiple sites per customer | Live | `sites` |
| Customer job history | Live | |
| CSV import | Live | `/dashboard/customers/import` |
| Marketing consent per customer | Live | Spam Act tracking |
| Unsubscribe page | Live | `/unsubscribe/[token]` |

## 3. Quoting and estimates

| Feature | Status | Notes |
|---|---|---|
| Estimate builder | Live | `/estimates/new` |
| Customer-facing quote page | Live | `/quote/[token]`, no login |
| One-tap customer approval | Live | Typed-name signature |
| Approval audit trail | Live | `estimate_approval_events` |
| Variations with approval | Live | `/variation/[token]` |
| **Job packages** | **Needs migration** | Reusable labour + material bundles. Run `028_job_packages.sql` |
| Charge-out rate calculator | Branch | `/dashboard/rate-calculator` |

## 4. Invoicing and money

| Feature | Status | Notes |
|---|---|---|
| Invoices from job billing lines | Live | |
| Progress claims and part payments | Live | `job_invoices.kind` |
| Deposits | Live | |
| GST handling | Live | Per-job `gst_rate`, stored ex GST |
| Customer invoice page | Live | `/invoice/[token]` |
| Payment recording | Live | `job_payments` |
| Billing audit trail | Live | `billing_audit_events` |
| Quarterly P&L | Live | `getQuarterlyPnL` |
| Cost / margin visibility | Live | Owner-only, enforced in RLS |
| **"Pay now" on invoices** | **Branch** | Stripe Connect. See §10 |
| **FieldMS subscription billing** | **Branch** | Stripe Checkout. See §10 |

## 5. Compliance and documents

| Feature | Status | Notes |
|---|---|---|
| Electrical test sheets | Live | Circuit rows, IR, polarity, RCD trip times |
| Certificates | Live | `/certificate/[token]` |
| Asset and compliance register | Live | 30+ asset types, test intervals, next-due |
| QR code per asset | Live | `assets.qr_token` |
| Form builder | Live | `/dashboard/forms/builder` |
| Form library | Live | `lib/form-library.ts` |
| On-site signature capture | Live | `form_signatures` |
| Form audit events | Live | |
| Site reports with photos | Live | `/report/[token]` |
| Document numbering | Live | `document_counters` |
| Branded customer documents | Live | Logo, licence number, footer, signature |

## 6. Field app (technician)

| Feature | Status | Notes |
|---|---|---|
| Own jobs only | Live | Enforced in RLS, not just UI |
| Job detail and completion | Live | |
| Forms on site | Live | |
| Photo capture | Live | |
| Timesheet | Live | `time_entries` |
| Profile, licences, vehicle | Live | |
| Messages | Branch | `/field/messages` |
| Fault Finder | **Blocked** | Switched off pending the copyright review. See §11 |

## 7. Materials and pricing

| Feature | Status | Notes |
|---|---|---|
| Material catalogue | Live | `master_products` |
| Price history | Live | `price_snapshots`, `price_changes` |
| Price movement alerts | Live | Configurable threshold |
| Manual price overrides | Live | |
| Pricing source strategy | Live | Median / average / lowest / cheapest trade / preferred |
| Favourite products | Live | |
| Supplier catalogue connector | Live | **Sparky Direct only**, static catalogue |
| **7 wholesaler feeds** | **Blocked** | Rexel, Haymans, L&H, Middy's, CNW, Ideal, C&W. Typed slots that throw. See §11 |
| Trade account linking | Live | Records the account; activates when a feed exists |
| **Scheduled price refresh** | **Needs key** | `CRON_SECRET`. Market + per-tenant trade pricing, weekdays 02:00 AEST |
| Purchase orders | Live | `purchase_orders` |

## 8. Team and permissions

| Feature | Status | Notes |
|---|---|---|
| Three roles: owner / manager / technician | Live | |
| RLS-enforced permissions | Live | Migration 024 |
| Cost and margin owner-only | Live | |
| Staff invites | Live | Fixed; uses Supabase Auth, not Resend |
| Staff records, licences, tickets | Live | `/dashboard/staff` |
| Company noticeboard | Live | `company_announcements` |

## 9. Communications

| Feature | Status | Notes |
|---|---|---|
| Customer email | **Needs key** | `RESEND_API_KEY`. Fails loudly rather than faking success. Unlimited |
| Customer SMS | **Needs key** | `TWILIO_*`. **Metered per plan** — 50 / 250 / 600 a month. Email keeps sending when it runs out |
| SMS allowance readout | Branch | `/dashboard/plan`, and `/api/sms/quota` for the field app |
| Message templates | Branch | `/dashboard/messages` |
| Automatic reminders | Branch | `/dashboard/reminders`, daily cron |
| Google review requests | Branch | On job completion |
| Review QR codes | Live | `/dashboard/reviews` |

## 10. Payments and subscriptions

Two **separate** money flows that get conflated:

**A. FieldMS charges the electrician** (SaaS subscription)
`tenant_subscriptions`, `/api/billing/checkout`, `/api/billing/portal`,
`/dashboard/plan`. Stripe Checkout. Two plans: Founding $69/mo, Standard
$99/mo. Status: **Branch**.

**B. The electrician charges their customer** ("Pay now" on an invoice)
`tenant_payment_accounts`, `/api/payments/connect`,
`/api/invoices/[token]/pay`. Stripe Connect. Status: **Branch**.

Flow B is the one where supporting more than one processor matters — see the
note at the end of this file.

| Feature | Status |
|---|---|
| Stripe subscription checkout | Branch |
| Customer billing portal | Branch |
| Stripe Connect onboarding | **Off** | `NEXT_PUBLIC_CUSTOMER_PAYMENTS_ENABLED` |
| Pay-now on customer invoices | **Off** | Same flag |
| Webhook idempotency | Branch |

## 11. Integrations

| Feature | Status | Notes |
|---|---|---|
| Xero OAuth | **Needs key** | `XERO_CLIENT_ID` / `SECRET` |
| Xero invoice + payment sync | **Off** | `NEXT_PUBLIC_ACCOUNTING_SYNC_ENABLED`. Real implementation, idempotent |
| MYOB OAuth | **Needs key** | `MYOB_*` |
| MYOB invoice + payment sync | **Off / Unverified** | Same flag. Never run against a company file — `preflightMyob()` first |
| Google Maps | **Needs key** | |
| Anthropic (Fault Finder) | **Blocked** | Switched off pending copyright review |

## 12. Platform

| Feature | Status | Notes |
|---|---|---|
| Multi-tenant with workspace switching | Live | |
| RLS on all 58 tables | Live | 110+ policies |
| iOS/Android home-screen app (PWA) | Live | Square icons, safe areas |
| Offline shell | Live | Network-first service worker |
| Onboarding wizard | Live | Mandatory, no skip |
| Branding | Live | |
| Data export | Branch | `/api/export` |
| SEO | Live | robots, sitemap, JSON-LD, canonicals |
| Audit tooling | Live | `npm run audit:all` |

---

## What is deliberately switched off

Three features are complete and switched off in `lib/features.ts`, because
being able to build something is not the same as being able to afford to run
it with one person and no revenue:

| Feature | Flag | Why |
|---|---|---|
| Fault Finder | `NEXT_PUBLIC_FAULT_FINDER_ENABLED` | Safety-critical advice; copyright review |
| Accounting sync | `NEXT_PUBLIC_ACCOUNTING_SYNC_ENABLED` | Breaks inside someone else's books; MYOB unverified |
| Customer card payments | `NEXT_PUBLIC_CUSTOMER_PAYMENTS_ENABLED` | Chargebacks, KYC, payouts; regulated |

Every flag is off unless the variable is exactly `"true"`, so a missing
variable fails safe. Turn each on for **one willing business** before everyone.

SMS is deliberately **not** flagged. It stays on and is metered instead.

---

## Not built at all

- **Payment processors other than Stripe** — see below
- **Inventory / stock control**
- **Purchase order → supplier transmission** (the table exists; nothing sends)
- **Recurring / maintenance contracts**
- **Multi-currency** (AUD only, correct for the market)
- **Push notifications**
- **Native iOS/Android apps** (PWA only)
- **Customer self-service portal** (token links only, no login)
- **Privacy policy and terms** — blocks any real launch

---

## On supporting more than one payment processor

Short answer: yes for flow B, and it is worth doing. Not for flow A.

**Flow A (FieldMS billing electricians) should stay Stripe-only.** You pick one
merchant account and keep it. Abstracting it buys nothing and doubles the
webhook surface, which is where payment bugs live.

**Flow B (electricians billing their customers) is different**, because the
electrician already has a merchant setup and will not open a second one to use
your software. In Australia that realistically means:

| Processor | Why it matters here |
|---|---|
| **Stripe Connect** | Already built. Best API, works everywhere |
| **Square** | Very common with AU trades; strong API; same company does the card reader in their van |
| **Zeller** | Australian, aimed squarely at trades, growing fast |
| **Tyro** | Big in AU SMB EFTPOS; API exists but is heavier |
| **PayPal** | Ubiquitous, poor fit for trade invoicing, high fees |
| **GoCardless / Ezidebit** | Direct debit — the right answer for maintenance contracts, not one-off jobs |

The work is a provider interface — `createPaymentLink(invoice)`,
`verifyWebhook(req)`, `recordPayment(event)` — with Stripe as the first
implementation and `tenant_payment_accounts` gaining a `provider` column. The
Stripe code is already close to this shape, so it is a refactor rather than a
rewrite.

**Two things to settle before building it**, neither of which is code:

1. **Does a second processor actually win you customers?** One processor done
   properly beats three done partly. Worth asking your first ten users what
   they already use before writing any of it.
2. **Facilitating payments between two other parties is a regulated space in
   Australia.** Stripe Connect's standard model puts most of that burden on
   Stripe, which is exactly why it is the sane starting point — but adding
   processors multiplies that question rather than repeating it. This belongs
   in `LEGAL_REVIEW_REQUIRED.md` §A before, not after.
