# FieldMS walkthrough — recording script

A week in the life of a five-electrician business. Owner's view first, then the
same week from a technician's phone.

Target length **4:30–5:00**. Everything below is real data already sitting in
the **Voltaic Electrical (demo)** workspace — nothing needs to be typed or
faked on camera.

Sign in at **https://fieldms.com.au/login**

---

## Before you hit record

| | |
|---|---|
| **Sign in as** | your own account, then switch workspace to *Voltaic Electrical (demo)* |
| **Browser** | one window, no other tabs, no bookmarks bar |
| **Window** | 1440 × 900. Bigger and the text is unreadable when scaled down |
| **Zoom** | 100%. Cmd+0 to be sure |
| **Notifications** | Do Not Disturb on |
| **Recording** | 60fps if your tool offers it — cursor movement looks bad at 30 |

**Do not film:** the login screen with `demo1234` visible, the Supabase tab,
your terminal, or Settings → Integrations (Xero and MYOB are not connected, and
an empty integrations screen invites a question you do not want asked in an ad).

**One rehearsal pass first.** Click the whole path once without recording. The
first load of each page is slower than the rest, and you want that out of the
way before you start talking.

---

## Numbers that should be on screen

If these don't match, the seed didn't load and you should stop and re-run it.

- **19 jobs** this week — 4 Mon, 5 Tue, 4 Wed, 3 Thu, 3 Fri
- **12 customers**, 18 sites, 30 assets
- **16 invoices**, **$20,201.00 outstanding**, of which **$4,587.00 overdue**
- **5 crew**: Alex Voltaic (owner), Dave Nguyen (manager), Sam Ellis, Priya
  Raman, Josh Tapu (technicians)
- **Conflicts: 0** on the Schedule page

---

## Scene 1 — Today · 0:00–0:40

**Screen:** `/dashboard`, Voltaic Electrical (demo) showing in the top right.

**Do:** Hold still for three seconds before you speak. Let the page settle.
Then move the cursor slowly across the day's job cards. Don't click yet.

> "This is Monday morning for a five-electrician shop in Brisbane. Nineteen jobs
> booked across the week, four of them today, and every one already has a name,
> an address and a person assigned to it.
>
> This is the screen the owner opens with a coffee. Not a list of everything
> that exists — just what's happening today."

**Watch for:** the noticeboard items ("Portside induction required", "Toolbox
talk Monday 6:30am"). Pause on those for a beat — they read as a real business,
not a demo.

---

## Scene 2 — Schedule · 0:40–1:20

**Do:** Click **Schedule**. Let the week render. Move across the columns
Monday to Friday.

> "The week across five people. Dave's on the warehouse LED job Tuesday, Priya's
> got the retail fitout Wednesday, Josh is doing the smaller stuff — exit
> lights, smoke alarms, ceiling fans.
>
> Two to five jobs a day. That's what a real week looks like, and that's the
> point: the schedule has to survive a normal week, not a tidy one."

**Watch for:** the Conflicts counter reads zero. Worth a beat — nobody is
double-booked and nobody is over their nine-hour day.

---

## Scene 3 — One job, end to end · 1:20–2:20

This is the most important minute in the video. Don't rush it.

**Do:** Click **Jobs**, then open **Switchboard upgrade** (Monday, Northgate
Business Park, $3,480).

> "Here's the job that pays the rent. Switchboard upgrade — ceramic fuse board
> out, eighteen-way board in, six RCBOs, main switch and surge protection.
>
> Description, hours, the customer, the site. Scroll down and the test sheet is
> attached to the job, not sitting in a folder on someone's laptop."

**Do:** Scroll to the test sheet. Open it. Show the circuit rows.

> "Circuit by circuit. Insulation resistance, polarity, RCD trip times, the
> tester's name and the date. This is the document that matters if anything ever
> goes wrong at that address."

**Do:** Scroll to billing on the same job.

> "And the invoice came off the same record. The job, the test sheet and the
> invoice are one thing, not three."

**Say nothing about** invoices being tracked or reconciled automatically. See
"Do not say" below — that is the claim that carries real risk.

---

## Scene 4 — Customers · 2:20–2:50

**Do:** Click **Customers**. Scroll the list. Open **Northgate Business Park**.

> "Twelve customers, and each one is a real record rather than a name typed onto
> a job. Northgate has multiple sites, a job history, and everything ever tested
> at those addresses.
>
> That's the difference between a job list and a business asset. The history is
> the reason a customer stays."

**Watch for:** the marketing consent field. Worth one line, because it's a
genuine differentiator and it is legally literate:

> "Consent is tracked per customer, because under the Spam Act you need it."

---

## Scene 5 — Money · 2:50–3:30

**Do:** Click **Money**.

> "Sixteen invoices. Twenty thousand two hundred and one dollars outstanding,
> four and a half thousand of that overdue.
>
> Paid, sent, part-paid, overdue — the owner can see the state of every invoice
> without opening the accounting package."

**Do:** Point at the part-paid invoice (INV-1108, $1,240, $600 received) and the
progress claim (INV-1111, $7,400).

> "Progress claims and part payments, because that's how commercial work
> actually gets paid."

---

## Scene 6 — Compliance · 3:30–4:00

**Do:** Click **Compliance**.

> "Thirty pieces of equipment across those sites. Switchboards, RCDs, exit and
> emergency lighting, a solar system, an EV charger. Each one has a test
> interval and a next-due date.
>
> Anything overdue on this screen is work that hasn't been quoted yet. This
> isn't admin — it's next month's revenue, sorted by date."

That framing — *the compliance register is a booking list* — is the strongest
sales line in the whole video. Land it clearly.

---

## Scene 7 — The technician's phone · 4:00–4:40

**Do:** Sign out. Sign in as `josh@voltaicelectrical.com.au`. **Cut the password
entry** in the edit — don't show it typed.

**Do:** Resize to a phone width first, or record this scene on an actual phone,
which looks considerably better.

> "Same business, same week, from the apprentice's phone.
>
> Josh sees his own jobs. Not the rest of the week, not the customer list, not
> the pricing, not what anything cost. He sees where he's going, what he's
> doing, and the form he has to fill in."

**Do:** Open one of Josh's jobs — *Exit light repair*, *Smoke alarm compliance*,
*Ceiling fan install x4* or *Defect rectification*. Show the form. Tap through
to Fault Finder.

> "And when he's standing in front of something he hasn't seen before, he asks."

**Do:** Ask Fault Finder one real question. Suggested, because it matches a job
in the data:

> *"Fronius inverter showing State 522, what should I check first?"*

Let the answer stream. Don't cut it short — the streaming is the proof it's live.

Worth knowing while you narrate this, in case anyone technical asks: the
restriction is enforced in the database, not hidden in the interface. A
technician cannot reach the pricing even from the browser console.

---

## Scene 8 — Close · 4:40–5:00

**Do:** Back to the owner's **Today** screen. Hold.

> "One week. Nineteen jobs, five people, every test sheet filed and every
> invoice accounted for.
>
> FieldMS. Built for Australian electricians."

---

## Do not say

These are the claims that would put you in front of the ACCC. Each one is
either not built or not true yet. Full list in `CLAIMS_AUDIT.md`.

| Don't say | Why |
|---|---|
| "Invoices are tracked automatically" / "chases payment for you" | Nothing marks an invoice paid on its own. No webhook, no cron |
| "Syncs with Xero and MYOB" | Not connected. The credentials aren't even set |
| "Works offline" | It doesn't |
| "Live supplier pricing" | The pricing engine exists; live feeds don't |
| "Free trial" / any price or seat count | No payment processor is wired in |
| "HVAC" or "air conditioning" | Electricians only. Both are marked coming soon |

Describe what's on screen. It is strong enough on its own, and everything in
this script is something the viewer can watch happen.

---

## Cut-downs

Once the master is recorded, these come out of it without re-shooting.

**30 seconds — compliance angle (the best one for paid ads)**
Scene 6 (0:00–0:12) → Scene 3 test sheet (0:12–0:22) → Scene 8 close.
Hook: *"Every switchboard you've ever tested, and the date the next one's due."*

**15 seconds — field angle**
Scene 7 only. Josh's job list, the form, one Fault Finder answer.
Hook: *"Your apprentice, on site, without ringing you."*

**App Store preview — 3 stills**
Today · Compliance register · Josh's phone view.

---

## After you record

Take stills at these exact moments for the App Store listing and ad creative:

1. **Today** with the day's job cards and the noticeboard visible
2. **Schedule**, full week, five columns, Conflicts 0
3. **Test sheet** with circuit rows on screen
4. **Compliance register** sorted by next due date
5. **Josh's phone**, his jobs only

---

## Before this goes anywhere public

- **Rotate the Supabase service role key.** It was exposed in a browser console
  during debugging.
- **Change or delete the five demo logins.** They share the password
  `demo1234` and they are real accounts on a live, public domain.
- **Privacy policy and terms of service.** Apple will not accept an App Store
  submission without a reachable privacy policy URL, and you are storing other
  businesses' customer contact details and compliance records.
- **No payment processor is connected**, so nothing can be charged yet.

Full list in `PREFLIGHT.md` and `GO_LIVE.md`.
