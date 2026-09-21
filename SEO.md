# SEO

What is done, what only you can do, and what actually moves the needle.

---

## The thing that was wrong

The landing page was a client component that rendered a spinner until it knew
whether you were signed in. That check only resolves in the browser, so the
HTML served to every crawler was:

```html
<body><div class="animate-spin"></div></body>
```

1.8KB. No heading, no copy, no link to /signup. Google can run JavaScript and
would eventually have seen the real page, but it queues those pages for a
second pass that can take days and it ranks them worse. Bing, LinkedIn, Slack,
Facebook and the AI crawlers mostly do not run JavaScript at all — they saw a
spinner and nothing else.

That is now fixed. The prerendered homepage is 64KB with 17 headings in it.
No amount of keyword work would have mattered until this was true.

**Keep it that way.** If you need React state on the landing page, put it in a
small client component like `components/marketing/MarketingNav.tsx`. The moment
`'use client'` goes back on the top of `app/page.tsx`, the site is invisible
again and nothing will tell you.

---

## What is in place now

| | |
|---|---|
| Server-rendered landing page | 64KB of real HTML, verified in the build output |
| `/robots.txt` | Generated from `lib/seo.ts`. Was a 404 |
| `/sitemap.xml` | Generated. Was a 404 |
| Canonical URLs | Stops apex vs www being treated as duplicate sites |
| Title & description | Rewritten search-first — see below |
| `lang="en-AU"` | Tells Google the page is for an Australian audience |
| JSON-LD | `Organization`, `WebSite`, `SoftwareApplication` |
| Per-page metadata | `/signup` and `/login` no longer inherit the homepage's |
| `X-Robots-Tag: noindex` | On customer token pages — see the warning below |

The title went from *"FieldMS — Job management software for Australian
electricians"* to *"Electrician Job Management Software Australia | FieldMS"*.
Same words, different order, and the order is the whole point: Google weights
the front of the title, and nobody searches for "FieldMS" yet.

### The token pages — read this one

`/invoice/<token>`, `/quote/<token>`, `/certificate/<token>` and the rest are
publicly reachable with no login. That is correct — it is how a customer opens
what you emailed them. But they contain another business's customer names, site
addresses, prices and compliance records.

One customer pasting that link into a Facebook group or a help-desk ticket is
enough for Google to find it. They now serve `X-Robots-Tag: noindex`.

They are deliberately **not** blocked in `robots.txt`, which looks backwards.
robots.txt stops a page being *crawled*, not *indexed* — Google will still
index a blocked URL it finds linked somewhere, and it can never see a noindex
instruction on a page it is forbidden to fetch. Serving the header is the only
combination that works.

This is a backstop. The security control is that the tokens are unguessable.

---

## What only you can do

**1. Google Search Console** — <https://search.google.com/search-console>

Add `fieldms.com.au` as a *Domain* property (not URL prefix — domain covers
apex and www together). It will give you a DNS TXT record to add at GoDaddy.

Then submit `https://fieldms.com.au/sitemap.xml` and use **URL Inspection →
Request Indexing** on the homepage. That is the single fastest way into the
index; without it you wait for Google to find you on its own.

If Search Console gives you an HTML tag instead of a DNS record, set
`GOOGLE_SITE_VERIFICATION` in Vercel to the token and redeploy — `layout.tsx`
already reads it.

**2. Bing Webmaster Tools** — <https://www.bing.com/webmasters>. Takes two
minutes, imports straight from Search Console. Bing is small, but it is what
ChatGPT search reads.

**3. Check it worked**, a day or two after deploying:

- `site:fieldms.com.au` in Google — counts what is indexed
- <https://search.google.com/test/rich-results> — confirms the JSON-LD parses
- <https://developers.facebook.com/tools/debug> — still needs a re-scrape to
  clear Meta's cached, card-less version of the URL

---

## What actually gets you ranked

Everything above is the foundation. It gets you *indexed*. It does not get you
*found*, because you are currently a three-page site competing with ServiceM8,
Tradify, simPRO and AroFlo, who have spent years and real money on this.

You will not win "electrician software australia" this year. You do not need
to. The people worth reaching search for something more specific, and those
searches are winnable because the incumbents write for everyone.

**Pages worth building, roughly in order of payoff:**

1. **State compliance pages.** NSW CCEW, VIC Certificate of Electrical Safety,
   QLD Certificate of Testing and Safety, WA Notice of Completion. One page
   each, explaining what the form is, who has to lodge it and when. This is
   the highest-intent traffic on the list and the incumbents cover it thinly
   because they sell to every trade in every state.
   **Check every requirement against the current regulator before publishing.**
   Wrong compliance information is worse than no page.

2. **Free test sheet / certificate template.** A page that generates a clean
   test sheet as a PDF, free, no signup. Sparkies search for this constantly,
   it earns links, and it demonstrates the product rather than describing it.

3. **Comparison pages.** "ServiceM8 alternatives for electricians", "Tradify vs
   FieldMS". High commercial intent. Be scrupulously fair about the
   competitors — you are the small one, and a hatchet job reads like one.

4. **A blog, but only if you will keep it up.** Two good posts a year beats
   twelve thin ones, and an abandoned blog with a 2026 date on the last post is
   worse than no blog.

**Do not** buy links, spin AI content at volume, or stuff the footer with
"electrician software Sydney Melbourne Brisbane". It does not work any more and
it risks a manual penalty on a domain you have just started.

**Timeline, honestly:** a new domain takes six to twelve months to rank for
anything competitive. For early access sign-ups in the next three months,
direct outreach, trade Facebook groups and the walkthrough video will all beat
SEO. Build the SEO because it compounds, not because it is the fast path.

---

## Before you drive traffic here

These are open and they hit anyone who signs up today:

- **The service role key is still not rotated.** It was exposed in a browser
  console during debugging.
- **The five demo accounts still share `demo1234`** on a live public domain.
- **No privacy policy or terms of service.** The footer link goes to `#`. You
  are storing other businesses' customer contact details and compliance
  records, so this is not optional, and Google treats a missing privacy policy
  as a trust signal against a business site.
- **The invite flow is broken** and onboarding swallows the error silently.
- **The role model mismatch** in `lib/auth.ts` — it casts to the old role union
  and never calls `normaliseRole`.

Sending traffic to a site where signup half-works is worse than sending none:
you only get one first impression per visitor, and Google notices when people
bounce straight back to the results page.

Full list in `PREFLIGHT.md` and `GO_LIVE.md`.
