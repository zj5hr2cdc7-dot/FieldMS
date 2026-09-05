# Preflight

*Everything that was silently broken, why nothing surfaced it, and the checks that now catch it.*

---

## What went wrong

Your database had **ten tables**. The app queries **47**.

Migrations 004 and 006 through 021 were never applied. So `job_test_sheets`,
`job_invoices`, `job_payments`, `job_photos`, `form_templates`,
`tenant_branding`, `time_entries`, `master_products`, `purchase_orders` and
`tenant_onboarding` — thirty-one tables — did not exist.

**Why it never surfaced.** A missing table in Supabase does not throw. It
returns an error object, and most pages in this codebase turn that into an
empty state. So the app looked like it worked and was mostly a shell. The
setup wizard reporting "0 of 7 steps" was not a UI quirk: `tenant_onboarding`
did not exist, and the write failed every time.

I found this the wrong way — three failed migration attempts, patching one
table at a time — because I assumed the repo described the database instead of
checking. The checks below exist so that assumption can never be made again.

---

## What else was found, before it could bite

| Problem | Effect | Fixed by |
|---|---|---|
| 31 tables missing | Two thirds of the app non functional | `RUN_ALL.sql` |
| Storage buckets never created — the `INSERT INTO storage.buckets` was **commented out** in migrations 006, 012 and 014 | Logo upload, job plans and site photos fail with "Bucket not found" | `026_storage_buckets.sql` |
| Storage policies, as originally drafted, granted access to any authenticated user | Every workspace could read every other workspace's files | `026` scopes by tenant id folder prefix |
| `XERO_CLIENT_ID`, `XERO_CLIENT_SECRET`, `XERO_SCOPE` never set | "Connect Xero" fails | `npm run doctor` reports it |
| All five `MYOB_*` vars never set | MYOB connection impossible | `npm run doctor` |
| `RESEND_API_KEY` present but **empty** | Quotes and invoices never email | `npm run doctor` |
| All three `TWILIO_*` vars present but **empty** | SMS notifications never send | `npm run doctor` |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` present but **empty** | Job maps and tracking blank | `npm run doctor` |
| `CRON_SECRET` never set | Scheduled price refresh cannot run on a timer. **Correction:** an earlier version of this table called the endpoint "unauthenticated". It isn't — with no secret set the cron path is simply unreachable and the route falls through to requiring a signed-in user, so it fails closed | `npm run doctor` |
| Test sheets and site reports showed a dead dropdown on empty accounts | Every trial user's first impression | `NoJobsYet` empty states |
| Role model enforced only in React | A technician could read costs and margins from the console | `024_roles_and_enforcement.sql` |
| Five unsubstantiated marketing claims | ACL exposure | `CLAIMS_AUDIT.md`, all reworded |
| `estimate_items` had RLS on and **no policies** | Creating a quote failed outright; opening one showed no line items. The public customer page uses the service role key, so the customer saw items the business could not | `027_estimate_items_rls.sql` |
| Migration 002's four permissive policies on `estimates` survived migration 024 | Permissive policies are OR'd, so the technician restriction 024 was written to enforce never held — any technician could read every quote and its pricing | `027` drops them by name |
| The schema scanner mis-parsed PostgREST embeds | 10 false failures, which is how a real one hides | `scripts/lib/scan-schema.mjs` |
| The bucket scanner missed `storage.from(BUCKET)` | `job-photos` was never verified | same file, constants resolved |

---

## The three checks

### 1. `npm run doctor`

The one to run before any release. Checks, against reality:

- **Environment** — every `process.env` var the code reads, grouped by the
  feature it breaks. Distinguishes required from optional, and catches
  variables that are declared but empty.
- **Schema** — extracts every `.from()` and `.select()` in the codebase and
  queries the live database for each. Reports missing tables and missing
  columns by name.
- **Storage** — every bucket `storage.from()` references.
- **Fault Finder** — key validity, model id, and that the manual is on disk.

Exits non-zero on failure, so it can gate a deploy.

The expectations are derived by scanning the source, not hard coded, so this
stays accurate as the app changes. That is the point: it cannot drift.

### 2. `supabase/VERIFY_SCHEMA.sql`

Same schema check, as read-only SQL for the Supabase editor when you are
already in there. Returns one row per problem, no rows when clean.
`VERIFY_COMPACT.sql` runs the identical checks but returns a single cell, so
the whole result copies in one click.

Both are **generated** by `npm run build:verify` from the same scanner the
doctor uses. They used to carry a hand-copied list of expectations, which is a
snapshot that goes stale the moment a query changes. Regenerate after changing
queries.

It also flags three things the doctor cannot see:

- **RLS disabled** on a table holding `tenant_id` — a cross-customer data leak
- **RLS disabled on a child table** whose parent is tenant-scoped. Line item
  tables have no `tenant_id` of their own, so the check above cannot see them;
  this one follows foreign keys instead
- **RLS enabled with no policies** — every query silently returns zero rows.
  This is the one that caught `estimate_items`, and it is the nastiest failure
  mode in the list: the query succeeds and returns nothing, so the app renders
  a clean empty state over a table full of data

### 3. `npm run check:fault-finder`

Narrower, for when you are only touching the assistant.

---

## Order of operations

1. **`supabase/RUN_ALL.sql`** — 24 migrations plus the demo seed. Excludes
   001, 002 and 005, which would either drop your existing data or fail.
2. **`supabase/VERIFY_SCHEMA.sql`** — confirm zero rows.
3. **`npm run doctor`** — confirm the app side agrees.
4. Fill the empty environment variables for whichever features you want live.

---

## Still outstanding

Not broken, but real, and worth knowing before you sell anything:

- **Migration history does not match the database.** Even after `RUN_ALL`,
  Supabase has no record of which migrations ran, because these are pasted
  rather than pushed with the CLI. Git still cannot rebuild this database:
  `public.jobs` has no migration at all, and there are two files numbered
  `020`. Dump the live schema into a baseline migration before you need a
  staging environment.
- **The demo crew are real accounts** sharing the password `demo1234`. Delete
  them before launch.
- **The service role key was exposed** in a browser console during debugging.
  Rotate it.
- **No payment processor** is wired in, so "get paid" is not yet true.
- **No terms of service or limitation of liability** in the repo.

---

*Run the doctor before every release. It takes seconds and it is the only
thing standing between you and finding out from a customer.*
