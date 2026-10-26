# Can FieldMS be sold yet?

23 October 2026, updated same day after a fix pass.
Checked against the live site and the repository, not against memory.

**Fixed since the first version of this file:** A1, A2, A3, A4 and the C3
harness. What remains is almost entirely things only you can do — push,
migrations, credentials, key rotation, insurance, and a lawyer's read of the
two legal pages that now exist.

## Short answer

**No — and the main reason is simpler than you'd think: nobody can pay you.**

Production has no payment system at all. Every piece of the Stripe work is on
an unpushed branch. Verified just now against fieldms.com.au:

| URL | Status |
|---|---|
| `/dashboard/plan` | **404** |
| `/api/stripe/webhook` | **404** |
| `/api/sms/quota` | **404** |
| `/privacy` | **404** |
| `/terms` | **404** |

The landing page also still says, truthfully for now, *"there is nothing to pay
and no card to enter."*

The good news: the product underneath is real and the genuinely dangerous
things are dealt with. The copied manual is gone, the cross-tenant OAuth hole
is closed, the false "sent" audit records are fixed, and `npm audit` is clean.
What's left is mostly paperwork and a push.

---

## A. Must be resolved before taking a single dollar

### A1. Privacy policy — **BUILT, needs legal review**

`/privacy` now exists, is linked from the footer and is in the sitemap.

Every factual statement in it was checked against the schema, the RLS policies
and the third-party calls in this repo: what is collected, who can see it,
which providers receive it, what leaves Australia. It separates the business's
own data from its *customers'* data, which is the whole privacy question here.

It carries a visible notice that it has not been reviewed by a lawyer. That
notice is in the page, not just a code comment, so nothing reads as settled
when it is not. **Delete `REVIEW_NOTICE` in `components/LegalShell.tsx` once a
lawyer has signed it off.**

The original problem, for the record:

FieldMS stores names, addresses, phone numbers, email addresses, job history,
site details, compliance records and employee GPS locations. Most of that is
personal information about **your customers' customers** — people who never
agreed to anything with you.

You cannot charge businesses to hold that without telling them how you handle
it. It also blocks any App Store submission later.

### A2. Terms of service — **BUILT, needs legal review**

`/terms` now exists and covers the operational facts: what the plans cost, how
billing and cancellation work, acceptable use, data ownership, what FieldMS
explicitly does *not* do (it does not certify electrical work).

**Limitation of liability and indemnity are deliberately not drafted.** Those
clauses allocate risk between two parties, which cannot be checked against
code, and an unenforceable exclusion can poison the clauses around it. The page
says so plainly rather than inventing wording. That is the single thing a
lawyer must add.

The original problem, for the record: Selling software with no contract means no limitation of
liability, no acceptable use, no termination rights, no statement that the user
is responsible for verifying their own electrical work.

For a product that touches compliance records, that gap is the whole ball game.
Drafted by a lawyer, not by me — the structure needed is in
`LEGAL_REVIEW_REQUIRED.md` §A2.

### A3. False claims — **FIXED**

Fault Finder was already out of the feature grid on the branch. The other two
are now corrected: "Import your wholesaler price lists" became a description of
setting your own prices (`lib/pricing/importers.ts` parses files but no UI ever
called it), and the Xero step became "Make it yours".

What was on the live page:

| Claim on the page | Reality |
|---|---|
| *"Fault Finder — An AI offsider for electricians, trained on the fault finding process and the rules you work to"* | Switched off. The knowledge base was removed over the copyright question |
| *"push invoices to Xero"* | Accounting sync is switched off by default |
| *"Import your wholesaler price lists"* | There is no import path, and no live wholesaler feed |

Advertising these while free is already awkward. Advertising them while
charging is misleading conduct under the Australian Consumer Law. Either
remove them from the page or switch the features on — not both.

### A4. Pricing contradiction — **FIXED**

`lib/plans-public.ts` is now the single source of prices, imported by both the
landing page and `lib/stripe.ts`. The page cannot advertise a figure the
checkout does not charge, because they read the same constant. The JSON-LD
`offers` block now carries the real price instead of `0`.

**One decision left for you: `GST_REGISTERED` in `lib/plans-public.ts`.** It
defaults to `false`, which is correct for a pre-revenue business — while
unregistered you must not charge GST. Flip it on registration, and decide then
whether to absorb the 10% or raise the price. Much easier before customers than
after.

Also caught during this pass: I briefly changed the CTA to "Start free trial".
There is no trial — `app/api/billing/checkout` sets no `trial_period_days`, so
nothing creates one. Reverted to "Get started". **If you want a trial, that is
a pricing decision to make deliberately, not a copy change.**

---

## B. Technically blocking

### B1. Everything is on an unpushed branch

`origin/main` is many commits behind. Stripe, SMS quotas, feature flags, job
packages, the scheduled price refresh, MYOB, the honesty fixes — none of it is
live. Nothing in sections C or D matters until this is pushed and deployed.

### B2. Two migrations have not been run

- `028_job_packages.sql` — Packages errors without it
- `supabase/GENERATE_JOBS_BASELINE.sql` — run once, save the output as `migrations/000_baseline_jobs.sql`, so the database can be rebuilt from git
- `034_sms_quota.sql` — the SMS quota lookup errors without it

Both are verified to survive the Supabase editor splitting on semicolons.

### B3. Environment variables unconfirmed in production

I can read `.env.local` but not your Vercel project. At minimum you need:
`RESEND_API_KEY` (or nothing is emailed), `TWILIO_*` (or no texts),
`CRON_SECRET` (or no scheduled pricing), `STRIPE_*`, and
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

**Check `RESEND_API_KEY` first.** Without it, every quote and invoice you think
you've sent has gone nowhere.

---

## C. Security and operations

| | Item | Status |
|---|---|---|
| C1 | **Rotate `SUPABASE_SERVICE_ROLE_KEY`** — it was exposed in a browser console during debugging | Outstanding as far as I can tell |
| C2 | **Disable the five `demo1234` accounts** — `supabase/DISABLE_DEMO_USERS.sql` is written and ready | Unknown whether it has been run |
| C3 | **Cross-tenant isolation tested at runtime** — harness now written: `npm run test:isolation`. Two real users in two workspaces, 34 tenant-scoped tables, IDOR, cross-tenant writes, privilege escalation, storage, unauthenticated access | **Harness ready, NOT YET RUN** |
| C4 | Backups and restore tested | Not done |
| C5 | Incident response plan | Not written |

C3 is still the one I'd least like to skip, but it is now one command rather
than a project. It needs a staging Supabase project and
`ALLOW_WRITES=1 npm run test:isolation` — it refuses to run otherwise, so it
cannot be pointed at production by accident. Everything says the isolation is
correct; this is what would prove it.

---

## D. Business, not code

None of these are things I can do, and all of them want doing before money
changes hands:

- **GST registration.** The threshold is $75k turnover. Decide and document
  before you invoice, because retrofitting GST to issued invoices is painful.
- **Professional indemnity insurance.** A product that helps businesses meet
  compliance obligations may not fit a standard software PI policy. Raise it
  with a broker early — see `BUSINESS_RISK_REVIEW.md` (not yet written).
- **Refund and cancellation policy.** Required by the subscription terms, and
  by Stripe.
- **Company structure and director liability.** Worth an accountant's hour.

---

## What's genuinely ready

Worth saying plainly, because the list above is long and the product is not the
problem:

- Jobs, scheduling, customers, sites, quotes, invoicing, variations
- Test sheets, certificates, the compliance register, forms, signatures
- The field app, with role boundaries enforced in the database rather than the UI
- Job packages, material pricing and price history
- Multi-tenant isolation with RLS on all 58 tables and 110+ policies
- The iPhone home-screen app
- 0 dependency vulnerabilities, 13/13 security tests, clean RLS audit

That is a real product. It is the wrapper around it that isn't ready.

---

## The order I would do it in

1. **Push the branch and deploy.** Still the first thing, and still not done —
   I could not drive GitHub Desktop this session. Nothing else is testable
   until the branch is on origin.
2. **Run migrations 028 and 032.**
3. **Rotate the service role key. Run `DISABLE_DEMO_USERS.sql`.** (C1, C2)
4. **Confirm `RESEND_API_KEY` in Vercel** and send yourself a real quote.
5. **Send `/privacy` and `/terms` to a lawyer.** They exist and are accurate
   about the system; what they need is the liability drafting and an
   Australian Privacy Principles read. Still the long pole, but you are now
   handing over a draft rather than a blank page.
6. **Decide `GST_REGISTERED`**, and whether you want a free trial. (A4)
7. **Run `npm run test:isolation`** against a staging project. (C3)
8. **Insurance and company structure.** (D)
9. **Then** charge somebody.

Steps 1–4 are an afternoon. Step 5 sets your actual launch date.

---

## One honest caveat

I've checked what can be checked from the code and the live site. I cannot see
your Vercel environment variables, your Supabase dashboard, your Stripe account
or whether any of the SQL scripts have actually been run. Where this file says
"unknown", it means I could not verify it rather than that it is fine.

And nothing here is legal advice. A1, A2, A3 and D are flagged because the gaps
are factual; what to do about them is a lawyer's call.
