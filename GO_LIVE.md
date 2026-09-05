# Go live — the exact commands

Everything I could do without your accounts is done. What's left needs you to
be signed in as you.

**Already done:** stale git lock cleared, all work committed (`2f8fa33`),
`.env.example` added and un-ignored, secret scan of the committed tree clean —
no `.env` file and no key material is tracked.

---

## 1. Check the build (on your Mac, not mine)

I could not run this. My sandbox is Linux and your `node_modules` holds the
macOS SWC binary, so `next build` failed on a missing native module — my
environment, not your code. It still has to pass before you deploy.

```
cd ~/tradesheets-v2
npm run build
```

If that fails, stop and send me the error. A build that breaks on Vercel costs
far more time than one that breaks here.

---

## 2. Push to GitHub

Create an **empty** repository at <https://github.com/new> — no README, no
`.gitignore`, no licence, or the first push will conflict. Call it `fieldms`.
Make it **private**.

Then, replacing `YOUR-USERNAME`:

```
cd ~/tradesheets-v2
git remote add origin https://github.com/YOUR-USERNAME/fieldms.git
git branch -M main
git push -u origin main
```

If it asks for a password, GitHub wants a personal access token rather than
your account password. Easier route: install the GitHub CLI (`brew install gh`),
run `gh auth login`, then push.

**Do not paste any token to me.** Enter it directly in your terminal.

---

## 3. Import into Vercel

<https://vercel.com/new> → import the `fieldms` repo.

Framework preset detects Next.js on its own. Don't override the build command.

**Before clicking Deploy**, open Environment Variables and add every entry from
your `.env.local`. Use `.env.example` as the checklist — it lists all 19 names
with notes on what each one switches on.

The four that must be set or the app is broken:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are server-only. Vercel
keeps anything without the `NEXT_PUBLIC_` prefix off the client, so just don't
rename them.

Deploy, and confirm the `*.vercel.app` URL works before going near DNS.

---

## 4. Supabase auth — do this before the domain

Dashboard → Authentication → URL Configuration.

- **Site URL:** `https://fieldms.com.au`
- **Redirect URLs:** add both

```
https://fieldms.com.au/**
http://localhost:3000/**
```

Keep localhost so development still works.

**Why this matters.** `lib/auth.ts` sends resets with
`redirectTo: ${window.location.origin}/reset-password`. Supabase refuses any
redirect not on the allow-list and quietly substitutes the Site URL. You get a
valid link that lands on the wrong page — indistinguishable from the expiry bug
you already spent an evening on.

---

## 5. The domain

Vercel → your project → Settings → Domains → add `fieldms.com.au`. Vercel shows
the exact records to create.

At GoDaddy: **delete the Website Builder site first.** While it exists GoDaddy
keeps its own A records pointed at the placeholder, and you'll swear the
cutover failed when it's actually the old site still answering. Then apply
Vercel's records.

Add `www.fieldms.com.au` too and let Vercel redirect it to the apex.

Certificates issue automatically. Give DNS an hour before concluding anything.

---

## 6. Prove it works on the real domain

```
npm run doctor
```

Then by hand, on `https://fieldms.com.au`:

- [ ] Sign up with a fresh address — confirmation email arrives, link works
- [ ] Password reset end to end
- [ ] Open a quote link and an invoice link in a private window
- [ ] Ask Fault Finder something — proves the server-side key reached Vercel
- [ ] Sign in as a technician and confirm no pricing is visible

---

## Before you charge anyone

The site can go live without these. Taking money cannot.

1. **Rotate `SUPABASE_SERVICE_ROLE_KEY`.** Exposed in a browser console during
   debugging — my error, still outstanding. Supabase → Settings → API → roll.
   Update it in Vercel and `.env.local` afterwards.
2. **Delete the five demo accounts.** They share the password `demo1234` and
   they are real `auth.users` rows. On a public domain that is five working
   logins. Keep the demo *tenant* if you want the data for recording; delete
   the users.
3. **Privacy policy.** Apple requires a reachable privacy policy URL for App
   Store review, and you're holding other businesses' customer contact details
   and compliance records, which brings the Privacy Act into it. This is the
   one that will actually block submission.
4. **Terms of service with a liability limitation.** You're storing records
   people may rely on in a dispute about electrical safety work.
5. **No payment processor.** "Get paid" is still not true.

I'm not a lawyer, and 3 and 4 are worth a real one — they're cheap to get right
now and expensive to retrofit.

---

## Not done, waiting on you

**The colour palette.** You asked for options and I gave you four; you haven't
picked one. I haven't touched `globals.css`, because your brand colour is your
call, not mine. It's about six tokens, so say the word and it's a few minutes —
worth doing before you record the walkthrough rather than after, so the footage
doesn't age out.
