# Go-live runbook

---

## 00. Keys rotated, 12 November

Supabase moved to the new key format. SUPABASE_SERVICE_ROLE_KEY now holds the `vercel` secret key (sb_secret_) and NEXT_PUBLIC_SUPABASE_ANON_KEY holds the default publishable key (sb_publishable_). The five STRIPE_* test variables are in Vercel. This commit exists to trigger the production deploy that picks them up.

Still to do: confirm the live site works on the new keys, then disable the legacy API keys in Supabase (Settings, API Keys, Legacy API keys). Never re-enable them. The STRIPE_* variables were imported as Config, not Secret; re-add them as Secret once Vercel two-factor is recovered.

---


## 0. Status, 9 November

**The database is ready. The code is not deployed.**

Done and verified against production, not assumed:

- Migrations 028, 029, 034 and 035 are all applied. 035 verified by
  catalogue query: three tables with RLS on and one policy each, four
  columns present.
- The five `demo1234` logins are banned.
- PR #1 merged on 26 October, so `main` carries the security hardening.
- The legal entity is named on /terms, /privacy and the footer:
  Jack Steven Gapes t/a FieldMS, ABN 15 236 755 732, verified against
  the ABR. The register also confirms **not registered for GST**, so
  `GST_REGISTERED = false` in lib/plans-public.ts is correct.

### THE ONE THAT MATTERS

**Seven commits are sitting unpushed on `main`, and one of them is the
Next.js 16.4.3 upgrade.** Production is still on 16.3.5, which has an
unauthenticated remote code execution hole in the image optimization
API (GHSA-2464-fhr4-w9xw). The landing page serves `/_next/image`, so
the vulnerable path is public. This has been true since 27 October.

Nothing else on this list comes close. Push first.

I cannot do it: the sandbox has no GitHub credentials, and GitHub
Desktop sits on another macOS Space that a window cannot be moved out
of while the current Space is a full-screen app. Drop out of full
screen and it is one click.

### Also worth knowing

- **The `fieldms` Vercel project is a stale duplicate** from 6 September
  holding only `fieldms.vercel.app`. It shows red and that red is
  meaningless. `field-ms` is the real project. Worth deleting the
  duplicate so the next red mark means something.
- **Vercel env vars went from 19 to 10** between 27 October and
  8 November. `CRON_SECRET`, `XERO_*` and `MYOB_*` are gone. Dropping
  Xero and MYOB is reasonable since both are flagged off, but without
  `CRON_SECRET` the scheduled price refresh cannot run at all. It fails
  closed, so nothing breaks; it just never happens.
- **Still no `STRIPE_*` variables.** Nobody can pay. This is the actual
  answer to "what is left before launch".

## 0a. The `release/launch` branch, 9 November

Built in a separate copy because another session was editing `main`.
It is `main` plus four commits from `feature/next`:

- Sample job for new workspaces (removable in one click)
- Offline: photos, form answers, signatures and test sheets save with no signal
- Finish job on site: test results, certificate, invoice, complete

The job-profit commit from `feature/next` was left out on purpose. The
job costing now on `main` replaces it.

**`036_sample_data.sql` is applied to production (9 November, verified:
`is_sample` on customers, jobs and estimates, plus all three indexes).** It was numbered 034 on
the feature branch, which collides with `034_sms_quota.sql`, so it was
renumbered. It adds an `is_sample` column to customers, jobs and
estimates. Safe to re-run.

Type-check passes and lint is clean on the changed files. The Vercel preview of this branch builds and shows Ready, so it is
clear to merge.

## 1. Migrations — DONE

All four are applied to production and verified. Kept here as the record of
what the schema depends on:

| File | What it carries |
|---|---|
| `028_job_packages.sql` | The Packages screen |
| `029_customer_messaging.sql` | Messages, templates, automatic review requests |
| `034_sms_quota.sql` | The SMS allowance lookup |
| `035_job_costing.sql` | Cost rates, other direct costs, quoted baselines |

All four are plain statements with no DO blocks, checked against the real
Postgres parser, and safe to re-run. If you rebuild from scratch, run them in
filename order and note that `public.jobs` still has no baseline, so step 2
below is a prerequisite for a clean rebuild.

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

PR #1 is open and has 18 commits. All checks pass and there are no
conflicts, so this is one click on **Merge pull request** → **Confirm
merge**. Vercel deploys `field-ms` on merge.

Ignore the red `fieldms` row in the Vercel comment — see step 0.

### Why the first preview build failed, so it does not happen again

Two committed files imported two files that were never committed:

    lib/notifications.ts             ->  @/lib/message-templates
    app/api/jobs/[jobId]/events/     ->  @/lib/customer-messaging

Both resolved locally, because the files were sitting in the working
tree untracked. Neither resolved on Vercel, which only ever gets a fresh
clone. `npm run build` passing on this machine proved nothing.

If a build fails on Vercel but passes locally, check this first:

```bash
git clone --depth 1 --branch <branch> . /tmp/check && cd /tmp/check \
  && npm install && npx next build
```

That is the only build that counts.

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
