# Standards and IP review

Status: **one CRITICAL finding, unresolved. Requires your decision, not an engineering fix.**

---

## 1. CRITICAL — a third-party copyrighted book is embedded in the product

`knowledge/fault-finder/fault_finding_manual.md` — 185KB, 4,700+ lines.

Its own first page reads:

> `# FieldMS Fault-Finding Manual (OCR Transcript)`
> `Transcribed from photographed manual pages.`
>
> Fault Finder's Bible: Electrical Edition
> © 2025 Fault Lab — All rights reserved.
> Published by Fault Lab, ABN 45 691 833 593, ISBN 978-1-7641674-0-6, Second Edition
>
> *"No part of this publication may be reproduced, distributed, or transmitted
> in any form or by any means … without the prior written permission of the
> publisher, except in the case of brief quotations used in reviews or
> educational purposes."*

### What the codebase currently does with it

| Step | Where |
|---|---|
| The whole book is stored in the repository | `knowledge/fault-finder/fault_finding_manual.md` |
| It is bundled into every production deploy | `next.config.ts` → `outputFileTracingIncludes` |
| It is concatenated into the system prompt | `app/api/assistant/route.ts` → `buildSystemPrompt()` |
| It is transmitted to a third party on every message | Anthropic API |
| It is the substantive knowledge base of a commercial product | FieldMS Fault Finder |

The README states this plainly: *"the full diagnostic reference text"*.

### Why this is the top of the list

This is not a grey area about how much of a standard you may paraphrase. It is
a complete, identifiable, in-print commercial work, reproduced in full, in a
product you intend to charge for, and retransmitted to a third party on every
use. The "educational purposes" carve-out in that notice covers brief
quotation; it does not cover ingesting the entire book as a commercial
product's knowledge base.

Three separate exposures, each of which stands alone:

1. **Copyright.** Reproduction and communication of the whole work.
2. **Contract.** Whatever terms the book was sold under.
3. **Consumer law.** FieldMS markets Fault Finder as its own capability. If the
   substance is someone else's book, the representation about what FieldMS is
   may itself be a problem.

### Options, in order of preference

1. **Licence it.** Approach Fault Lab for a written commercial licence to use
   the text as an AI knowledge base. They are a small Australian publisher with
   an ABN; this may be entirely achievable and is by far the cleanest outcome.
   Get it in writing, and make sure it covers transmission to a third-party AI
   provider — that is the clause a generic reprint licence will not cover.
2. **Replace it.** Commission or write an independent fault-finding reference.
   Diagnostic *method* is not protected; this specific expression of it is.
   Expensive, but it becomes an asset you own.
3. **Disable Fault Finder** until 1 or 2 lands.

### What I did not do, and why

I have **not** deleted the file, disabled the feature, or edited the manual.
Deleting it would destroy the artefact you need in order to have the licensing
conversation, and disabling a feature is your commercial call.

I also did not reword or restructure the text to make it less recognisable.
That would not fix the legal position — a derivative work of an infringing copy
is still infringing — and it would make the problem harder to see later.

**Until this is resolved, every day Fault Finder is live is a day of ongoing
reproduction.** That is the part that should drive the timeline.

---

## 2. AS/NZS standards — lower risk than expected, but not zero

The original brief anticipated copied standards text. That is **not** what is
in the repository. Actual references to AS/NZS material:

| Where | What | Risk |
|---|---|---|
| `knowledge/.../fault_finding_manual.md` | 9 mentions total (AS/NZS 3000 ×6, 3017 ×2, 3760 ×1) | Part of finding 1, above |
| `app/layout.tsx` keywords | `"AS/NZS 3000 compliance software"` | Low — naming a standard is not infringement |
| Login page | `"AS/NZS 3000 aware"` | Low, but see below |
| `lib/`, test sheets | Field labels (insulation resistance, RCD trip time, polarity) | None — these are terms of art |

No clause text is reproduced. No clause tables. No test limits copied from a
standard. That is the right position and worth keeping.

**"AS/NZS 3000 aware" (login page, marketing).** Not a legal problem, but it is
a claim with nothing behind it — there is no verification that any workflow
matches any clause. Covered in `MARKETING_CLAIMS_AUDIT.md`. Standards Australia
also actively protects its marks; implying endorsement is the line to stay well
clear of, and "aware" is close enough to it to be worth rewording.

### If you ever want real clause references

Standards Australia licences AS/NZS content through distributors. Embedding
clause text without one is the same category of problem as finding 1. **Do not
let the AI generate clause numbers from memory as a substitute** — see
`AI_SAFETY_POLICY.md`; that is a worse outcome than having no citations at all,
because a plausible wrong clause number in a compliance product is actively
dangerous.

---

## 3. Open source — clean

Full data in `OPEN_SOURCE_AUDIT.md`. Summary: 398 packages, no GPL, no AGPL, no
SSPL, no unlicensed, no unknown. 339 MIT, 21 Apache-2.0, 14 ISC, the rest
permissive. Two LGPL-3.0-or-later packages, which is fine for dynamic linking
in a normal Node dependency tree. **No licence obligations appear unmet.**

Dependency vulnerabilities were a separate matter and are now fixed — see
`AUDIT_REPORT.md`.

---

## 4. User-uploaded content

Customers upload plans, photos, manufacturer documentation and site documents.
Some of that will be third-party copyrighted material (manufacturer manuals,
architectural drawings) uploaded by users who may not hold the rights.

FieldMS needs, and does not yet have:

- Terms stating the user warrants they have the right to upload what they upload
- A licence to FieldMS narrow enough to operate the service and no broader —
  **do not claim ownership of customer content**
- A takedown/complaint path
- Deletion that actually removes the object from storage

None of this exists today. It is in `LEGAL_REVIEW_REQUIRED.md` §A.

---

## What needs a lawyer

| # | Question |
|---|---|
| 1 | The Fault Lab manual — exposure, and whether Fault Finder can operate at all before a licence |
| 2 | Whether OCR-transcribing rather than copying changes anything (my assumption: no) |
| 3 | Transmission to Anthropic as a separate act of communication |
| 4 | Whether past use creates exposure even if you stop now |
| 5 | User-content terms, and the scope of the licence FieldMS needs |
| 6 | "AS/NZS 3000 aware" as a marketing claim |

I am not a lawyer and this is not legal advice. Finding 1 is flagged as
critical because the work's own copyright page states the restriction — that
is a reading of the document, not a legal conclusion about your position.
