# FieldMS Fault Finder — knowledge base

The reference material behind the in-app FieldMS Fault Finder chat assistant
(`/dashboard/assistant` and `/field/assistant`, served by `app/api/assistant/route.ts`).

| File | What it is |
| --- | --- |
| `system_prompt.md` | The assistant persona, scope and response format. Electrical only. |
| `fault_finding_manual.md` | "Fault Finder's Bible: Electrical Edition" — the full diagnostic reference text. |

## How it is used

At runtime the API route reads both files, concatenates them into a single
system prompt and sends it to Claude with `cache_control: ephemeral`, so the
manual is cached between turns rather than re-billed on every message. The
prompt is built once per server process and held in memory.

Because the files are read from disk at request time, `next.config.ts` lists
this folder in `outputFileTracingIncludes` so it is bundled into production
deployments.

## Scope

FieldMS Fault Finder is for electrical trades only: electrical, solar, data and
communications, security and automation. HVAC and refrigeration diagnostics are
deliberately out of scope, both in the persona above and in the server-side
entitlement check in the API route.

## Editing

Edit the markdown directly. Changes take effect on the next server restart
(the prompt is cached in module scope). Keep the manual's headings intact —
the persona instructs the model to navigate the text by section.
