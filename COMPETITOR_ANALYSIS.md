# FieldMS vs Top 10 Electrician Field Scheduling Software
*Competitive analysis with review-sourced pain points — July 2026*

## 1. Your current FieldMS setup

Next.js 16 + Supabase multi-tenant app with: auth/workspaces/RLS, team roles, jobs, schedule, estimates (public share pages), forms, billing items per job, job plans (file upload), customer job tracking via token link (`/track/[token]`), reviews, integrations scaffold, AI assistant (Anthropic SDK), AS/NZS 3000 clause references, equipment/supplier catalogue, Twilio SMS + Resend email.

**Positioning signal:** AS3000 references + electrical-specific data = you're already deeper into the electrician niche than 8 of the 10 competitors, which are generic field-service tools.

## 2. The top 10 at a glance

| # | Product | Market | Sweet spot | Pricing model |
|---|---------|--------|-----------|---------------|
| 1 | ServiceTitan | US, enterprise | 20+ techs | ~$250–500/tech/mo + $5k–50k implementation |
| 2 | Jobber | US/CA, SMB | 1–15 staff | Per-user tiers, $29/extra user |
| 3 | Housecall Pro | US, SMB | Home services | Tiered + heavy add-on costs |
| 4 | FieldEdge | US, mid | HVAC/electrical, QuickBooks shops | 12-mo contract, Clearent lock-in |
| 5 | simPRO | AU/NZ/UK, mid-large | Complex projects, inventory | High cost + paid training ($750/3hrs NZ) |
| 6 | ServiceM8 | AU/NZ, small | 1–20 staff, iOS users | Per-job (not per-user) |
| 7 | Tradify | AU/NZ/UK, small | Sole traders–5 staff | Per-user |
| 8 | AroFlo | AU, mid-large | Custom workflows | Per-user, higher cost |
| 9 | Fergus | NZ/AU, small-mid | Electricians/plumbers | Tiered, frequent price rises |
| 10 | BuildOps | US, commercial | Commercial electrical contractors | Enterprise pricing |

## 3. Review-sourced pain points per product

### ServiceTitan
- Support "TERRIBLE" for a product complex enough to need it constantly; tickets drag for weeks (G2)
- $250–500/tech/mo; value-for-money is its weakest sub-rating (3.8/5 Software Advice)
- Implementation 2–12 months, $5k–50k fees; some pay full subscription for months before go-live
- 12-month minimum contracts, cancellation penalties, hard-to-exit even at term end
- 18% one-star on Trustpilot — works for big shops, burns small ones

### Jobber
- **QuickBooks sync is the #1 complaint**: duplicate entries, broken connections, manual reconciliation
- Per-user pricing = "nickel-and-dimed" (viral r/sweatystartup thread, 66 upvotes)
- **No electrical-specific fields**: no permit tracking, compliance docs, code references, load calcs
- No custom reports; can't track close-rate or average ticket properly
- Manual drag-drop scheduling only — no skill/location-based tech matching
- Offline mode read-only: can't create jobs, take payments, or sync without signal
- Outgrown at ~15 staff: no inventory, weak job costing

### Housecall Pro
- Rating collapsed 3.7 → 2.9 (Aug 2024 → late 2025)
- Unauthorized recurring charges, aggressive payment retries (BBB complaints)
- **Add-on cost creep is the single most common churn reason**
- Support access removed/degraded through 2026
- No native route optimization, no inventory, no offline editing; GPS unreliable

### FieldEdge
- Mobile apps rated **1.8/5 (iOS) and 2.0/5 (Android)** — syncing failures, lost quotes, crashes on weak signal
- Customers can't approve emailed quotes — must reply to the email
- System-wide downtime locks out office + field simultaneously
- 12-month contract enforced even when product doesn't work
- Locked into Clearent payments; promised 2.7% rates, charged 3.4%

### simPRO
- Steep learning curve, clunky UI; "several hours to produce a single invoice" during bad setups
- **$750 NZD for 3 hours of training** when hiring new staff
- Unreliable time tracking, persistent platform issues
- Expensive; overkill below ~10 staff

### ServiceM8
- **Android app is a crippled lite version** — time tracking iOS-only
- Recurring jobs based on 24hr blocks, not work hours → calendar errors
- No conflict detection, shift management, or availability rules in scheduler
- No support phone number; outdated tutorials; refund requests rejected
- v11 launch left support tickets open 5 months; heavy battery drain

### Tradify
- **"Sent from Tradify" footer on quotes/invoices** — unfixed for years despite complaints
- No photo site reports, **no compliance certificates** — dealbreaker quote: "our contractors want a detailed report from site with pictures which this system doesn't allow"
- Online-only, no offline sync
- Shallow reporting (no per-engineer/job-type breakdown without Excel export)
- Weak inventory; can't add products from mobile; no Google Calendar sync; scheduler unreadable past ~8 staff

### AroFlo
- "Hasn't evolved in the slightest since 2013" (long-term customer)
- Slow performance, search issues, layouts change after updates
- No full-database reporting engine; clunky invoice layouts
- Dev team resistant to feature requests

### Fergus
- Price increases every 6–12 months without clear added value
- Limited quoting reports/CRM; hard to find previous product prices
- Very limited app for apprentices; clunky health & safety module

### BuildOps
- Bugs, syncing errors, data changing/defaulting to previous entries
- AI-bot-first support that explains the problem instead of fixing it
- Unexpected disruptive updates; limited customization; closed fleet-tracking integration

## 4. Cross-market gaps (nobody does these well)

1. **Compliance certificates in the core product.** Electricians run a second app (e.g. iCertifi) because their main tool can't do test sheets/COES/CCEW. Audit scenario from the field: photos on three phones, test printouts in the ute, COES lodged late → stop-work notices and insurance queries. **You already have as3000.ts and forms — this is your wedge.**
2. **Quote approval friction.** FieldEdge customers literally reply to emails to approve quotes. One-tap approval on your public estimate pages beats a top-10 player.
3. **Trust in billing.** ServiceTitan/FieldEdge/Housecall all generate rage about contracts, lock-in, surprise charges. Month-to-month + transparent pricing is a marketable feature, not just a policy.
4. **Support.** The most common complaint across all 10. A small team answering fast is a durable advantage vs. private-equity-owned incumbents.
5. **Per-user pricing resentment.** ServiceM8's per-job pricing is loved. Consider job-based or flat tiers so adding an apprentice is free.
6. **Offline field use.** Jobber, Tradify, Housecall all fail in basements/rural signal dead zones. True offline-first mobile is unclaimed in the SMB segment.

## 5. What to build in FieldMS (priority order)

| Priority | Feature | Pain point it kills | Your existing base |
|----------|---------|--------------------|--------------------|
| P1 | Digital test sheets + electrical safety certificates (COES/CCEW), lodgement-ready PDF with embedded photos + AS3000 clause refs | Tradify (no certs), Jobber (no compliance), iCertifi two-app split | `lib/as3000.ts`, forms, plans upload |
| P1 | One-tap quote approval + deposit payment on public estimate page | FieldEdge email-reply approvals | `app/estimates/[id]` |
| P1 | Accounting sync (Xero first for AU, then QuickBooks) that handles partial payments/deposits without duplicates | Jobber's #1 complaint | `lib/integrations.ts` |
| P2 | Photo site reports — branded PDF from job photos + notes, sent via SMS/email | Tradify's dealbreaker | plans, Twilio/Resend |
| P2 | Scheduler with conflict detection + work-hours-aware recurring jobs + skills-based tech suggestions | ServiceM8 24hr bug, Jobber manual-only | `dashboard/schedule` |
| P2 | Offline-capable mobile (PWA with local queue + sync) | Jobber/Tradify/HCP offline gaps | Next.js PWA route |
| P3 | Real reporting: close rate, avg ticket, profit per job/tech/customer | Jobber, Tradify, Fergus, AroFlo all weak | billing items, estimates |
| P3 | White-label comms — never brand customer-facing docs with "FieldMS" | Tradify footer rage | tenant_settings |
| P3 | Android parity from day one; feature parity is a stated differentiator | ServiceM8 Android lite | web-based = free win |

**Pricing/positioning recs:** month-to-month, no implementation fee, flat or per-job pricing, self-serve onboarding under 1 day, human support with published response times. Every one of those is the inverse of a top-3 complaint about the incumbents.

## Sources

- [ServiceTitan reviews — GetOneCrew](https://www.getonecrew.com/post/servicetitan-reviews) · [Capterra](https://www.capterra.com/p/150053/ServiceTitan/reviews/) · [Trustpilot](https://www.trustpilot.com/review/servicetitan.com) · [FieldCamp pricing analysis](https://fieldcamp.ai/reviews/servicetitan/)
- [Jobber reviews — GetOneCrew](https://www.getonecrew.com/post/jobber-reviews) · [Capterra](https://www.capterra.com/p/127994/Jobber/reviews/) · [Jobber for electricians](https://aiscending.com/jobber-for-electricians/) · [G2 pros/cons](https://www.g2.com/products/jobber/reviews?qs=pros-and-cons) · [Electrician Talk thread](https://www.electriciantalk.com/threads/moving-to-a-software-platform%E2%80%A6again.303075/)
- [Housecall Pro — Trustpilot](https://www.trustpilot.com/review/housecallpro.com) · [BBB complaints](https://www.bbb.org/us/ca/san-diego/profile/marketing-software/housecall-pro-1126-1000067843/complaints) · [Capterra](https://www.capterra.com/p/140363/HouseCall-Pro/reviews/) · [FieldCamp review](https://fieldcamp.ai/reviews/housecall-pro/)
- [FieldEdge — Capterra](https://www.capterra.com/p/111740/FieldEdge/reviews/) · [FieldServiceTools review](https://fieldservicetools.com/reviews/fieldedge/)
- [simPRO — Capterra](https://www.capterra.com/p/10529/Simpro-Enterprise/reviews/) · [Workyard review](https://www.workyard.com/compare/simpro-review) · [Whirlpool forum](https://forums.whirlpool.net.au/archive/2090076) · [G2](https://www.g2.com/products/simpro/reviews)
- [ServiceM8 — Trustpilot](https://www.trustpilot.com/review/www.servicem8.com) · [Capterra](https://www.capterra.com/p/110711/ServiceM8/reviews/) · [Connecteam review](https://connecteam.com/reviews/servicem8/) · [G2](https://www.g2.com/products/servicem8/reviews)
- [Tradify — Capterra](https://www.capterra.com/p/152413/Tradify/reviews/) · [SoftwareSorted UK review](https://softwaresorted.co.uk/electricians/tradify-review)
- [AroFlo — Capterra](https://www.capterra.com/p/166811/AroFlo/reviews/)
- [Fergus — Capterra](https://www.capterra.com/p/155571/Fergus/reviews/) · [Trustpilot](https://www.trustpilot.com/review/fergus.com) · [Software Advice](https://www.softwareadvice.com/construction/fergus-profile/reviews/)
- [BuildOps — Capterra](https://www.capterra.com/p/194155/BuildOps/reviews/) · [G2](https://www.g2.com/products/buildops/reviews)
- Market roundups: [Tofu FSM for electricians](https://tofu.com/blog/best-field-service-management-software-for-electrical-contractors) · [TradieAutomate AU comparison](https://tradieautomate.com/blog/best-job-management-software-electricians-australia/) · [Hey Jodie UK roundup](https://heyjodie.com/en-gb/guides/best-electrician-software/) · [Drawer.ai electrical contractors](https://drawer.ai/blog/job-management-software-for-electrical-contractors)
