# Go-live runbook

Do these in order. Steps 1–5 are about an afternoon. Nothing here needs code
written — it all needs an account I cannot sign into.

The branch `feature/payments` is pushed and has 15 commits on it. Vercel builds
it as a **preview**, not production: only `main` deploys to fieldms.com.au.
Step 6 is the merge, and it is last on purpose.

---

## 1. Run the two migrations

Supabase → SQL editor → paste each file whole and run. **Run the whole file in
one go** rather than selecting statements — some older migrations contain DO
blocks that break if split (that is what broke migration 027).

| File | Without it |
|---|---|
| `supabase/migrations/028_job_packages.sql` | The Packages screen errors |
| `supabase/migrations/034_sms_quota.sql` | The SMS allowance lookup errors |

Both have been checked against the real Postgres parser and are safe to paste
in one piece. Both are safe to re-run.

## 2. Baseline `public.jobs`

This is the one that has been open longest. `jobs` is the central table and no
migration creates it, so the database cannot be rebuilt from git.

1. Run `supabase/GENERATE_JOBS_BASELINE.sql` in the SQL editor. It is a single
   read-only SELECT — it changes nothing.
2. Copy the one text value it returns.
3. Save it as `supabase/migrations/000_baseline_jobs.sql`.
4. Run `npm run audit:rls` — `jobs` should now appear in the table.

## 3. Rotate the service role key

It was exposed in a browser console during debugging and has never been
rotated.

1. Supabase → Settings → API → roll `service_role`
2. Update `SUPABASE_SERVICE_ROLE_KEY` in Vercel (**Secret** type, not Config)
3. Update it in your local `.env.local`
4. Redeploy

Do not paste the key into a chat window, including to me.

## 4. Kill the demo logins

Five accounts share the password `demo1234` on a public domain.

Run `supabase/DISABLE_DEMO_USERS.sql`. It bans them and scrambles the
password rather than deleting, because the demo jobs and test sheets reference
those users through foreign keys that do not cascade. The demo data survives
for recording walkthroughs; the logins do not.

## 5. Set the environment variables in Vercel

| Variable | Without it |
|---|---|
| `RESEND_API_KEY` | **Nothing is emailed.** Check this one first |
| `TWILIO_ACCOUNT_SID` / `_AUTH_TOKEN` / `_PHONE_NUMBER` | No texts |
| `CRON_SECRET` | No scheduled price refresh |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Customer tracking shows the address instead of a map |
| `STRIPE_*` | No subscriptions — fine for now, you are pairing Stripe later |

After setting them, **send yourself a real quote** and confirm it arrives.
Email silently doing nothing was the single worst bug found in this codebase;
it is fixed, but the fix means you now get a visible error instead of a lie,
and you want to see that work.

### Feature flags — leave these unset

All three default to off, which is deliberate. Set to the string `"true"` only
when you have a willing business to try each with:

- `NEXT_PUBLIC_FAULT_FINDER_ENABLED` — off pending the knowledge-base licence
- `NEXT_PUBLIC_ACCOUNTING_SYNC_ENABLED` — off; MYOB has never run against a
  real company file
- `NEXT_PUBLIC_CUSTOMER_PAYMENTS_ENABLED` — off; Stripe Connect

## 6. Merge to main

Only after 1–5. GitHub → Pull requests → new PR from `feature/payments` into
`main` → merge. Vercel deploys on merge.

Then check on the live site:

- `/privacy` and `/terms` load
- The footer links to both
- The pricing section shows the plans
- `/dashboard/materials/packages` opens without an error
- `/dashboard/plan` shows the SMS allowance

## 7. Prove tenant isolation

The one claim nothing has ever tested.

```bash
export NEXT_PUBLIC_SUPABASE_URL=...        # a STAGING project
export NEXT_PUBLIC_SUPABASE_ANON_KEY=...
export SUPABASE_SERVICE_ROLE_KEY=...
ALLOW_WRITES=1 npm run test:isolation
```

It signs in as two real users in two workspaces and attempts reads across 34
tenant-scoped tables, IDOR by object id, cross-tenant writes, privilege
escalation, storage listing and unauthenticated access. It refuses to run
without `ALLOW_WRITES=1`, and it creates then deletes two workspaces — point it
at staging, or at a project you are willing to leave fixtures in.

Everything says isolation is correct. This is the difference between saying so
and knowing.

---

## Then, before money changes hands

- **A lawyer reads `/terms`.** Limitation of liability and indemnity are
  deliberately not drafted — those allocate risk between parties and inventing
  them is worse than their absence. That is the clause you actually need.
- **A lawyer reads `/privacy`.** The facts in it are checked against the
  schema; the Australian Privacy Principles framing is not.
- **Delete `REVIEW_NOTICE`** in `components/LegalShell.tsx` once they have.
- **Decide `GST_REGISTERED`** in `lib/plans-public.ts`. It is `false`, correct
  while unregistered — you must not charge GST until you are.
- **Decide whether you want a free trial.** There is none today; the checkout
  sets no `trial_period_days`.
- **Insurance.** Professional indemnity for software that helps businesses
  meet compliance obligations may not fit a standard policy. Ask a broker
  early.

---

## My honest suggestion on sequencing

Finish 1–7, then put two or three **unpaid pilot users** on it — sparkies you
know — with email notifications only and everything else left off. You will
learn more in a fortnight than from any further audit, and the legal work runs
in parallel instead of blocking you.

Charge once a lawyer has read the terms and the isolation test is green.
