# AI safety policy — FieldMS Fault Finder

Applies to `app/api/assistant/route.ts`, `knowledge/fault-finder/`,
`lib/ai-safety.ts`, and any future AI feature.

**Status:** the input-side controls are implemented and tested. The
output-side controls are specified here and **mostly not yet built** — each is
marked. This document is the standard to build to, not a description of a
finished system.

---

## 1. Why this product needs one

Fault Finder tells electricians what might be wrong with a live electrical
installation and what to check next. The failure mode is not an unhappy user;
it is someone acting on wrong information in a switchboard.

Two specific dangers, in order:

1. **A confident wrong answer.** More dangerous than a refusal, because it gets
   acted on.
2. **A fabricated citation.** "AS/NZS 3000 clause 2.5.4.1 requires…" with a
   plausible but invented number is worse than no citation, because it converts
   a guess into something that looks verified. A compliance product that
   invents compliance references is the worst version of this product.

---

## 2. Rules the model must follow

Enforced in `knowledge/fault-finder/system_prompt.md`. Items marked
**[GAP]** are not yet in the prompt and should be added.

### 2.1 Never fabricate

The model must not invent:

- legislation or regulation
- standards clause numbers, titles or text
- test limits, trip times, or tolerances presented as coming from a standard
- manufacturer specifications, error codes or procedures
- supplier pricing or availability
- certification or licensing requirements

If it does not have reliable material, it must say so. **"I can't verify that"
is always an acceptable answer and is never a failure.**

### 2.2 Clause numbers — **[GAP]**

The current persona says *"treat any provided standard as authoritative"* — but
no standard is provided. Only the fault-finding manual is loaded. The model is
therefore free to answer compliance questions from memory, and nothing tells it
not to invent a clause number.

Required addition:

> You do not have access to the text of AS/NZS 3000 or any other standard. Never
> state a clause number, clause title, or clause text. If asked what a standard
> requires, say that you cannot cite it, describe the general engineering
> consideration if you can do so without inventing a requirement, and direct the
> user to the current published standard.

### 2.3 Default framing for every electrical answer — **[GAP]**

> Verify against the current applicable legislation, standards, manufacturer
> instructions and site conditions before performing or certifying work.

Not on every message — meaningless repetition trains people to ignore it. It
belongs where the risk is: any answer that touches compliance, test limits,
isolation, or live work.

### 2.4 Safety sequencing — **[GAP]**

Any procedure involving contact with equipment must lead with isolation and
verification of isolation. Never describe a live-work procedure as routine.

### 2.5 Scope

Electrical only. HVAC and refrigeration diagnostics are out of scope and
enforced server-side by `canUseFaultFinder()`, not merely by the prompt.

### 2.6 Never certify

The model must never state that an installation is compliant, safe, passed, or
meets a standard. It provides decision support to a licensed person who makes
that determination. See §4 for wording.

---

## 3. Provenance metadata

### Implemented

Every response carries:

| Header | Value |
|---|---|
| `X-FieldMS-Generated-By-AI` | `true` |
| `X-FieldMS-Requires-Human-Verification` | `true` |
| `X-FieldMS-Model` | `claude-sonnet-5` |
| `X-FieldMS-Generated-At` | ISO 8601 |

Headers because the body is a plain text stream and changing the wire format
would break the existing client.

### Required but **[GAP]**

| Field | Note |
|---|---|
| `prompt_version` | Hash of `system_prompt.md` + manual, so an answer can be tied to the knowledge base that produced it |
| `knowledge_source` + version | Currently untracked — and see `STANDARDS_IP_REVIEW.md` §1 before relying on the present source at all |
| `confidence` | Only where technically meaningful. Do not render a fabricated percentage |
| `user_acknowledged` / `user_overrode` | Not captured |

**Confidence warning.** The persona already asks for a confidence statement in
its six-section format. A model's self-reported confidence is not calibrated.
Display it as the model's own characterisation, never as a measured reliability
figure.

---

## 4. Wording

Brief §3 asks for this replacement set. Apply to AI output, test sheets,
compliance screens and marketing alike.

| Do not use | Use instead |
|---|---|
| Compliant / guaranteed compliant | Potential compliance consideration |
| Pass / Fail (as a verdict) | Recorded result — *values as measured* |
| Safe / correct | Suggested verification |
| Meets AS/NZS 3000 | Verify against the applicable standard |
| The system certifies… | Reference for qualified electrical professionals |

**[GAP]** — this has been applied to neither the AI output nor the test-sheet
and compliance screens. It needs an electrician's review as well as a lawyer's:
the point is not to make the product vague, it is to stop it asserting things
only a licensed person can assert.

---

## 5. Input controls — implemented

`lib/ai-safety.ts`. See `AUDIT_REPORT.md` H3 for what was wrong.

| Control | Value |
|---|---|
| Roles accepted | `user`, `assistant` only — a smuggled `system` turn is rejected |
| Content | strings only — no content blocks, tool use or images |
| Last turn | must be `user` |
| Messages | ≤ 40 |
| Per message | ≤ 8,000 chars |
| Per conversation | ≤ 60,000 chars |
| Rate limit | 30 requests / user / minute |

8 regression tests in `scripts/security-tests.mjs`.

**Known weakness.** Assistant turns are accepted from the client because the
UI replays conversation history, and there is no way to verify a given
assistant turn is genuinely ours. The real fix is server-side conversation
persistence, replayed from the database — which would also deliver the §3 audit
trail. Until then the mitigation is that the system prompt is re-sent on every
request and outranks the history.

**Rate limit weakness.** In-memory, so it resets on cold start and does not
coordinate across serverless instances.

---

## 6. Testing

Implemented (`scripts/security-tests.mjs`): input validation and rate limiting.

**[GAP]** — brief §25 also requires evaluation of *output*: hallucinated
regulation, hallucinated clause numbers, unsupported claims, missing
disclaimers, unsafe recommendations. That needs a prompt-evaluation harness with
a fixed question set and a human electrician grading the answers. Not built.

---

## 7. Review

`system_prompt.md` is a **safety control**, not copy. Changes to it should be
reviewed by a licensed electrician, and the behavioural evals in §6 re-run once
they exist.

**Nothing in this document has been reviewed by an electrician or a lawyer.**
