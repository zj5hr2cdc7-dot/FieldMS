import type { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { LEGAL_LAST_UPDATED, LegalShell, REVIEW_NOTICE } from '@/components/LegalShell'

/*
 * ── WHAT THIS IS, AND WHAT IT IS NOT ───────────────────────────────────────
 * The factual half of a privacy policy: what FieldMS actually collects, where
 * it goes, who can see it and how to get rid of it. Every statement here was
 * checked against the schema, the RLS policies and the third-party calls in
 * this repository — it is a description of the system, not a template.
 *
 * What it is NOT is a lawyer's document. The clauses that need professional
 * judgement — the precise APP wording, overseas disclosure statements,
 * complaint-handling obligations, whether FieldMS is an APP entity at its
 * current turnover — are deliberately not invented here.
 *
 * See LEGAL_REVIEW_REQUIRED.md §A3. Have this reviewed before charging.
 */

export const metadata: Metadata = {
  title: 'Privacy policy',
  description:
    'What FieldMS collects, where it is stored, who can see it, and how to export or delete it.',
  alternates: { canonical: '/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy policy" updated={LEGAL_LAST_UPDATED}>
      <p>{REVIEW_NOTICE}</p>

      <h2>Who we are</h2>
      <p>
        FieldMS is job management software for Australian electrical contractors, operated from
        Queensland, Australia. You can reach us at{' '}
        <a href="mailto:jack.gapes@outlook.com">jack.gapes@outlook.com</a>.
      </p>

      <h2>The two kinds of information here</h2>
      <p>
        This matters more in FieldMS than in most software, so it is worth being plain about it.
      </p>
      <ul>
        <li>
          <strong>Your information</strong> — the account details of the business using FieldMS, and
          of its staff.
        </li>
        <li>
          <strong>Your customers&apos; information</strong> — the names, addresses and contact
          details of the people your business does work for. You collect this; we store and process
          it on your behalf. Those people have no relationship with us, which is why we do not
          market to them, sell this data, or use it for anything other than running the service for
          you.
        </li>
      </ul>

      <h2>What we collect</h2>

      <h3>From you, the business</h3>
      <ul>
        <li>Name, email address and password (stored only as a one-way hash, never in readable form)</li>
        <li>Business name, trading name, ABN, electrical contractor licence number and logo</li>
        <li>Staff names, roles, phone numbers, assigned vehicle, licences and tickets</li>
        <li>Subscription and payment status</li>
      </ul>
      <p>
        Card numbers are never sent to us or stored by us. Payment details go directly to Stripe,
        who are PCI-compliant; we only receive whether a payment succeeded.
      </p>

      <h3>About your customers, entered by you</h3>
      <ul>
        <li>Name, email address, phone number and site addresses</li>
        <li>Job history, quotes, invoices and payments</li>
        <li>Photos taken on site, site reports, test sheets and certificates</li>
        <li>Signatures captured on site when approving a quote or signing a document</li>
        <li>Whether that customer has consented to marketing contact</li>
      </ul>

      <h3>Location</h3>
      <p>
        When a technician marks that they are travelling to a job, FieldMS records their device
        location so the customer can follow their arrival. This happens only between starting travel
        and arriving — not continuously, and not outside a job.
      </p>
      <p>
        <strong>If you use this, you are the employer collecting it.</strong> Workplace surveillance
        law differs between Australian states, and some require written notice to staff before any
        tracking begins. Check your obligations before switching it on.
      </p>

      <h3>Automatically</h3>
      <p>
        Standard server logs: IP address, browser, pages requested and timestamps, kept for
        operational and security purposes. We do not use advertising trackers, and there are no
        third-party analytics or advertising cookies on this site.
      </p>

      <h2>Why we collect it</h2>
      <p>
        To run the service you are paying for, and for nothing else. Specifically: to show you your
        jobs, to send documents to the customers you tell us to send them to, to keep an audit trail
        behind compliance records, to take payment for your subscription, and to investigate faults
        and security incidents.
      </p>
      <p>We do not sell personal information, and we do not share it for advertising.</p>

      <h2>Who can see it</h2>
      <ul>
        <li>
          <strong>Your workspace only.</strong> Separation between businesses is enforced in the
          database itself, not just in the interface. One business cannot read another&apos;s records
          even by going around the app.
        </li>
        <li>
          <strong>Roles inside your workspace.</strong> Owners see everything including cost and
          margin. Managers see jobs, customers and sale pricing but not cost. Technicians see only
          their own jobs and no pricing at all. This too is enforced in the database.
        </li>
        <li>
          <strong>Your customers</strong> see only the single document you send them, through a link
          containing a long unguessable token. Those pages are excluded from search engines.
        </li>
        <li>
          <strong>Us.</strong> We can access your data when you ask us to help with a problem, and
          when we have to investigate a fault or a security incident. Not otherwise.
        </li>
      </ul>

      <h2>Who we send it to</h2>
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>What it receives</th>
            <th>Where</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Supabase</td>
            <td>Everything — this is the database and file storage</td>
            <td>See your project region</td>
          </tr>
          <tr>
            <td>Vercel</td>
            <td>Hosting and request logs</td>
            <td>Global edge network</td>
          </tr>
          <tr>
            <td>Stripe</td>
            <td>Subscription and payment details</td>
            <td>United States</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Recipient address and message content, when you send a document</td>
            <td>United States</td>
          </tr>
          <tr>
            <td>Twilio</td>
            <td>Recipient number and message text, when you send a text</td>
            <td>United States</td>
          </tr>
        </tbody>
      </table>
      <p>
        Sending an email or a text to your customer necessarily discloses their address or number to
        the provider that delivers it. Some of these providers store data outside Australia.
      </p>

      <h2>How long we keep it</h2>
      <p>
        While your account is open, and after closure only for as long as we are required to. Note
        that compliance records — test sheets, certificates, site reports — are evidence your
        business may be legally required to retain for years, so we do not delete them on a schedule
        of our own choosing. <strong>Export anything you need before closing your account.</strong>
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          <strong>See it</strong> — everything about your business is visible in the app.
        </li>
        <li>
          <strong>Correct it</strong> — edit it in the app, or ask us.
        </li>
        <li>
          <strong>Export it</strong> — your business data can be exported. Ask us and we will help.
        </li>
        <li>
          <strong>Delete it</strong> — email us and we will delete your workspace, subject to the
          retention note above.
        </li>
        <li>
          <strong>Complain</strong> — email us first. If we have not resolved it, the Office of the
          Australian Information Commissioner takes privacy complaints.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        All traffic is encrypted in transit. Passwords are hashed and never stored in readable form.
        Uploaded files sit in private storage reachable only through short-lived signed links.
        Separation between businesses, and between roles, is enforced at the database level. We
        audit our dependencies for known vulnerabilities.
      </p>
      <p>
        No system is perfectly secure. If we discover a breach likely to cause you serious harm we
        will tell you, and notify the regulator where required.
      </p>

      <h2>Changes</h2>
      <p>
        If we change this materially we will tell account holders by email rather than quietly
        editing the page.
      </p>

      <hr />
      <p>
        <Link href="/terms">Terms of service</Link> · <Link href="/">Home</Link>
      </p>
    </LegalShell>
  )
}
