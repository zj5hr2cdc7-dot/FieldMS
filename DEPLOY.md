# Going live on fieldms.com.au

What's on the domain now, what has to change, and the one thing that will break
if you skip it.

---

## What's there today

`fieldms.com.au` currently serves a **GoDaddy Website Builder** page — the
"Streamline Your Field Operations" placeholder with a Getty stock image and a
contact form. It has nothing to do with your app. It has to come down, or move
to a subdomain, before the real app can have the root.

---

## The good news

I checked every place the code builds a URL. **Nothing is hardcoded to
localhost.** Public links — quotes, invoices, certificates, site reports,
tracking, unsubscribe — are all built from `window.location.origin`, so the
moment the app is served from `fieldms.com.au` they become
`https://fieldms.com.au/quote/...` on their own. Nothing to change.

Secrets are also placed correctly:

| Secret | Where it lives | Exposed to the browser? |
|---|---|---|
| `ANTHROPIC_API_KEY` | `app/api/assistant/route.ts` only | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `utils/supabase/admin.ts` only, never imported by a `'use client'` file | No |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | client | Yes, and that's correct — the anon key is meant to be public, RLS is what protects the data |

That last row is only true because RLS is now real. It wasn't a week ago.

---

## Order of operations

### 1. Deploy first, domain second

Push to Vercel and get it working on the `*.vercel.app` URL before touching
DNS. If something is wrong you want to find out on a URL nobody has.

Next 16 needs no special configuration on Vercel. Set every variable from
`.env.local` in the project's environment settings — they are not read from the
repo, and the build will succeed without them and fail at runtime, which is the
worst way to find out.

Run `npm run doctor` against the production environment once it's up.

### 2. Supabase Auth — the one that will break

**This is the step people skip and then spend an evening debugging.**

In the Supabase dashboard, Authentication → URL Configuration:

- **Site URL** → `https://fieldms.com.au`
- **Redirect URLs** → add `https://fieldms.com.au/**`

`lib/auth.ts` sends password resets with
`redirectTo: ${window.location.origin}/reset-password`. Supabase **rejects any
redirect not on the allow-list** and silently sends the user to the Site URL
instead. Symptom: reset links that appear to work but land on the wrong page,
or "invalid link" on a link that is genuinely valid.

Keep `http://localhost:3000/**` on the list as well so local development keeps
working.

### 3. DNS

Point the domain at the deployment and remove the GoDaddy builder site. GoDaddy
will keep serving the placeholder from its own records until you do — an A
record left behind is the usual reason a "finished" cutover still shows the old
page.

Give it an hour before concluding anything is wrong.

### 4. Test on the real domain

- Sign up with a fresh address, confirm the email lands and the link works
- Password reset, all the way through
- Open a quote and an invoice public link in a private window
- Fault Finder answers — proves the server-side key made it into the environment

---

## Before you take money

None of this blocks the walkthrough recording. All of it blocks charging people.

- **Rotate `SUPABASE_SERVICE_ROLE_KEY`.** It was exposed in a browser console
  during debugging. Still outstanding.
- **Delete the five demo logins.** They share the password `demo1234` and they
  are real accounts. On a public domain they are five real ways in.
- **No terms of service, privacy policy or limitation of liability** exists in
  the repo. You're storing customer contact data and electrical compliance
  records for other businesses. The privacy policy isn't optional under the
  Privacy Act once you're a real business handling third-party personal data.
- **No payment processor.** "Get paid" is still not true.
- **Australian Consumer Law** applies to everything on the marketing site.
  `CLAIMS_AUDIT.md` lists the five claims already corrected. The domain going
  live is when those stop being theoretical.

---

## Naming

The placeholder site calls itself "Field Management Suite". The app calls itself
"FieldMS". Pick one for the title tag and the App Store listing — "FieldMS"
is the stronger mark, and "Field Management Suite" reads like a category rather
than a brand.

Worth a trade mark search on FieldMS before you spend on ads. IP Australia's
search is free.
