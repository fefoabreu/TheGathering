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

## Hanna's property knowledge

Hanna reads the **live Google Doc** when an owner is signed in with Google. The
stored snapshot is now a genuine fallback, not the usual answer.

**Live path (default).** `search_property_docs` → `loadGovernanceDoc()` finds
"TheGathering Silveira 🌊🌄" in the Drive, exports it as plain text, splits it on
its own emoji headings and searches the sections in memory. Fetched once per
session and cached in `TG_DOC`; the doc id is cached in `localStorage`
(`tg_govdoc_id`) and re-resolved by name if it goes stale. Every result carries
`allSections`, so Hanna can see the headings she has not searched yet.

Two traps, both already hit and fixed — do not reintroduce them:
- Drive's `fullText contains 'a b c'` is a **literal phrase** match, so a
  natural-language question matched nothing and fell through to the snapshot.
  `driveSearch()` now ORs the distinctive terms.
- Section splitting keyed only on "line starts with an emoji" **destroyed** the
  House Info block: its list items (📍 📧 📸) each opened a new section whose
  empty body was then discarded. A heading must be emoji-led **and** preceded by
  a blank line.

**Snapshot path (fallback).** Used when no Google token, or when the live read
fails — in which case the result carries `liveReadFailed` and Hanna is told to
say so. Source pack `worker/knowledge.local.json` — **gitignored, never commit
it** — pushed by `worker/push-knowledge.sh` to Cloudflare KV `HANNA_CACHE /
knowledge:v1`, served by `handleDocs()` in `worker/src/index.js`. It lives in KV
rather than Firestore because guests hold anonymous Firebase tokens and
`firestore.rules` grants any signed-in caller the `gathering` collection.

The pack omits CPFs, bank accounts, home addresses, personal phone numbers and
all credentials. Re-run the script when the source documents change materially.

## House links and other shared facts

`TG_HOUSE_LINKS` in `firebase-config.js` is the single source for the house's
links, and `TG_SOUNDTRACK` for the playlist. `firebase-config.js` is the only
file both pages load, which is why shared facts belong there.

Four consumers read the link list: the owner Portals grid (`renderPortals()`),
Hanna's `get_house_info`, Sisay's manual, and `tgGuestLinks()`. **Never hardcode
a house link anywhere else** — the Instagram URL was once written in the guest
footer and the Portals tab and in neither place an agent could read, so Sisay
told a guest she did not have it while the footer below her rendered it.

Entries carry `guest: true/false`; Sisay only ever receives the filtered list, so
guest-safety is data rather than model discretion. URLs and public handles only —
passwords live in the Vault (`gathering/secrets`), because this repo is public.

The guest footer stays hardcoded on purpose: its labels are `TG_PT` translation
keys, so rendering it from data would break i18n.

## Hanna's panel

Three states, mutually exclusive, set through `hannaSetState('dock'|'max'|'min')`
— never by adding the classes directly, or a panel ends up both maximised and
collapsed (a 96vh title bar). `hannaState()` reads the current one. The choice
persists in `localStorage.tg_hanna_state`, but opening never restores straight
into `min`: the owner just asked for the panel.

`.hp-max` / `.hp-min` are declared **after** the 650px media query on purpose.
Same specificity, so source order decides — declared before it, a maximised
panel would snap back to the docked size on a phone, which is where maximising
matters most.

Close and minimise are different acts: close returns to the astrolabe, minimise
parks the conversation in the header bar with a count of what is in it.

**Openers** come from `hannaOpeners()`, built from live house data — calendar
collisions first (clause 6.4 is the expensive one), then the next real arrival,
the loudest open project, an unassigned recurring service, open Chronicle
decisions. Every source is wrapped in its own try/catch and falls back to
`HANNA_CHIPS_FALLBACK`. Two things to keep:

- Airbnb writes blocked spans as "Airbnb (Not available)". Those are filtered —
  offering "what should I have ready for Not available?" is worse than offering
  nothing.
- The ask goes in `data-ask`, not an inline `onclick`. These strings are built
  from house data, and a vendor role or block label containing an apostrophe
  used to break out of the handler.

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
