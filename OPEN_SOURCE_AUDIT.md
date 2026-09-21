# Open source audit

Generated 21 September 2026 from the installed dependency tree (398 packages),
not from `package.json` alone — transitive dependencies are where licence and
vulnerability problems actually live.

Reproduce:

```bash
npm audit --omit=dev
node scripts/audit-licences.mjs
```

---

## Verdict

**Licensing: clean.** No GPL, no AGPL, no SSPL, no CC-BY-NC, no unlicensed and
no unknown-licence packages. No licence obligations appear unmet.

**Vulnerabilities: were not clean, now are.** 7 advisories including 1 critical
at the start of this audit; **0 after remediation.**

---

## Licence distribution

| Licence | Packages | Notes |
|---|---:|---|
| MIT | 339 | Permissive |
| Apache-2.0 | 21 | Permissive; patent grant |
| ISC | 14 | Permissive |
| BSD-2-Clause | 7 | Permissive |
| BSD-3-Clause | 5 | Permissive |
| MPL-2.0 | 4 | File-level copyleft — fine unless you modify those files |
| LGPL-3.0-or-later | 2 | See below |
| Python-2.0 | 1 | Permissive |
| CC-BY-4.0 | 1 | Attribution — data/asset package |
| Unlicense / CC0-1.0 / MIT-0 / 0BSD | 4 | Public-domain equivalent |

**Flagged for review: 0.**

### The two LGPL packages

LGPL-3.0-or-later is the only entry that ever needs a second look. In a normal
Node dependency tree these are consumed as unmodified libraries via `require`,
which is the dynamic-linking case LGPL is designed to permit without imposing
copyleft on your own code. Obligations that do apply: keep the licence text,
attribute, and if you ever *modify* one of them, publish those modifications.

FieldMS does not modify them. No action.

### MPL-2.0

File-level copyleft: modifications to MPL files must be published, but
combining them with proprietary code is fine. FieldMS does not modify them.

---

## Direct dependencies

| Package | Version | Licence | Role |
|---|---|---|---|
| `next` | ^16.3.5 | MIT | Framework — **upgraded during this audit** |
| `react` / `react-dom` | 19.2.4 | MIT | UI |
| `@supabase/supabase-js` | ^2.103.0 | MIT | Database + auth |
| `@supabase/ssr` | ^0.10.2 | MIT | Server-side auth |
| `@anthropic-ai/sdk` | ^0.105.0 | MIT | Fault Finder |
| `resend` | ^6.12.4 | MIT | Transactional email |
| `twilio` | ^6.0.2 | MIT | SMS |
| `qrcode.react` | ^4.2.0 | ISC | Asset QR codes |

Dev: `typescript`, `eslint`, `eslint-config-next`, `tailwindcss`,
`@tailwindcss/postcss`, `@types/*` — all MIT.

Note these are **licences of the packages**, not of the **services**. Anthropic,
Resend, Twilio, Xero, MYOB and Google Maps each impose their own API terms, which
are a separate question and were not audited (brief §16, not done).

---

## Vulnerabilities found and fixed

### Critical — `next` 16.2.3

24 advisories, including:

- **Unauthenticated Remote Code Execution in the Image Optimization API** (AVIF)
- **Unauthenticated Remote Code Execution on Windows-hosted servers**
- Middleware / proxy bypass in App Router — several variants
- SSRF in Server Actions, and in rewrites via attacker-controlled destination host
- Cache poisoning in RSC responses; cache confusion of response bodies
- XSS in App Router with CSP nonces; XSS in `beforeInteractive` scripts
- Multiple DoS paths

Some of these are Windows- or configuration-specific and do not all apply to a
Vercel-hosted Linux App Router deployment — but the middleware-bypass and
cache-poisoning families are directly relevant, and the version was 25 releases
behind on security.

**Fixed:** `next@16.3.5`. Non-breaking (not a semver-major). Type check and
production build both pass.

### High — transitive

| Package | Issue | Fix |
|---|---|---|
| `ws` 8.0.0–8.20.1 | Uninitialised memory disclosure; memory-exhaustion DoS | `npm audit fix` |
| `nanoid` ≤3.3.17 | Infinite loop on zero/negative size; integer overflow | `npm audit fix` |
| `postcss` ≤8.5.22 | XSS via unescaped `</style>`; path traversal and arbitrary `.map` disclosure via `sourceMappingURL` | via `next` |
| `sharp` ≤0.35.4-rc.0 | Inherited libvips and libheif CVEs | via `next` |

`npm audit --omit=dev` now reports **0 vulnerabilities**.

---

## Not covered

- **Service/API terms** for the third parties above (brief §16)
- **Supply-chain integrity** — no lockfile signature verification, no
  provenance checks, no Dependabot or Renovate configured
- **Abandonment risk** — last-publish dates and maintainer counts not assessed
- **Transitive licence text collection** — if FieldMS is ever distributed as a
  binary or desktop app, attribution notices must ship with it. Not relevant to
  a hosted web app, relevant the day there is an Electron or App Store build

---

## Recommended

1. **Enable Dependabot or Renovate.** The Next.js finding was 25 security
   releases old. This should not be found by a manual audit.
2. **Add `npm audit --omit=dev` to CI** and fail the build on high or critical.
3. Re-run this audit before each release.

---

## One caveat about this run

The dependency work executed in a Linux sandbox against the mounted repository,
so `node_modules` now contains Linux-native binaries (`@next/swc-linux-*`,
`@tailwindcss/oxide-linux-*`) and the macOS ones were pruned.

**Run `npm install` on your Mac** before `npm run dev`. `package.json` and
`package-lock.json` are correct and platform-independent; only the local
`node_modules` is affected.
