# FieldMS: feature gaps and flow simplification

*August 2026. Gaps measured against ServiceM8, Simpro, Tradify and AroFlo as they ship today, and against what's actually in this codebase (routes, tables, migrations) rather than what the README claims.*

---

## Part 1: The one gap that matters most

**There is no customer record.**

Every competitor is built on a customer, and everything hangs off it. FieldMS stores the customer as four free-text columns on each job:

```
jobs.customer_name, customer_phone, customer_email, customer_address
```

There is no `customers` table, no `sites` table. Type "Acme Corp" slightly differently on two jobs and they are two unrelated strings.

What this silently costs you:

- No job history for a repeat customer, so a tech arriving at a site cannot see what was done last time
- No "customers who haven't booked in 12 months" list, which is the cheapest revenue in a trade business
- No customer-level debtors view; you can only see unpaid invoices job by job
- No multi-site customers, so a real estate agency with 40 properties is unmodellable
- Duplicate, inconsistent data on every quote and invoice you send

Nothing else on this list is worth building before this. It is a schema change plus a backfill that groups existing jobs by normalised name and email, and it unlocks half of Part 2 for free.

---

## Part 2: Feature gaps, ranked by impact

### Tier 1: you will lose deals without these

**1. Customers and sites** — see above. `customers`, `sites`, `jobs.customer_id`, `jobs.site_id`.

**2. Assets and asset test history**
ServiceM8 sells customer-owned assets with location on site and PDF asset reports. Simpro's Maintenance Planner schedules recurring work against assets and lets techs scan a QR or barcode on arrival.

You are unusually well placed here and haven't taken it. `job_test_sheets` already stores circuit-level results as JSONB. Attach those to a persistent **switchboard** asset instead of a one-off job, and you get something none of the generic tools have: *"this board, tested annually since 2023, here is the RCD trip time trending upward."* That is a compliance story and a recurring revenue story in one.

**3. Recurring maintenance and service agreements**
You have `jobs.recurrence` (`weekly`/`fortnightly`/`monthly`) and that is all. Missing: a maintenance planner view, SLAs with response times, recurring invoice templates, and auto-generation of the next job on completion. Simpro and ServiceM8 both automate the whole cycle. Maintenance contracts are what turn a lumpy trade business into predictable monthly revenue, so this sells itself to owners.

**4. Real payment capture**
`job_payments` has `kind` (deposit/payment/refund) and `method` as a free-text string. There is no payment processor wired in. Competitors take card payment on site and deposits on quote acceptance. "Pay now" on your public invoice page is a button that currently cannot charge anything.

### Tier 2: expected as standard, absence looks cheap

**5. Online booking**
ServiceM8 ships 24/7 booking that lands straight in the calendar. You have no public request form at all. For a sole trader this is often the single feature that wins the sale, because it is the only one their customers see.

**6. Supplier bill capture**
You have `purchase_orders` and a strong pricing catalogue, but nothing ingests a supplier invoice. Tradify's SmartRead extracts vendor, line items, GL codes and totals from a PDF or photo. You already pay for an Anthropic key and Claude reads images natively, so this is one of the cheapest high-value features on the list.

**7. Stock and van inventory**
`master_products`, `supplier_products` and `tenant_price_overrides` give you pricing but no quantities. No on-hand stock, no van stock, no "allocate materials to job and decrement". Simpro treats this as core; it is a common reason shops outgrow Tradify and ServiceM8.

**8. Timesheet approval and payroll export**
`time_entries` has a `submitted` boolean and nothing else. No approver, no approved-at, no locking, no CSV export for Xero payroll or MYOB. Right now a business owner still does payroll by hand, which undoes much of the time you saved them.

**9. Route and map view**
You have `job_location_updates` and customer tracking tokens, so you have the hard part. What is missing is the easy, visible part: today's jobs on a map, ordered sensibly, with drive time. Every competitor shows this.

### Tier 3: differentiators once the basics are covered

**10. Automated customer comms** — "on the way" SMS, appointment reminders, review request after completion. You have Twilio and Resend wired and `reviews` exists; nothing fires automatically.

**11. Reporting** — the dashboard shows P&L by quarter. No job profitability by type, no quote conversion rate, no tech utilisation, no debtor ageing. Owners ask for these in month two.

**12. Compliance calendar** — licence and insurance expiry, test-and-tag due dates, calibration reminders. You already store `qualifications` and `licences` on profiles with no expiry dates attached.

---

## Part 3: The flow problem

### Symptom: sixteen destinations, no spine

Current navigation is 5 primary plus 11 in More:

> Dashboard · Jobs · Plans · Billing · Forms · **More:** Setup, Branding, Integrations, Staff, Team, Materials, Test Sheets, Site Reports, Reviews QR, Schedule, Fault Finder

This is organised by **what the software has**, not by **what the user is doing**. Three specific problems:

1. **The job is fragmented across five tabs.** One job's quote is in Billing, its documents in Plans, its certificate in Test Sheets, its photos in Site Reports, its checklist in Forms. To answer "where is this job up to?" the owner visits five places and assembles the answer in their head. Every competitor puts all of it on one job record.

2. **Staff and Team are two different things with one name.** Nobody can guess which is which without clicking both.

3. **Schedule is buried in More** while Plans sits in primary. Schedule is used daily, Plans occasionally.

### Fix: reorganise around the job lifecycle

**Money in → Work → Money out → Who does it**

```
Today      the dashboard: what's happening now, what needs a decision
Schedule   calendar and map, promoted out of More
Jobs       every job, with quote/docs/forms/certs/photos/invoice on ONE record
Customers  new. customers, sites, assets, history, debtors
Money      quotes, invoices, payments, purchase orders, supplier bills
More       Setup, Team, Materials, Fault Finder, Reports
```

Six destinations instead of sixteen, and each maps to a question an owner actually asks.

### The single highest-value UI change: one job record with tabs

Rather than Jobs listing basics and sending you elsewhere for everything else, open a job to:

```
┌────────────────────────────────────────────────┐
│ Switchboard upgrade · Acme Corp · In progress  │
│ Overview │ Quote │ Materials │ Forms & Certs │ │
│          │ Photos │ Time │ Invoice             │
└────────────────────────────────────────────────┘
```

Same data, same tables, no schema change. It removes the cross-referencing work the owner currently does mentally, and it is the change most likely to make someone say the app feels simpler.

### Field app: one thumb, one screen

The field app already has the right instinct with a five-tab bar. Push further:

- **Job screen should be a vertical timeline**, not a menu of links: Arrive → Photos → Work done → Materials used → Test sheet → Signature → Complete. The tech scrolls down and finishes at the bottom. No decisions about where to go next.
- **Big touch targets, no typing where possible.** Materials by search-and-tap from favourites, not free text. Time by one Clock on button.
- **Offline honesty.** Show clearly what has and has not synced. This is the top complaint in every competitor's reviews, and getting it visibly right is cheap credibility.

### Setup: stage it rather than front-load it

You now have a seven-step wizard before anyone sees the product. That is a lot of work before any value is demonstrated. Consider asking for the minimum up front (business name, trade) and requesting the rest **at the moment it's needed**: ask for the logo the first time they send a quote, the licence number the first time they issue a certificate, wholesalers the first time they add materials. Same information, collected when its purpose is obvious, with a Setup page that shows overall progress.

---

## Suggested order

| Order | Work | Why |
|---|---|---|
| 1 | Customers and sites, with backfill | Unblocks everything below |
| 2 | One job record with tabs | Biggest felt simplification, no schema change |
| 3 | Nav reorganisation to six destinations | Cheap, immediately obvious |
| 4 | Assets and asset test history | Your genuine differentiator, builds on test sheets |
| 5 | Payments wired to a real processor | Directly monetisable, unblocks deposits |
| 6 | Recurring maintenance and agreements | Turns customers into recurring revenue |
| 7 | Supplier bill capture via Claude | Cheap given the API key is already in place |
| 8 | Timesheet approval and payroll export | Completes the admin-saving promise |

Items 1 to 3 are the ones that change how the product feels. Everything after that is catching up on table stakes, and none of it lands properly until the customer record exists.

---

## Sources

- [ServiceM8 Feature Overview](https://www.servicem8.com/us/feature-overview)
- [Simpro Asset Maintenance](https://www.simprogroup.com/solutions/asset-maintenance)
- [Simpro Maintenance Planner](https://www.simprogroup.com/features/maintenance-planner)
- [Tradify Review 2026, SaaSrat](https://saasrat.com/products/tradify)
- [AroFlo, GetApp 2026](https://www.getapp.com/operations-management-software/a/aroflo/)
- [Top 10 field service management software 2026, IFS](https://www.ifs.com/en/glossary/compare/top-10-field-service-management-software-2026)
- [Field service management software vendors to know, TechTarget](https://www.techtarget.com/searchcustomerexperience/tip/Field-service-management-software-vendors-to-know)
