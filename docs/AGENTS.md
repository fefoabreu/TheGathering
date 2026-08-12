# The Weatherlight Manifest — Agent & System Architecture

*TheGathering Silveira runs on two agents drawn from the same crew. Hanna keeps
the ship aloft; Sisay meets the passengers. This document is the technical
counterpart to the saga — what each one is, what exists today, and what is still
to be built.*

**Related:** [`claude-code-handoff-owner-agent.md`](../claude-code-handoff-owner-agent.md)
is the source of truth for the owners' build. This file documents the two-persona
architecture that sits across both halves of the site.

---

## The crew

| | **Hanna, Ship's Navigator** | **Captain Sisay** |
|---|---|---|
| Card | Human Artificer · WU | Human Soldier · WUBRG |
| Serves | The three owners | Guests |
| Surface | `owner.html` — the Commander Deck | `index.html` — the public site |
| Role | Systems, records, structural integrity | Concierge, host, local knowledge |
| Voice | Analytical, quietly brilliant, precise | Worldly, warm, charismatic |
| Status | **Live** | **Not built** — see below |

Hanna is the maker: *"I never thought I'd spend my life fighting. I'm a maker,
not a destroyer."* Her card returns artifacts from the graveyard to your hand,
which is close to literal — her job is retrieving records the owners have lost
track of. Sisay's card grows stronger for each colour among the legends she
controls, and tutors exactly the permanent the moment needs. That is the
concierge mechanic: not answering a question, but *fetching the right card*.

---

## What exists today

### Hanna — live

```
owner.html  ──(Firebase ID token)──▶  hanna.fefoabreu.me  ──▶  Anthropic API
    │                                  (Cloudflare Worker)
    │                                  holds ANTHROPIC_API_KEY
    └──▶ Firestore (gathering/*, decisions, agentSessions)
```

- **Proxy:** Cloudflare Worker `tgs-hanna`. Holds the API key as an encrypted
  secret, verifies a Firebase ID token via `accounts:lookup`, checks the request
  origin, and streams SSE straight through. Rejects: no token (401), foreign
  project (401), expired (401), bad origin (403).
- **Tools (11):** `list_bookings`, `get_calendar`, `add_owner_block`,
  `get_vendors`, `get_tasks`, `add_task`, `update_task`, `get_house_info`,
  `list_decisions`, `add_decision`. They execute client-side against the same
  Firestore-backed stores the portal renders from, so Hanna and the owner never
  see different numbers. The agentic loop is bounded at six hops.
- **Sessions:** shared in `agentSessions` — all three owners see one thread.

### The Booster Pack — already built

**This mechanic exists and is in production.** It does not need scaffolding.

- Sealed pack → open animation → card-by-card reveal → collection grid
- 10 curated Garopaba cards with rarity, category filters and a detail modal
- Owner-curated through the portal's deck builder, published to
  `gathering/guide`, read live by the guest site
- Mobile: a scroll-snap swipe rail rather than a stacked column

Source of truth for the cards is Firestore, edited by owners in
`owner.html` → Environment. That is already the Sisay-fetches / Hanna-supplies
split described in the brief, just without a conversational layer on top.

### Data model

| Path | Holds |
|---|---|
| `gathering/guide` | Published guide cards — **world-readable**, the guest site needs it |
| `gathering/calendar` | Owner blocks |
| `gathering/bookings` | Season bookings |
| `gathering/vendors` | Vendor directory |
| `gathering/houseInfo` | Suites, capacity, rules, Estar terms |
| `gathering/projects` | House projects (Sorceries) |
| `gathering/secrets` | Door codes, WiFi, iCal URL, vendor payment — the Vault |
| `decisions` | The Chronicle |
| `agentSessions` | Hanna's chat history |

Everything except `guide` requires a signed-in session.

---

## Sisay — proposed

Sisay is the guest-facing concierge: local experiences (whale safari, Surfland,
the best burger in town) and in-house technology (the projector, the Frame TV,
casting to Sonos).

### Routing

```
index.html  ──▶  sisay.fefoabreu.me  ──▶  Anthropic API
                 (second Worker)
                        │
                        └──▶ Firestore: gathering/guide + a new gathering/houseGuide
```

A **second Worker**, not a shared one. Sisay and Hanna have different threat
models and different budgets, and one should never be able to exhaust the other.

Sisay reads only what guests may see: the published guide and a house-manual
document. She must never be able to reach `secrets`, `bookings`, `calendar` or
the Chronicle — the rules already deny this, and her tool set must not offer it.

### Proposed tools

| Tool | Reads |
|---|---|
| `get_guide_cards` | `gathering/guide` — filterable by category |
| `get_house_manual` | `gathering/houseGuide` — projector, Frame TV, Sonos, pool, WiFi *(guest network only)* |
| `get_amenities` | `gathering/houseInfo` — capacity and rules, minus commercial terms |
| `suggest_experience` | Composes from the guide; returns cards to reveal rather than prose |

`suggest_experience` is the important one. Sisay should **tutor a card**, not
write a paragraph — the answer to "where do I eat tonight?" is the Gina card
flipping up, matching the mechanic guests already understand.

### ⚠ The open question: cost exposure

**This is the reason Sisay is not built yet, and it needs an owner decision.**

Hanna's proxy is safe because every caller must hold a Firebase token *and*
owners are three people behind a password. The guest site is public. Any agent
there can be called by anyone who finds the page — and every call is billed to
us. An unprotected public agent is a stranger's free Claude subscription.

Mitigations, all of which should ship together:

1. **Origin allowlist** — already implemented in the Worker; necessary, not sufficient
   (trivially forged outside a browser).
2. **Hard daily spend cap** enforced in the Worker, counted in KV. When the day's
   budget is spent Sisay politely goes quiet rather than billing on.
3. **Per-session rate limit** — n messages per anonymous session per hour, by KV.
4. **Short `max_tokens`** — concierge answers are short by design.
5. **Cloudflare Turnstile** on first message, if abuse appears. Invisible to
   real guests, expensive for scripts.

Without at least 2 and 3, do not deploy Sisay publicly.

---

## UI constraints for the booster

The stated design baseline is: *clean and simplified; strictly avoid complex
background graphics or rotational directional cues/arrows during animations or
card reveals.*

The shipped implementation predates that constraint and conflicts in three
places. **Flagged, not changed** — the mechanic is in production and working:

| Where | What | Conflict |
|---|---|---|
| `@keyframes reveal-card-pop` | `rotateX(50deg)` → `rotateX(0)` on every reveal | rotational cue during card reveal |
| `spawnOverlayStars()` | 60-element starfield behind the reveal | complex background graphic |
| `.guide-swipe-hint` | `← deslize o baralho →` on mobile | literal directional arrows |

The simplification is a one-line change in each case: a scale-and-fade reveal
without rotation, no starfield, and a text-only or fading swipe affordance.
Awaiting a decision, because the current version is well-liked.

---

## Conventions for both agents

- **Never invent.** Bookings, codes, dates and prices come from tools. If a tool
  returns nothing, say so.
- **Match the guest's language** — English or Portuguese, decided per message.
- **Hanna surfaces contract risk unprompted.** An owner block not confirmed in
  writing with Estar, colliding with a confirmed booking, is owner-fault under
  clause 6.4. This is the one place a confident wrong answer costs real money,
  so it is a first-class instruction, not background.
- **Sisay never sees owner data.** No bookings, no codes, no commercial terms.
- Both proxies keep the API key server-side. It never appears in client JS, in
  this repo, or in a prompt.
