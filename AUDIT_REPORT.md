# FieldMS — security, privacy and product-risk audit

Date: 21 September 2026 · Commit: working tree at `9467e07`

**Scope note.** This is a first pass, not a completed hardening programme. The
brief asked for 29 workstreams and nine documents. What follows is what was
actually audited, actually found and actually fixed, and an explicit list of
what was not. Sections marked **NOT DONE** were not done — they are not
summarised, glossed, or filled with plausible-sounding text.

---

## Two premises in the brief that do not match the code

Worth correcting before anything else, because they change what the risks are:

1. **"paid SaaS"** — there is no payment processor. No Stripe, no billing
   tables, no subscription state, no checkout. Brief §6 audits a flow that does
   not exist. The relevant risk is the opposite one: the marketing must not
   imply billing that cannot happen.
2. **"electrical and HVAC"** — HVAC was deliberately removed and is marked
   "coming soon". `lib/trades.ts` enforces electrical-only entitlement
   server-side. Brief §3's HVAC items do not apply.

---

## Architecture as found

| | |
|---|---|
| Framework | Next.js **16.2.3 → 16.3.5** (upgraded, see C2), App Router, Turbopack, TypeScript |
| Scale | 23,662 lines TS/TSX · 53 page routes · 18 API routes · 27 migrations · 49 tables |
| Auth | Supabase Auth (email/password) via `@supabase/ssr`; `AuthContext` client-side |
| Database | Supabase Postgres, RLS on all 49 tables, 108 policies |
| Multi-tenancy | `tenants` + `tenant_members`; `tenant_id` on 36 tables, `business_id` on the estimates family |
| Roles | owner / manager / technician (`lib/roles.ts`), enforced in RLS by migration 024 |
| Service role | `utils/supabase/admin.ts`, used in **18 modules** — bypasses RLS entirely |
| Storage | 4 private buckets, tenant-prefixed paths, signed URLs (1h) |
| AI | Anthropic `claude-sonnet-5`, streaming, 185KB system prompt |
| Third parties | Anthropic, Resend (email), Twilio (SMS), Xero/MYOB (OAuth), Google Maps |
| Payments | **None** |
| Background jobs | One cron-ish route (`/api/pricing/refresh`), `CRON_SECRET`, fails closed |

### Tenant isolation posture

`node scripts/audit-rls.mjs` (written for this audit) reports:

- **49/49 tables have RLS enabled**
- **49/49 have at least one policy** — 108 policies total
- Tenant-scoping is via `tenant_members` subqueries, consistently
- 4 tables scope through a foreign key rather than a direct `tenant_id`
  (`job_invoice_items`, `purchase_order_items`, `tenant_material_kit_items`, and
  the estimates family via `business_id`) — each verified by hand, all correct
- 5 tables are intentionally global reference data (`master_products`,
  `supplier_products`, `price_snapshots`, `price_changes`, `asset_types`),
  readable by any authenticated user. **Verified correct**: these hold
  market/list prices, not tenant trade pricing. Tenant-specific pricing lives in
  `tenant_trade_prices` / `tenant_price_overrides`, both properly scoped.

**The database layer is in better shape than expected.** The real exposure was
above it, in the 18 modules that bypass RLS with the service-role key.

> **On the first run of `audit-rls.mjs` it reported 32 CRITICALs and zero
> policies everywhere.** That was a bug in my own regex — quoted policy names
> contain spaces. The script now refuses to emit a report if its parsed policy
> count is below a plain-text count of `CREATE POLICY`. Mentioned because a
> confident, well-formatted, completely wrong security report is worse than no
> report, and it nearly shipped.

---

## CRITICAL

### C1 · Copyrighted book embedded in the product — **NOT FIXED, needs your decision**

`knowledge/fault-finder/fault_finding_manual.md` is a complete OCR transcript of
*Fault Finder's Bible: Electrical Edition*, © 2025 Fault Lab, ISBN
978-1-7641674-0-6, reproduced in full, shipped to production, and transmitted to
Anthropic on every message.

Full analysis and options in **`STANDARDS_IP_REVIEW.md`**. This is the single
most serious finding in the audit and cannot be fixed in code.

### C2 · Next.js 16.2.3 — unauthenticated RCE and middleware bypass — **FIXED**

`npm audit` reported 7 vulnerabilities, 1 critical. Next.js 16.2.3 was exposed
to 24 advisories including *Unauthenticated Remote Code Execution in the Image
Optimization API when AVIF files are used*, *Middleware/Proxy bypass in App
Router*, SSRF in Server Actions, and multiple cache-poisoning issues.

Upgraded to **16.3.5** (non-breaking), plus `npm audit fix` for `ws`, `nanoid`,
`postcss` and `sharp`. **`npm audit` now reports 0 vulnerabilities.** Type check
and production build both pass.

### C3 · OAuth cross-tenant takeover of accounting integrations — **FIXED**

`/api/integrations/[provider]/connect` had **no authentication at all**. It took
`tenant_id` from a query string, trusted it, and packed it into a **plain
base64** cookie. The callback verified that *somebody* was signed in, then wrote
the resulting Xero/MYOB tokens against whatever tenant id came out of that
cookie — with no check that the caller belonged to it.

**Attack:** a signed-in user of Tenant A requests
`/api/integrations/xero/connect?tenant_id=<Tenant B>`, completes OAuth with
their own Xero account, and the callback attaches their credentials to Tenant
B's workspace. Tenant B's invoices then sync into the attacker's accounting
system. Unauthenticated entry point, cross-tenant write, standing exfiltration
channel. base64 being an encoding rather than a signature meant the cookie was
forgeable too.

**Fix:** `lib/oauth-state.ts` HMAC-signs the state (constant-time verify);
`lib/authz.ts` requires **owner** role on the named tenant at both connect and
callback; the flow is bound to the initiating user; membership is re-checked at
the point of write rather than trusted from a 10-minute-old cookie.

Covered by 5 regression tests in `scripts/security-tests.mjs`, including a test
that performs the actual tamper.

---

## HIGH

### H1 · IDOR on job events — **FIXED**

`GET /api/jobs/[jobId]/events` checked only that *someone* was signed in, then
read through the service-role client. Any authenticated user of any workspace
could read any job's event history by supplying its id. RLS could not catch it
because the service role bypasses RLS. Now uses `requireJobAccess()`.

### H2 · `getSession()` used for authorisation — **FIXED**

Four server routes authorised on `supabase.auth.getSession()`, which decodes the
session from request cookies locally and does **not** revalidate it against
Supabase Auth — so it will return a session for a revoked token. Supabase's own
guidance is never to authorise on it in server code. All four now use
`getUser()` via `lib/authz.ts`.

### H3 · AI endpoint accepted arbitrary conversation input — **FIXED**

`/api/assistant` took `messages` from the request body with only an
`Array.isArray` check and passed the array verbatim to the model.

- **Forged assistant turns.** A caller could submit `role:"assistant"` messages
  they wrote themselves, which the model treats as its own prior output — the
  most reliable way to talk a model out of its persona. On a product giving
  electrical diagnostic advice, the persona *is* the safety control.
- **A smuggled `role:"system"` message** could rewrite the persona outright.
- **No rate limit**, on an endpoint that prepends a 185KB system prompt to every
  request — an unmetered way to spend the API budget.

**Fix:** `lib/ai-safety.ts` — strict shape validation (user/assistant only,
string content only, must end on a user turn), caps (40 messages, 8k chars each,
60k total), and a per-user rate limit. 8 regression tests.

**Partially fixed:** the rate limiter is in-memory, so on serverless it resets
on cold start and does not coordinate across instances. It raises the cost of
abuse; it does not prevent it. A shared store is the real fix.

### H4 · Unrestricted file types in two buckets — **NOT FIXED**

`job-plans` and `form-attachments` have `allowed_mime_types = NULL` — any file
type, including HTML and executables. Served via signed URLs from the Supabase
domain, an uploaded HTML file is a stored-XSS vector against that origin.
`branding` and `job-photos` are correctly restricted. Fix: add allowlists to
migration 026 (PDF/image/DWG for plans; PDF/image for attachments).

### H5 · `public.jobs` has no migration — **NOT FIXED**

The central table of the application — referenced by 15 migrations — has no
`CREATE TABLE` anywhere in `supabase/migrations/`. Consequences: the database
cannot be rebuilt from source; `jobs`' own RLS policies cannot be reviewed in
git; and `audit-rls.mjs` cannot verify the table that matters most. There are
also two migrations numbered `020`. A baseline migration dumped from the live
schema is the fix.

### H6 · No audit trail for AI or electrical advice — **NOT FIXED**

Brief §3 and §22 require recording who generated advice, when, with what
inputs/outputs, which model, which knowledge-base version, and whether the user
acknowledged or overrode it. **None of this is persisted** — Fault Finder
conversations are not stored at all. Response headers now carry provenance
(`X-FieldMS-Generated-By-AI`, model, timestamp), which is a marker, not an audit
trail. This is the largest remaining gap against the brief.

### H7 · No privacy policy or terms — **NOT FIXED**

The footer "Privacy" link points at `#`. FieldMS stores other businesses'
customer names, addresses, phone numbers, job history and compliance records —
i.e. personal information held on behalf of third parties. No privacy policy, no
terms, no acceptable use policy, no data-processing terms. See
`LEGAL_REVIEW_REQUIRED.md`.

---

## MEDIUM

| # | Finding | Status |
|---|---|---|
| M1 | Storage paths use `Math.random()` (`lib/photos.ts`, `lib/plans.ts`) — not cryptographically random. Mitigated by private buckets + signed URLs + tenant-prefixed paths, so low real impact, but `crypto.randomUUID()` is free | Not fixed |
| M2 | Service role used in 18 modules. Each now carries its own auth check, but the pattern means one forgotten check is a full cross-tenant breach with no RLS backstop | Structural |
| M3 | Five demo accounts share the password `demo1234` and are live on a public domain | Not fixed — known |
| M4 | `SUPABASE_SERVICE_ROLE_KEY` exposed in a browser console during earlier debugging and still not rotated | Not fixed — known |
| M5 | No MFA | Not implemented |
| M6 | No security headers (CSP, HSTS, X-Frame-Options) beyond the `X-Robots-Tag` rules added for SEO | Not fixed |
| M7 | Role model mismatch — `lib/auth.ts:24` casts to the old role union and never calls `normaliseRole` | Not fixed — known |
| M8 | Invite flow broken; onboarding swallows the error silently | Not fixed — known |

---

## Fixed in this pass

| | Finding | Verification |
|---|---|---|
| C2 | Next.js RCE + 6 other CVEs | `npm audit` → 0 vulnerabilities; build passes |
| C3 | OAuth cross-tenant takeover | 5 tests, incl. real tamper attempt |
| H1 | Job-events IDOR | Code review; `requireJobAccess` |
| H2 | `getSession()` authorisation ×4 | No `getSession` left in `app/api` |
| H3 | AI input validation + rate limit | 8 tests |

**13/13 tests pass.** Mutation-checked: deliberately reintroducing the system-role
bypass and the signature-skip each turn the suite red, so the tests can fail.

```
node scripts/security-tests.mjs      # 13 tests
node scripts/audit-rls.mjs           # tenant isolation report
```

---

## NOT DONE

Listed rather than summarised, because a half-done security workstream that
reads as complete is worse than an absent one.

| Brief § | Workstream | Why not |
|---|---|---|
| 2 | **Live cross-tenant penetration tests** | Needs a real Supabase project with two tenants and two users. Static analysis and route review were done; nothing was executed against a live database. **The isolation claims above are unproven at runtime.** |
| 6 | Subscriptions / payments | No payment system exists |
| 9 | Privacy data inventory | Not started — 49 tables need field-by-field classification |
| 10 | MFA, CSRF, SSRF, security headers, input validation sweep | Only the items above |
| 11 | Incident response, admin audit logging | Not started |
| 12 | Location/GPS retention and disclosure | Route secured (H1/H2); policy and retention untouched |
| 13 | File upload hardening | H4 identified, not fixed |
| 14 | Financial calculation server-side validation | Not audited |
| 15 | Supplier pricing wording | Not audited |
| 16 | Third-party integration review | Only Xero/MYOB auth |
| 18–21 | User content, backups/DR, deletion/export, granular roles | Not started |
| 23–24 | Safety confirmations, error handling sweep | Not started |
| 25 | Billing / data / electrical test suites | Only security tests |
| 27 | Insurance and business structure | `BUSINESS_RISK_REVIEW.md` not written |

Documents **not** produced: `MARKETING_CLAIMS_AUDIT.md` (partial prior work
exists in `CLAIMS_AUDIT.md`), `SECURITY_INCIDENT_RESPONSE.md`,
`DISASTER_RECOVERY.md`, `BUSINESS_RISK_REVIEW.md`.

---

## Recommended order

1. **Decide on the Fault Lab manual** (C1). Everything else is smaller.
2. Rotate the service role key; remove the `demo1234` accounts (M3, M4).
3. Deploy the fixes in this pass — the Next.js RCE in particular.
4. Baseline migration for `jobs` (H5); then re-run `audit-rls.mjs`.
5. Privacy policy and terms (H7) — blocks any real launch.
6. Live cross-tenant tests against a staging project (§2).
7. AI/electrical advice audit trail (H6).

---

## What this audit does not establish

FieldMS has not been made "legally compliant", "safe" or immune from anything.
This pass found and fixed five specific defects, identified a serious IP problem
that only you can resolve, and left roughly two-thirds of the requested
programme undone. The tenant-isolation findings are based on reading the
migrations and the routes — **they have not been tested against a running
database**, and until they are, treat them as a design review rather than
assurance.

One operational note: the dependency work ran in a Linux sandbox, so
`node_modules` now holds Linux binaries. **Run `npm install` on your Mac** before
`npm run dev`, or the build will fail locally.
