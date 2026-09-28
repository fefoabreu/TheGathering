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

## Who can read Firestore (fixed 2026-09-09)

`signedIn()` used to mean `request.auth != null`. The @tgs gate and the public
guest site BOTH sign in anonymously — Sisay needs a Firebase token to reach her
Worker — so the rules could not tell an owner from a passer-by. **Anyone loading
the guest site could read `gathering/secrets` (lock codes, WiFi, vendor payment
details) and `gathering/bookings` (guest names, origins, travel).** Verified
against the live database, then closed.

`isOwner()` now requires `sign_in_provider != 'anonymous'`, which the client
cannot forge. Public reads are limited to `gathering/guide` and
`gathering/houseGuide`, the only two docs the guest site renders.

**The @tgs password path can no longer open the portal** — it can only mint an
anonymous session. Google sign-in on the house account is the way in, and
`TG_ALLOW_PASSWORD_FALLBACK` should stay false. Rollback, if ever needed, is the
previous rules file in git history plus `firebase deploy --only firestore:rules`.

## The guest WiFi

Owner decision: Sisay hands out the guest WiFi; lock codes stay with Estar.

It cannot live in this repo (public) and cannot live in Firestore (owner-only
now, and Sisay is anonymous like every guest). It sits in KV as `house:v1`,
served through the Worker's `action: 'knowledge'` route with `pack: 'house'`,
source `worker-sisay/house.local.json` — **gitignored**. `get_house_manual`
fetches it only when the topic is wifi/stay, never eagerly.

The guest footer stays hardcoded on purpose: its labels are `TG_PT` translation
keys, so rendering it from data would break i18n.

## The vendor directory

Owner decision: **Hanna keeps the directory, the form is the fallback.** When an
owner mentions engaging or being quoted by someone, she adds them with
`add_vendor` there and then rather than pointing at a form — entering a
contractor by hand is the 2019 way round. `update_vendor` corrects an entry;
`remove_vendor` refuses unless `confirm: true`, which the prompt tells her to earn
with a spoken yes. The `+ Add vendor` form in the Upkeep header does the same
thing for whoever prefers typing.

All four paths funnel through **`vendorAppend()` / `vendorEdit()` /
`vendorRemove()`** — one transaction each, one set of rules about duplicates,
slugs and phones. Do not add a second write path.

**Writes are transactions, never `storeSet()`.** `storeSet()` puts this browser's
whole cache back with `ref.set()`; if the cache is stale, or another owner added
someone a minute ago, "append and save" silently deletes entries. The
transactions read the server's current list and append to *that*, so existing
entries survive by construction rather than by luck.

Phone numbers go to the Vault as **one field** —
`update(new FieldPath('vendorPhone', id), phone)` — because the repo is public
and the page renders from `vendorPhone`. Pasted numbers carry invisible bidi
marks and non-breaking hyphens (Fabiano's did); `vfPhone()` strips them, or the
`tel:` link breaks.

`remove_vendor` leaves the Vault key behind on purpose. An orphaned phone number
costs nothing and it means an accidental removal can be put back whole.

## The Vault no longer clobbers (fixed 2026-09-25)

`saveVault()` used to `ref.set()` the whole secrets document from five
textareas — last-write-wins. Open the Vault, get distracted while another owner
adds a vendor, hit Save, and their number was gone with no error. Once adding
vendors became routine for three owners, that stopped being exotic.

`openVault()` now records what was **shown** in `VAULT_BASE`. `saveVault()` sends
only the fields this owner actually changed, merged inside a transaction onto
whatever the server holds at save time: untouched fields are not written at all,
and in `vendorPay` / `vendorPhone` a key the owner never touched keeps the
server's value, including keys that appeared after the Vault was opened. Those
are counted and reported ("kept 1 entry another owner added meanwhile").

Deliberate deletions still delete — the diff distinguishes "absent because
someone else added it later" from "absent because I removed it".

## The house inventory (Anexo II)

Estar's photographic vistoria of 2026-09-03: **197 items across ten ambientes**,
source PDF in the Drive, inside the *draft* owners' contract rather than as a
standalone file. Firestore collection `inventory`, one document per ambiente
plus `_meta` — a single document would sit under the 1 MB ceiling with no
headroom, and owners correct one room at a time.

**The collection is owners-only and must stay that way.** It carries the
conditions Estar measures damage against, the bar bottles, the owners' storage
and every pendência. `firestore.rules` grants `/inventory/{doc}` to `isOwner()`
only.

**Sisay reads a projection, never the real thing.** `gathering/inventoryGuest`
is the third public document (with `guide` and `houseGuide`), written by
"Publish guest view" in the Upkeep tab. The projection keeps `guestFacing`
items and **drops** `condition`, `notes`, `photoRef` and `pendencia` — drops,
not hides, because that document is world-readable by rule. Filtering in a
guest browser would mean shipping the whole inventory there first. The publish
step asserts against a banned-word list before writing; if the builder ever
grows a fourth field, the write aborts.

Small utensils carry a `guestGroup` and collapse into one entry, so the 92
kitchen rows become 28 guest answers: appliances by name, "Talheres e facas" as
a set. 197 items project to 109 guest entries.

**The seed is never committed.** The repo is public, and a list of what is in
the house, brands included, against a published address, is a shopping list.
Owners import it from a local file through the Upkeep tab; the importer refuses
a file whose `_meta.itemCount` disagrees with what it carries, and confirms
before replacing documents that already exist.

Two fields make readiness queryable instead of prose: `tested` (true only where
Estar wrote "Funcionando" — "bom estado aparente" is photographic) and
`pendenciaKind` (`defect` | `untested` | `undocumented` | `decision`). As
imported: 21 pendências, 19 pieces of equipment nobody switched on. Hanna's
`get_pendencias` is the readiness answer and her prompt routes every "is the
house ready" question through it.

**Suite names.** Estar's room labels disagree with the house's own, because
they name rooms after the decorative box inside (Q02 verde, Q03 azul — and Q04
amarela, a colour no suite has). Owners confirmed on 2026-09-28:
Q01 Planície (Branco), Q02 Ilha (Azul), Q03 Montanha (Vermelho), Q04 Floresta
(Verde). `TG_AMBIENTES` in `firebase-config.js` holds the pairing; document ids
keep Estar's wording because they are Estar's references. **Known
inconsistency:** under this mapping the portal's own `bed:` values for Planície
and Floresta contradict Anexo II — Suíte 1 has bunks, Suíte 4 has the King and
the banheira. Not yet resolved.

Clause 4.11/4.12: Estar compiles the inventory and the owners have five
business days from receipt to check and validate it. No Termo de conferência
signed as of 2026-09-28, which `_meta.conferenciaStatus` records and the panel
shows.

## Hanna's panel

Two states, set through `hannaSetState('dock'|'max')` — never by adding the
class directly. `hannaState()` reads the current one. The choice persists in
`localStorage.tg_hanna_state`; anything that is not `max` opens docked, which
also absorbs a stale `min` left over from when minimise existed.

`.hp-max` is declared **after** the 650px media query on purpose. Same
specificity, so source order decides — declared before it, a maximised panel
would snap back to the docked size on a phone, which is where maximising
matters most.

There was a third state, `min`, which parked the conversation in the header
bar. Removed at the owner's request: with the astrolabe always present and
Close keeping the session, it was a third way to do what two already did.

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
