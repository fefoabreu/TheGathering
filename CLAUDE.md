# TheGathering Silveira — project instructions

## Source of truth

**[`claude-code-handoff-owner-agent.md`](claude-code-handoff-owner-agent.md) is the source of truth for the
TGS Business Manager build.** Read it in full before planning or writing code in
`owner.html`. Governance for the initiative lives outside this repo, in the
claude.ai Project "fefoabreu.me | Ventures" → `ventures/thegathering-business-manager.md`.

Its four phases run **strictly in order (1 → 4)**. Phase 1 (Auth-Lite) is a blocker for
everything after it. Do not begin a phase until Fêfo has verified the previous one
against the brief's acceptance criteria. At the end of each phase, produce the build
summary described in the brief's "Reporting back" section.

Guiding constraint from the brief: **extend what exists, do not re-architect it.**

## What this repo actually is

Static site, no build step, deployed by **GitHub Pages** (not Firebase Hosting) from
`main` at the repo root, served on the custom domain `fefoabreu.me/TheGathering/`.

- `index.html` — public guest site (single file: markup, CSS and JS inline)
- `owner.html` — owners' portal (same single-file pattern)
- `firebase-config.js` — shared Firebase config + Firestore document paths
- `firestore.rules` — deployed with `firebase deploy --only firestore:rules`
- `assets/` — photography and video

**The repository is public.** Nothing secret may ever be committed — see
`~/.claude/CLAUDE.md`. Firebase *web API keys* are the documented exception: they are
public identifiers, and Firestore rules are the actual security boundary.

## Firebase reality check (verified Aug 12, 2026)

The brief states Auth/Firestore/Functions/Hosting are "already stood up". Only
Firestore is. Confirm current state before relying on any of it:

| Service | State |
|---|---|
| Firestore | Live, rules deployed, project `thegathering-996d2` |
| **Auth** | **Not provisioned** — every sign-in returns `CONFIGURATION_NOT_FOUND` |
| Functions | Do not exist; no `functions/` directory |
| Hosting | Not used — GitHub Pages serves the site |

Enabling Auth and adding Functions both require the **Blaze plan**; the Identity
Platform API refuses to provision on Spark (`BILLING_NOT_ENABLED`). These are console
actions only Fêfo can take — do not attempt to work around them.

Never create accounts or set/handle owner passwords. Write the code that signs in, and
leave account creation and password entry to Fêfo.

## Conventions

- Single-file pages: keep CSS in the page's `<style>` and JS in its `<script>`.
- **CSS source order matters here.** Several base rules are declared *after* their
  media queries; a later same-specificity rule wins regardless of breakpoint. When a
  responsive rule "does nothing", check ordering before specificity.
- Mobile breakpoints: `880px` (2-col), `650px` (phone), `540px`, `420px`. Verify
  changes at 390px in **both languages** — Portuguese runs ~15% longer than English
  and card heights are fixed.
- i18n: one `TG_PT` dictionary in `index.html`, keyed by the exact rendered English
  string. Translation walks text nodes, so dynamically-rendered content is covered too.
- Always verify in the browser before pushing, then commit, push, and confirm the
  Pages deploy succeeded.
