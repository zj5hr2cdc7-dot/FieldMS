# Legal review required

Unresolved items from the audit of 21 September 2026, grouped by who needs to
look at them. Nothing here is legal advice. Where a question needs a lawyer it
is listed as a question, not answered.

---

## A · Must be reviewed by an Australian lawyer

### A1 — The Fault Lab manual · **BLOCKING**

`knowledge/fault-finder/fault_finding_manual.md` is a complete OCR transcript of
*Fault Finder's Bible: Electrical Edition* (© 2025 Fault Lab, ISBN
978-1-7641674-0-6), reproduced in full in a commercial product and transmitted
to Anthropic on every message. Its copyright page prohibits reproduction without
written permission.

Questions: exposure; whether Fault Finder can operate at all before a licence;
whether OCR transcription changes anything; whether transmission to a third-party
AI provider is a separate act; whether stopping now cures past use.

Detail in `STANDARDS_IP_REVIEW.md` §1. **This is ongoing while the feature is
live** — that should drive the timeline more than anything else in this file.

### A2 — Terms of Service

Does not exist. Needs to address: user responsibility for verifying electrical
work; that FieldMS is decision support and not a certifying authority;
professional licensing obligations sitting with the user; AI limitations;
third-party service dependencies; user-generated content; account security;
acceptable use; suspension and termination; data handling; backups; service
interruptions; IP; disputes; and limitation of liability **to the extent
permitted** — the non-excludable ACL guarantees cannot be contracted out of, and
attempting it is itself a risk.

### A3 — Privacy Policy · **BLOCKING for launch**

Does not exist; the footer link points at `#`. FieldMS holds names, addresses,
phone numbers, email addresses, job history, site details, compliance records and
**employee GPS location** — much of it personal information about third parties
(your customers' customers), where the FieldMS user is the collector and FieldMS
is the processor.

Also required before any App Store submission.

### A4 — User content

Users upload plans, photos, manufacturer documentation and customer records,
some of it third-party copyrighted. Needed: a warranty that the user has the
right to upload; a licence to FieldMS **narrow enough to run the service and no
broader** (do not claim ownership of customer content); a takedown path;
unlawful-content handling; what happens on termination.

### A5 — Marketing claims

`CLAIMS_AUDIT.md` covers earlier removals. Still outstanding: **"AS/NZS 3000
aware"** (login page) and `"AS/NZS 3000 compliance software"` (metadata
keywords) — nothing verifies any workflow against any clause. Standards
Australia actively protects its marks, and implied endorsement is the line.

Structural point: the product must never say it makes a business compliant.

### A6 — Australian Consumer Law

Guarantees of acceptable quality and fitness for purpose apply and cannot be
excluded. Relevant because the product is sold to trade businesses to help them
meet compliance obligations — the gap between what the marketing implies and
what the software verifies is the exposure.

### A7 — Employee location tracking

`job_location_updates` records employee GPS. Australian workplace surveillance
law is **state-based and inconsistent** (NSW and ACT have specific notice
regimes; others differ). Needs: what notice is required, whether consent is
needed, retention limits, and who may view location history.

Currently there is no disclosure, no retention limit, no configurable work-hours
window, and no access logging.

### A8 — Data breach notification

The Notifiable Data Breaches scheme may apply depending on turnover and the
nature of the data. Needs a determination of whether FieldMS is caught, and what
the obligations are. No incident response plan exists
(`SECURITY_INCIDENT_RESPONSE.md` was not written).

### A9 — Subscription terms

Not urgent — there is no payment processor. Must be settled **before** billing
goes live: price, GST treatment, recurrence, renewal timing, cancellation
method, trial duration, price after trial, refunds. Do not build checkout before
this is drafted.

---

## B · Should be reviewed by a privacy professional

| | |
|---|---|
| B1 | **Data inventory** — 49 tables, not yet classified field by field. Brief §9 asked for purpose, retention, access, third parties, storage location, deletion process, sensitivity. Not started |
| B2 | **Data minimisation** — is every field collected actually used? GPS in particular |
| B3 | **Retention** — nothing is ever deleted. No retention policy anywhere |
| B4 | **Deletion and export** — no account deletion flow, no business deletion flow, no export. Users cannot get their data out or have it removed |
| B5 | **Cross-border** — Supabase region, Anthropic (US), Resend, Twilio. Which data leaves Australia, and is that disclosed? |
| B6 | **Access logging** — no record of who viewed which customer record or location history |
| B7 | **Sub-processors** — Anthropic, Resend, Twilio, Xero/MYOB, Google Maps, Supabase, Vercel. Needs a disclosed list |

---

## C · Should be reviewed by a licensed electrician

| | |
|---|---|
| C1 | **`knowledge/fault-finder/system_prompt.md` is a safety control.** It has never had an electrician's review. See `AI_SAFETY_POLICY.md` §2 for the gaps — no prohibition on inventing clause numbers, no isolation-first sequencing, no default verification framing |
| C2 | **Test sheet fields and any pass/fail logic** — whether the recorded fields are the right ones, and whether anything in the UI presents a verdict the software is not entitled to give |
| C3 | **Certificate output** — what the generated certificate asserts, and whether it could be read as FieldMS certifying the work |
| C4 | **Compliance register intervals** — test intervals and next-due dates are presented as authoritative. On what basis? |
| C5 | **The §4 wording replacements** in `AI_SAFETY_POLICY.md` — the aim is to stop the software asserting what only a licensed person can assert, without making it useless |

---

## D · Engineering fix

| | | Status |
|---|---|---|
| D1 | Next.js RCE + 6 CVEs | **Fixed** — 16.3.5, 0 vulnerabilities |
| D2 | OAuth cross-tenant takeover | **Fixed** — signed state + owner check |
| D3 | Job-events IDOR | **Fixed** |
| D4 | `getSession()` authorisation ×4 | **Fixed** |
| D5 | AI input validation + rate limit | **Fixed** (rate limit is per-instance only) |
| D6 | Rotate `SUPABASE_SERVICE_ROLE_KEY` | Outstanding |
| D7 | Remove the five `demo1234` accounts | Outstanding |
| D8 | MIME allowlists for `job-plans`, `form-attachments` | Outstanding |
| D9 | Baseline migration for `public.jobs` | Outstanding |
| D10 | Live cross-tenant penetration tests | **Not run** — isolation is unproven at runtime |
| D11 | Audit trail for AI and electrical advice | Outstanding |
| D12 | Account deletion + data export | Outstanding |
| D13 | Admin audit logging, MFA, security headers, shared rate-limit store | Outstanding |

---

## E · Product / UX fix

| | |
|---|---|
| E1 | Safety confirmation at the point of risk — not click-through warnings everywhere |
| E2 | Show calculation inputs, outputs and assumptions; let users edit inputs; never hide a safety-critical assumption |
| E3 | Label AI content in the UI, not only in response headers |
| E4 | Supplier pricing must read **"last recorded price"** with source and timestamp, never "current" |
| E5 | Fix the broken invite flow; stop onboarding swallowing the error |
| E6 | Fix the role mismatch in `lib/auth.ts` |
| E7 | Privacy and Terms links in the footer (currently `#`) |

---

## F · Business / insurance

Not implementable in code. See `BUSINESS_RISK_REVIEW.md` — **not written**.
Obtain professional advice on: company structure and director liability;
professional indemnity; public liability; cyber insurance; business
interruption; contractual insurance requirements; and accounting/tax obligations
including the $75k GST registration threshold.

Worth raising early with a broker: a product that gives electrical diagnostic
advice may not fit a standard software PI policy.

---

## Blocking vs. non-blocking

**Blocking any real launch:** A1, A3, D6, D7.
**Blocking paid launch:** A2, A9, and a payment processor.
**Blocking App Store:** A3.
**Blocking confidence in tenant isolation:** D10.
