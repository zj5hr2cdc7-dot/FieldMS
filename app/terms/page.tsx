import type { Metadata } from 'next'
import Link from 'next/link'
import { LEGAL_LAST_UPDATED, LegalShell, REVIEW_NOTICE } from '@/components/LegalShell'
import { PLAN_CARDS, GST_LABEL, GST_REGISTERED } from '@/lib/plans-public'

/*
 * ── READ BEFORE EDITING ────────────────────────────────────────────────────
 * Terms are a lawyer's document far more than a privacy policy is. A privacy
 * policy mostly describes a system, which can be checked against code. Terms
 * allocate risk between two parties, which cannot.
 *
 * So what is here is: the operational facts (what the plans cost, how billing
 * and cancellation work, what the software does and does not do), written
 * plainly, PLUS the clauses whose shape is not really optional for software
 * like this. What is deliberately NOT here is invented limitation-of-liability
 * and indemnity drafting — those are the clauses where getting the wording
 * wrong is worse than not having them, because an unenforceable exclusion can
 * poison the surrounding terms.
 *
 * LEGAL_REVIEW_REQUIRED.md §A2 lists what a lawyer needs to settle. Have this
 * reviewed before taking money.
 */

export const metadata: Metadata = {
  title: 'Terms of service',
  description:
    'The terms you agree to when using FieldMS: what it costs, how billing works, and who is responsible for what.',
  alternates: { canonical: '/terms' },
}

export default function TermsPage() {
  const founding = PLAN_CARDS[0]
  const standard = PLAN_CARDS[1]

  return (
    <LegalShell title="Terms of service" updated={LEGAL_LAST_UPDATED}>
      <p>{REVIEW_NOTICE}</p>

      <h2>1. Who these terms are between</h2>
      <p>
        These terms are between FieldMS and the business that opens an account. If you are agreeing
        on behalf of a company, you are confirming you are allowed to.
      </p>
      <p>
        FieldMS is sold to businesses, not consumers. That does not remove the Australian Consumer
        Law guarantees described in section 8.
      </p>

      <h2>2. What FieldMS is</h2>
      <p>
        Software for running an electrical contracting business: jobs, scheduling, customers, quotes,
        invoices, test sheets, certificates and a compliance register.
      </p>

      <h3>2.1 What FieldMS is not</h3>
      <p>
        This is the part that matters most, so it is not buried in capital letters at the bottom.
      </p>
      <ul>
        <li>
          <strong>FieldMS does not certify electrical work.</strong> It records what you tell it. A
          test sheet or certificate produced by FieldMS is your professional statement, made by you,
          on your licence. We do not check it, verify it, or stand behind it.
        </li>
        <li>
          <strong>FieldMS does not tell you what the rules are.</strong> You are responsible for
          complying with the legislation, standards, manufacturer instructions and site conditions
          that apply to your work.
        </li>
        <li>
          <strong>FieldMS is not an accounting system or a tax agent.</strong> Figures it calculates
          are a convenience, not advice. Check them.
        </li>
        <li>
          <strong>Compliance reminders are a convenience, not a guarantee.</strong> If FieldMS does
          not remind you that something is due, that does not make it any less due.
        </li>
      </ul>

      <h2>3. Your account and your staff</h2>
      <ul>
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>
          You are responsible for what the people you invite into your workspace do in it, including
          what they can see. Roles are explained in the app; set them deliberately.
        </li>
        <li>
          If you switch on technician location tracking, you are the employer collecting that
          information. Workplace surveillance law differs by state and some states require written
          notice to staff first. Check your obligations.
        </li>
        <li>Tell us promptly if you think an account has been compromised.</li>
      </ul>

      <h2>4. Your data and your customers&apos; data</h2>
      <ul>
        <li>
          <strong>Your content stays yours.</strong> Jobs, customers, photos, documents and
          compliance records belong to you. We claim no ownership of them.
        </li>
        <li>
          You grant us only the permission needed to run the service: to store your content, show it
          to the people in your workspace, and send the documents you ask us to send. Nothing
          broader.
        </li>
        <li>
          You confirm you have the right to upload what you upload, and that you have a lawful basis
          for the customer information you enter.
        </li>
        <li>How we handle all of it is in the <Link href="/privacy">privacy policy</Link>.</li>
      </ul>

      <h2>5. Acceptable use</h2>
      <p>Do not use FieldMS to:</p>
      <ul>
        <li>Break the law, or help anyone else to</li>
        <li>Store or send content you do not have the right to</li>
        <li>Send marketing to people who have not consented (see the Spam Act 2003)</li>
        <li>Attempt to reach another business&apos;s data, or test our security without asking us first</li>
        <li>Resell or white-label FieldMS without our written agreement</li>
      </ul>
      <p>
        If you find a security problem, email us rather than exploiting it. We will not threaten
        anyone who reports a genuine vulnerability in good faith.
      </p>

      <h2>6. What it costs and how billing works</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Price</th>
            <th>Included</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{founding.label}</td>
            <td>${founding.monthly} per month {GST_LABEL}</td>
            <td>Whole crew, no per-user charge</td>
          </tr>
          <tr>
            <td>{standard.label}</td>
            <td>${standard.monthly} per month {GST_LABEL}</td>
            <td>Whole crew, no per-user charge</td>
          </tr>
        </tbody>
      </table>
      <ul>
        <li>Billed monthly in advance, in Australian dollars, by card through Stripe.</li>
        <li>
          {GST_REGISTERED
            ? 'Prices include GST and a tax invoice is available in your account.'
            : 'FieldMS is not currently registered for GST, so no GST is charged on these prices.'}
        </li>
        <li>
          <strong>There is no free trial at present.</strong> If we introduce one, its length and
          what happens at the end will be stated before you are asked for a card.
        </li>
        <li>
          Text message allowances are per calendar month and do not roll over:{' '}
          {founding.label} {SMS_IN(founding.features)}, {standard.label} {SMS_IN(standard.features)}.
          Email is unlimited, and when the text allowance is used up your customers are still
          emailed.
        </li>
        <li>
          If we change a price we will give at least 30 days&apos; notice by email, and it will take
          effect from your next billing period. The {founding.label} rate is held for as long as
          that plan stays active.
        </li>
        <li>
          If a payment fails we will retry and email you. We may suspend access if it stays unpaid,
          but we will not delete your data without telling you first.
        </li>
      </ul>

      <h3>6.1 Cancelling</h3>
      <ul>
        <li>
          Cancel any time from your account. No phone call, no retention process. Access continues
          to the end of the period you have paid for.
        </li>
        <li>
          We do not refund part-months by default. If something has gone wrong, email us — we would
          rather sort it out than argue about it.
        </li>
        <li>
          <strong>Export your data before you cancel.</strong> Compliance records in particular may
          be evidence you are required to keep.
        </li>
      </ul>

      <h2>7. Availability, backups and support</h2>
      <ul>
        <li>
          We do not offer a guaranteed uptime percentage. We will not pretend otherwise by publishing
          a number we have no way to stand behind.
        </li>
        <li>
          Maintenance may take the service offline briefly. We will give notice where we can.
        </li>
        <li>
          The database is backed up by our hosting provider. Backups are a disaster-recovery measure
          for us, not an archive service for you — <strong>keep your own copies of anything you
          cannot afford to lose.</strong>
        </li>
        <li>
          Support is by email to{' '}
          <a href="mailto:jack.gapes@outlook.com">jack.gapes@outlook.com</a>. FieldMS is a small
          operation; we answer as quickly as we can, and we do not promise a response time we cannot
          keep.
        </li>
        <li>
          Some features depend on third parties (Stripe, Twilio, Resend, Supabase, Vercel). When one
          of them is down, that part of FieldMS is down.
        </li>
      </ul>

      <h2>8. Australian Consumer Law</h2>
      <p>
        Where the Australian Consumer Law applies, it gives guarantees that cannot be excluded,
        restricted or modified. Nothing in these terms attempts to do that, and if anything here
        conflicts with those guarantees, the guarantees win.
      </p>
      <p>
        <strong>
          The remaining limitation of liability and indemnity clauses have deliberately not been
          drafted here, and will be added by a lawyer before FieldMS charges for subscriptions.
        </strong>{' '}
        We would rather tell you that than present invented wording as if it had been settled.
      </p>

      <h2>9. Suspension and termination</h2>
      <ul>
        <li>You may close your account at any time.</li>
        <li>
          We may suspend or close an account for non-payment, for a breach of section 5, or where
          continuing would expose us or another customer to serious risk. Except where the law or
          the seriousness of the breach prevents it, we will tell you first and give you a chance to
          put it right.
        </li>
        <li>
          After closure we will give you a reasonable opportunity to export your data before it is
          removed, subject to the retention note in the privacy policy.
        </li>
      </ul>

      <h2>10. Intellectual property</h2>
      <p>
        FieldMS, its software, design and name remain ours. You get a non-exclusive, non-transferable
        right to use the service while your subscription is current. Your content remains yours — see
        section 4.
      </p>
      <p>
        If you believe content in FieldMS infringes your copyright, email us with the detail and we
        will deal with it.
      </p>

      <h2>11. Changes to these terms</h2>
      <p>
        We may update these terms. For material changes we will email account holders at least 30
        days before they take effect rather than quietly editing this page. Continuing to use
        FieldMS after that means you accept the change; if you would rather not, cancel.
      </p>

      <h2>12. Law</h2>
      <p>
        These terms are governed by the law of Queensland, Australia, and the courts there have
        jurisdiction.
      </p>

      <hr />
      <p>
        <Link href="/privacy">Privacy policy</Link> · <Link href="/">Home</Link>
      </p>
    </LegalShell>
  )
}

/**
 * Pulls the text-message allowance out of a plan's feature list so the number
 * is stated once, in lib/plans-public.ts, rather than restated in the terms
 * where it could drift away from what the code actually enforces.
 */
function SMS_IN(features: string[]): string {
  const line = features.find((f) => /text message/i.test(f))
  const count = line?.match(/[\d,]+/)?.[0]
  return count ? `${count} messages` : 'as stated on the pricing page'
}
