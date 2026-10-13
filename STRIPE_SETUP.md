# Stripe setup

FieldMS uses Stripe twice:

1. **Billing**: workspaces pay FieldMS for their plan.
2. **Connect**: each workspace connects its own Stripe account so its customers
   can pay invoices from the invoice link. That money goes straight to the
   contractor. FieldMS never holds it and adds no fee.

Do everything in **test mode** first. Nothing below needs the company to exist
yet; activate the account with FieldMS Pty Ltd's details before going live.

## 1. Run the database migration

Supabase SQL editor → run `supabase/migrations/031_stripe_payments.sql`.

## 2. Create the two plans

Stripe dashboard → Product catalogue → Add product.

| Product | Price | Billing |
| --- | --- | --- |
| FieldMS Founding member | A$69 | Monthly, recurring |
| FieldMS Standard | A$99 | Monthly, recurring |

Copy each **price id** (`price_...`) into `STRIPE_PRICE_FOUNDING` and
`STRIPE_PRICE_STANDARD`.

## 3. Customer portal

Settings → Billing → Customer portal. Turn on: update payment method, view
invoices, cancel subscription, and switch plans between the two products.

## 4. Connect

Connect → Get started. Choose to let **Stripe handle pricing** for connected
accounts. The code creates accounts where the contractor pays Stripe's fees,
Stripe handles losses, and the contractor gets the full Stripe dashboard.

To offer bank payment as well as card, each contractor turns on BECS Direct
Debit / PayTo in their own Stripe dashboard.

## 5. Webhooks (two endpoints, same URL)

Developers → Webhooks → Add endpoint, URL
`https://fieldms.com.au/api/stripe/webhook`:

| Endpoint | Listen to | Events | Secret goes in |
| --- | --- | --- | --- |
| 1 | Events on your account | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` | `STRIPE_WEBHOOK_SECRET` |
| 2 | Events on connected accounts | `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `account.updated` | `STRIPE_CONNECT_WEBHOOK_SECRET` |

For local testing, the Stripe CLI can forward events:
`stripe listen --forward-to localhost:3000/api/stripe/webhook --forward-connect-to localhost:3000/api/stripe/webhook`
and prints a signing secret to use for both variables.

## 6. Environment variables

Add to `.env.local` and to Vercel (never commit them):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_FOUNDING=price_...
STRIPE_PRICE_STANDARD=price_...
```

## 7. Test it

- Settings → Plan & payments → Subscribe. Pay with card `4242 4242 4242 4242`,
  any future date, any CVC. The plan should show as active within seconds.
- Plan & payments → Set up online payments. In test mode Stripe lets you skip
  most details. Come back and it should say online payments are on.
- Send an invoice, open its link in a private window, press Pay now, pay with
  the test card. The invoice should change to Paid and a payment should
  appear on the job.

## What is not enforced yet

Subscriptions are recorded but the app does **not** lock anyone out when a
plan lapses. FieldMS is free during early access; add enforcement when you
start charging, after telling early users.
