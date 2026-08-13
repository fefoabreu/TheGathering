# TGS Agent Intelligence — build brief

**Status:** proposed, not started · **Supersedes:** nothing (extends `claude-code-handoff-owner-agent.md`)
**Read first:** `CLAUDE.md`, then this file in full, before writing any code.

---

## 0. The one thing to understand before starting

Both agents already reason well. Every failure they have had in production was a
**missing-data** failure, not a model failure.

The worked example: Hanna was asked "when did we buy the house, and how long did
the build take?" and answered *"I don't have any record of that — I don't want to
guess."* That is correct behaviour. A bigger model would have given the same
non-answer at five times the cost. The fix was a knowledge pack distilled from
the owners' Drive; Sonnet then answered it perfectly, citing the tool.

**Design consequence:** for every capability below, ask *"what does the agent need
to KNOW"* before *"what model should run it."* The expensive, valuable,
non-outsourceable work in this phase is authoring data, not wiring APIs.

This is most acute for Sisay's beach logic — see §2.1.

---

## 1. What already exists (do not rebuild)

| Piece | State |
|---|---|
| `worker/` → `tgs-hanna` (hanna.fefoabreu.me) | Sonnet 5, SSE streaming, 6 tool hops, Firebase-token auth, origin allowlist |
| `worker-sisay/` → `tgs-sisay` (sisay.fefoabreu.me) | Sonnet 5, non-streaming (so `usage` can be metered), 4 hops, daily USD tripwire + per-session cap |
| Hanna's tools | 11: bookings, calendar, owner blocks, vendors, tasks, house info, decisions, **`search_property_docs`** |
| Sisay's tools | 3: `get_guide_cards`, `get_house_manual`, `suggest_experience` |
| Property knowledge | `worker/knowledge.local.json` (gitignored) → KV `HANNA_CACHE / knowledge:v1`, served by `handleDocs()`. Rebuild with `worker/push-knowledge.sh` |
| Calendar | Google + Airbnb iCal merged server-side, cached 10 min in KV under `cal:v2` |
| Data | Firestore `gathering/*`; secrets in `gathering/secrets` (the Vault) |

Both Workers already hold their Anthropic key as an encrypted secret and verify a
Firebase ID token. **Extend these Workers. Do not stand up a new backend.**

---

## 2. Sisay — Guest Concierge

### 2.1 The wind/beach matrix is the whole ballgame

Fêfo's brief describes conditional beach recommendations across Silveira,
Garopaba, Ferrugem, Rosa and Vigia, driven by wind direction and what the guest
wants (surf / kids / quiet).

**A weather API cannot give you this.** Any API returns "wind 18 km/h from 040°".
Nothing on the internet knows that at 040° the Morro shelters Silveira and blows
out Rosa. That is local knowledge held by the owners and their friends, and it is
the single highest-value artifact in this whole phase.

**Therefore: the first deliverable is a matrix authored by the owners, not code.**

Proposed shape — `worker-sisay/beaches.local.json`, gitignored, pushed to KV the
same way Hanna's pack is:

```jsonc
{
  "beaches": [{
    "id": "silveira",
    "name": "Praia da Silveira",
    "driveMinutes": 2,
    "facing": 135,                    // degrees the beach faces, for sanity checks
    "wind": {
      "offshore":  [[280, 30]],       // arcs (from°, to°) where it is CLEAN
      "sheltered": [[30, 80]],        // Morro blocks it — still pleasant
      "blownOut":  [[90, 200]]        // do not send anyone here
    },
    "swell": { "worksFrom": [[120, 200]], "minM": 0.6, "maxM": 2.5 },
    "goodFor": ["surf-intermediate", "sunset", "walk"],
    "badFor":  ["toddlers"],          // shore break
    "crowd":   { "low": ["weekday-am"], "high": ["jan", "feb", "holiday-weekend"] },
    "notes":   "Owner's home beach — 2 min walk. Rocks at the south end..."
  }]
}
```

Fill this **with Fêfo, one beach at a time, in his words**. Do not invent arcs.
An invented arc that sends a family to a blown-out beach is worse than Sisay
saying "I'd check the forecast on this one."

Ship it half-filled if that is all he has time for — Sisay should say she is not
sure about a beach rather than guess it.

### 2.2 Weather — verified working, no key needed

Both endpoints were smoke-tested against Praia da Silveira (−28.02, −48.63) on
2026-08-13 and returned live data with **no API key**:

- Wind / rain / cloud / temp — `https://api.open-meteo.com/v1/forecast`
  `hourly=wind_speed_10m,wind_direction_10m,precipitation_probability,cloud_cover,temperature_2m`
- Swell — `https://marine-api.open-meteo.com/v1/marine`
  `hourly=wave_height,wave_direction,wave_period,swell_wave_height,swell_wave_period`

Prefer this over Stormglass/Surfline: free, no credential to leak from a public
site, and no per-call cost on a surface anyone on the internet can hit. Cache in
KV for ~30 min under `wx:{date}:{hour}` — a hundred guests asking about the beach
on the same morning should cost one upstream call.

New Worker action `weather` alongside the existing `calendar`/`docs` pattern.

### 2.3 Sisay's new tools

| Tool | Does |
|---|---|
| `get_conditions(day?)` | Today/next-N-days wind, swell, rain from the cached feed |
| `recommend_beach(activity, party, day?)` | Joins live conditions against the matrix. **Returns a ranked list with the reason** ("Ferrugem — NE wind, Morro shelters it, low crowd on a Tuesday") |
| `get_experience(id)` | One curated experience: what it is, why go, menu/booking/site links, what house gear to take |
| `offer_choices(choices)` | See §2.4 |

`recommend_beach` should do the *joining in code*, not in the prompt. Give the
model the verdict and the reason; let it write the sentence. Models are good at
prose and bad at silently correct trigonometry over compass arcs.

### 2.4 Choice chips — the conversational requirement

Fêfo is explicit: when Sisay asks a question back, the UI must offer chips that
match that question. This is the difference between a concierge and a chatbot.

Cleanest implementation given Sisay is **non-streaming**: a tool the model calls
at the end of a turn.

```js
{ name: 'offer_choices',
  description: 'Offer 2–4 tappable replies matching the question you just asked. '
             + 'Call this whenever your reply ends in a question.',
  input_schema: { type:'object', required:['choices'], properties:{
    choices:{ type:'array', maxItems:4, items:{ type:'object',
      required:['label','send'], properties:{
        label:{type:'string', description:'≤4 words, shown on the chip'},
        send: {type:'string', description:'What to send as the guest if tapped'} }}}}}}
```

Client renders `choices` into `#sisay-chips`, replacing the static openers.
Falls back to the static chips when the model does not call it. Keep the existing
`SISAY_COPY.chips` as the cold-start set.

**Watch:** Sisay's session cap counts *messages*, and a chip tap is a message.
Re-check the 25/day cap once chips make replying frictionless.

### 2.5 Opinions, not listings

Existing `suggest_experience` reveals guide cards. Extend so each experience
carries: why *she* rates it, best time of day, booking URL, menu URL, and the
house gear to take (boards, cooler, beach chairs, towels). Then her follow-up —
"want the menu, or shall I check if they take a booking?" — is grounded, and the
chips write themselves from the fields that are present.

### 2.6 Model

**Stay on Sonnet.** She is doing lookup plus personality at guest scale, on a
public endpoint, where latency and cost both matter. Nothing in §2 is a reasoning
problem once the matrix exists.

---

## 3. Hanna — Owners' Sidekick

### 3.1 ⚠ Read this before granting any new access

Right now the **only** thing standing between the public internet and the owners'
portal is the string `@tgs`, which is committed to a public repository. That was
an explicit, reasonable owner decision (Aug 12) when the portal held a booking
table and a vendor list.

Fêfo's vision moves Hanna to: full financials, purchase costs, ROI models,
signed contracts, and the property Gmail. **That changes the risk from
"embarrassing" to "material."** A single guessable password would then guard
every number and every contract of a real R$-denominated asset, plus a live mail
account.

**Recommendation — do this before, not after:**

1. Turn on Firebase Email/Password auth; create three accounts, one per owner.
2. Put the three UIDs in `config/access` — already reserved in `firestore.rules`
   for exactly this, so it is a data change, not a rules rewrite.
3. Have both Workers check the caller's UID against that allowlist. Hanna's
   Worker already verifies a Firebase token; this is a few lines.
4. Rotate everything in `docs/SECRET-ROTATION.md` (still open since 2026-05-14).

This is roughly a half-day and it is the gate for everything in §3.2 and §3.3.
It is not a hypothetical: anonymous auth is enabled for guests, so *any* visitor
to the guest site already holds a valid Firebase token — the same kind Hanna's
Worker accepts.

### 3.2 Google Drive — go live, but keep the curated layer

Today's knowledge pack is a hand-distilled snapshot. It works, and it is honest
about being a snapshot, but it goes stale.

**Do not add LangChain or LlamaIndex.** The stack is Cloudflare Workers and a
static site; those frameworks bring a Python/Node server, a hosting bill, and a
dependency tree, to solve retrieval over a corpus of *tens* of documents. That is
the wrong tool at this scale. What is actually needed:

- **Drive read-only OAuth** (`drive.readonly`), refresh token as a Worker secret.
  Same consent flow already deferred for the calendar write — do both at once.
- A **sync job** (Worker cron, nightly) that walks the folder, exports Docs/Sheets
  as text, chunks by heading, and writes to KV. Skip binaries; OCR is out of scope.
- **Keyword retrieval first.** `handleDocs()` already does this and it is
  adequate for this corpus. Add embeddings only if retrieval demonstrably misses
  — and if so, Cloudflare Vectorize is in-stack and cheap. Do not pre-build it.
- **Keep a curated layer.** The distilled pack should survive as the canonical
  answer for the questions owners actually repeat (timeline, equity, ROI basis).
  Raw-document retrieval is the fallback, not the front door.

**Do not restructure the owners' Drive for the machine.** Fêfo's draft proposes
renaming folders to "The Ledger" / "The Arsenal" / "The Treaties". Three humans
use that Drive daily; a layout imposed for a retriever will decay within a month
and break their muscle memory. Let the sync job carry the mapping instead — a
`sources.json` naming which folder feeds which topic. If anything is added to
Drive, make it a `HOUSE-FACTS.md` the owners maintain in their own words.

### 3.3 Gmail — the call Fêfo has to make explicitly

Email parsing is the highest-value and highest-risk item here. `gmail.readonly`
on the property account gives Hanna vendor threads and Estar correspondence — and
also guest names, addresses, and anything personal that account has ever
received. That is third-party personal data under LGPD, same category as the
vendor CPF already flagged.

Offer three tiers and let him choose:

- **A — none.** Owners forward what matters into Drive. Zero new exposure.
- **B — labelled only.** Hanna reads only threads the owners tag `hanna`.
  Scoped, auditable, no surprises. **Recommended starting point.**
- **C — full read.** Maximum power, and the owners should say out loud that
  Hanna can read guest correspondence before it is switched on.

Whichever tier: §3.1 first.

### 3.4 Analysis tools — where Opus earns its price

This is the part of Fêfo's vision that is genuinely a reasoning problem, not a
retrieval one: *"evaluate what going into business with Estar means, and the
gotchas."* Two new tools:

| Tool | Notes |
|---|---|
| `analyse_document(id, question)` | Pull the doc, reason over it. Contract review, clause implications, obligations. |
| `project_roi(scenario)` | Occupancy × nightly rate × season, minus Estar's 20% on gross, Airbnb's 4%, cleaning, IPTU, utilities. **Return the assumptions with the number.** |

**Model routing, not a wholesale switch.** Keep Hanna on Sonnet for the
conversational and lookup work — that is most of her traffic and she is good at
it. Route *only* these two tools' turns to Opus, by having the Worker inspect the
requested tool and pick the model. Fêfo pays Opus rates for contract analysis and
Sonnet rates for "what's on the calendar Thursday", which is the right trade.

`project_roi` must never invent an occupancy rate. If the input is missing, it
asks. The Finanças spreadsheet is the authority for anything that has moved.

---

## 4. Suggested order

Each phase ships something usable on its own. Do not start a phase until the
previous one is verified in the browser.

| # | Phase | Blocked by |
|---|---|---|
| 1 | **Owner auth** (§3.1) + secret rotation | — |
| 2 | **Beach matrix** authored with Fêfo + `get_conditions` / `recommend_beach` | Fêfo's knowledge |
| 3 | **Choice chips** + opinionated experiences | 2 |
| 4 | **Drive live sync**, curated layer kept | 1 |
| 5 | **Analysis tools** + Opus routing | 4 |
| 6 | **Gmail**, at the tier Fêfo picks | 1, and an explicit decision |

Phase 2 is the one guests will feel on the next holiday. Phase 1 is the one that
prevents a bad day. They are independent — 2 can start while 1 is being decided.

---

## 5. Draft system prompts

### Sisay — replace the "What you know" section

```
**Beaches — never guess.** Praia da Silveira, Garopaba, Ferrugem, Rosa and Vigia
each behave differently depending on where the wind is coming from, because the
Morro shelters some and ruins others. Always call recommend_beach rather than
reasoning about wind yourself; it holds the owners' own local knowledge and today's
live conditions. Lead with the verdict and the reason in one line — "Ferrugem
today: the NE wind is behind the Morro there, and it's a Tuesday so it'll be
quiet." If a beach is not in the matrix, say you would rather they check the
forecast than have you guess.

**Rain.** Nobody wants a beach in the rain. If precipitation probability is high,
say so first and pivot — the pool is heated, there is a projector, the guide has
indoor picks.

**Have opinions.** You have been to these places. Say which you would pick and
why, in one concrete detail rather than three adjectives. Never list five options
when the guest asked for one.

**Always leave a door open.** When you suggest something, offer the obvious next
step — the menu, a booking, the gear to take from the house — and call
offer_choices so they can tap instead of type. Whenever your reply ends in a
question, call offer_choices.
```

### Hanna — add

```
**Analysis.** When asked what a contract or a decision means, do not summarise it
— evaluate it. Name the obligation, who it binds, what it costs, and what happens
if it is not met. Lead with the thing they would most regret not knowing. Where a
clause is ambiguous, say it is ambiguous rather than picking a reading.

**Numbers.** Never state a financial figure without its assumptions. An ROI
projection is a scenario, not a fact: give the occupancy, rate and cost basis you
used, in the same breath. If an input is missing, ask for it. The Finanças
spreadsheet in Drive is the authority for anything current.

**Clause 6.4 stays load-bearing.** Any owner block that is not confirmed in
writing with Estar can make the owners liable for a guest's refund, fines, and
Estar's commission anyway. Never let this pass as a footnote.
```

---

## 6. Decisions needed from Fêfo

1. **Owner auth before financials?** (Recommend yes — §3.1)
2. **Gmail tier A / B / C?** (Recommend B)
3. **Who authors the beach matrix, and when?** Nothing in §2 works without it.
4. **Opus budget.** Routed analysis turns only — but contract review is a long
   input. Set an Anthropic workspace spend limit first; it is still not set.
5. **Restructure Drive, or map it?** (Recommend map — §3.2)

---

## 7. Reporting back

At the end of each phase, produce a summary block covering: what shipped, what
was verified and how, what was assumed, what is still open, and any place the
implementation diverged from this brief and why.
