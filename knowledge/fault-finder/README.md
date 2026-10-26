# FieldMS Fault Finder — knowledge base

The reference material behind the in-app FieldMS Fault Finder chat assistant
(`/dashboard/assistant` and `/field/assistant`, served by `app/api/assistant/route.ts`).

| File | What it is |
| --- | --- |
| `system_prompt.md` | The assistant persona, scope and response format. Electrical only. |

## How it is used

At runtime the API route reads `system_prompt.md` and sends it to Claude as
the system prompt with `cache_control: ephemeral`. The prompt is built once per
server process and held in memory.

A third-party book ("Fault Finder's Bible: Electrical Edition") used to be
appended to the prompt in full. It was removed because FieldMS has no licence
to reproduce it. Do not add copyrighted manuals or Australian Standards text to
this folder without a written licence.

Because the file is read from disk at request time, `next.config.ts` lists
this folder in `outputFileTracingIncludes` so it is bundled into production
deployments.

## Scope

FieldMS Fault Finder is for electrical trades only: electrical, solar, data and
communications, security and automation. HVAC and refrigeration diagnostics are
deliberately out of scope, both in the persona above and in the server-side
entitlement check in the API route.

## Editing

Edit the markdown directly. Changes take effect on the next server restart
(the prompt is cached in module scope). The persona is a safety control: have a
licensed electrician review any change before it ships.
