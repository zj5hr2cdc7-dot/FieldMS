# What FieldMS offers vs what actually works

14 October 2026. Every line below was checked against the code, not the README.
Where something works, it says so — this is a gap list, not a hit piece.

`FEATURE_GAPS_2026.md` is from August and its headline finding ("there is no
customer record") was fixed by migration 023. Treat this file as current.

---

## The one that should worry you

### Email and SMS silently do nothing, and then log success

`lib/notifications.ts`:

```ts
const client = getTwilio()
if (!client || !from) return      // no error, no log, no throw
```

Both the Resend (email) and Twilio (SMS) helpers return `null` when their keys
are missing, and every caller then returns early. Nothing is sent, nothing is
raised.

What happens next is the actual problem. `app/api/documents/send/route.ts`:

```ts
await sendCustomerLink({ ... })            // quietly did nothing

await admin.from('form_audit_events').insert({
  event_type: 'sent',                      // <- writes a false audit record
  meta: { to_email: job?.customer_email },
})

return NextResponse.json({ ok: true })     // <- UI shows "Sent"
```

So the business sees "Sent", the customer receives nothing, and the audit trail
says it was sent. On a compliance product that is worse than a visible failure:
it manufactures evidence of something that did not happen.

**Affected:** sending quotes, invoices, documents, test sheets, site reports,
job tracking links, and review requests. Essentially every customer touchpoint.

**Status of the keys:** `RESEND_API_KEY`, `TWILIO_ACCOUNT_SID`,
`TWILIO_AUTH_TOKEN` and `TWILIO_PHONE_NUMBER` are all **unset in
`.env.local`**. I cannot read your Vercel variables, so check there first —
if they are set in production, this is a dev-only annoyance. If they are not,
nothing you have "sent" has ever arrived.

**The fix is two parts**, and the second matters more than the first: set the
keys, *and* make the send path fail loudly. A send helper that cannot send
should throw, the route should return an error, and the audit row should only
be written after a confirmed send.

---

## Offered but not built

| What the UI offers | Reality |
|---|---|
| **MYOB sync** | You can connect MYOB via OAuth, and it will never sync. `lib/accounting-sync.ts` contains **zero** MYOB code. Xero sync is genuinely implemented against `api.xero.com`. |
| **7 of 8 wholesaler feeds** | Rexel, Haymans, Lawrence & Hanson, Middy's, CNW, Ideal and C&W are registered as `ready: false` and their `fetchOffers()` **throws**. Only Sparky Direct returns data, and it is a static imported catalogue, not a live feed. |
| **Linking a trade account** | The Materials page offers trade-account linking for exactly the suppliers that cannot sync (`supportsTradeAccounts` is true only on the seven pending ones). You can link a Rexel account today and it will do nothing, forever. |
| **Payments / subscriptions** | No processor, no billing tables, no checkout. The pricing section correctly says free during early access, so nothing is currently misrepresented — but there is no way to charge anyone. |
| **Customer job tracking map** | `app/track/[token]/page.tsx` loads Google Maps with `key=${...NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ''}`. The key is unset, so the map fails to load on a page you send to customers. |
| **Scheduled price refresh** | `CRON_SECRET` unset. `/api/pricing/refresh` fails closed, so prices never refresh on a schedule. Correct behaviour, but it means "always-current" is doing no work. |

---

## Claims that outrun the build

- **"Materials & live pricing"** and **"Always-current material prices — market
  data plus your own trade accounts"** (dashboard header). With one static
  catalogue connector and no scheduled refresh, neither "live" nor
  "always-current" is true today.
- **Landing page: "Import your wholesaler price lists and see every price change
  over time."** The price-history machinery is real (`price_snapshots`,
  `price_changes`), but there is no import path for a price list and no live
  feed to populate it.

To be fair to the Materials page, it *does* mark pending connectors with
"· feed pending" and a dashed border in the supplier picker. The honesty is
there in one place and absent in the headline above it.

---

## Things I expected to be broken and found working

Worth knowing so you don't spend time here:

- **The invite flow is fixed.** `/api/team/invite` now exists, is owner-gated
  through `requireTenantRole`, and sends via Supabase Auth's
  `inviteUserByEmail` — so it does **not** depend on the broken Resend path.
- **Offline is real, and the copy is accurate.** `updateJobStatusOfflineAware`
  queues job status changes, `OfflineSync` flushes them on reconnect. It covers
  job status only, which is exactly what "mark jobs done anyway" claims. Photos,
  forms and test sheets are not queued, and the copy does not say they are.
- **Xero sync** makes real API calls and throws properly on failure.
- **Reviews QR** works: stores a Google reviews URL, renders a QR, copies it.
- **All 16 dashboard nav items** have real pages, 180 to 580 lines each. No
  dead links, no empty screens.
- **Fault Finder** works once `ANTHROPIC_API_KEY` is set in Vercel.

---

## Not deployed yet

These exist on your Mac only — 23 uncommitted files:

- `/dashboard/messages` and the customer-messaging library
- `/dashboard/rate-calculator`
- `supabase/migrations/029_customer_messaging.sql`

**But `components/Navbar.tsx` is among the modified files**, so the nav already
links to both. Commit them together or the nav will 404 in production.

Also pending: **migration 028 (job packages) has not been run** in Supabase, so
the Packages screen will error on a live database.

---

## Where I would go next, in order

1. **Check whether `RESEND_API_KEY` is set in Vercel.** This is a five-minute
   check that decides whether your product has been silently failing at its
   single most important job.
2. **Make sending fail loudly** whether or not the key is set. The false
   `event_type: 'sent'` audit row is the part to fix first.
3. **Run migration 028**, and commit the messages/rate-calculator work so the
   nav isn't pointing at missing pages.
4. **Either build MYOB sync or remove the MYOB connect button.** Offering a
   connection that does nothing is the clearest broken promise in the product.
5. **Soften the Materials headline** until a live feed exists, or get one feed
   agreement signed and make it true.
6. **Set the Google Maps key**, or hide the map on the customer tracking page.

Still outstanding from the earlier audit and unchanged: the Fault Lab manual
copyright question, the unrotated service role key, the `demo1234` accounts, and
the missing privacy policy and terms.
