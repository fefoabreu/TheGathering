# Claude Code Handoff Brief — TheGathering Owners' Portal Agent
*Paste this as the kickoff prompt in the Claude Code project (or commit it as `docs/AGENT_BRIEF.md` and reference it from `CLAUDE.md`). Governance for this initiative lives in the claude.ai Project "fefoabreu.me | Ventures" → `ventures/thegathering-business-manager.md`.*

---

## Mission

Build the **TGS Business Manager agent** into the owners' area of the TheGathering Silveira website — a chat panel inside `owner.html` where the three owners (Fêfo, Pipo, Zé) can ask questions and manage operations, powered by the Claude API, reading and writing the same Firebase data the portal uses.

Explore the repo first and adapt to existing conventions — Firebase (Auth/Firestore/Functions/Hosting) is already stood up in this project. Do not re-architect what exists; extend it.

## Current state (verified Aug 12, 2026)

- Public site live at `https://fefoabreu.me/TheGathering/`; owners' area at `/TheGathering/owner.html`.
- Owner portal sections: Command Center (bookings, monthly costs, Airbnb sync), Calendar "Scry" (iCal sync with Airbnb listing 1608023407293236428), Guests "Creatures", Maintenance "Upkeep" (incl. key codes), Vendors "Artifacts", Guide Curation "Garopaba Realm", Projects "Sorceries" (tasks w/ priorities). Firebase mentioned for auto-save/publish.
- ⚠️ **Known security problem:** owner.html gates on a client-side password check (`@tgs`) and ships sensitive data (door codes, master code, WiFi passwords, vendor Pix keys) in page source. This must be fixed as Phase 1 — it blocks everything else.

## Phases

### Phase 1 — Shared-login auth ("Auth-Lite", blocker)
**Owner decision (Aug 12):** no individual owner accounts at this stage — all three owners share one login and see/do everything identically. No per-owner attribution or activity capture for now.

1. Implement the shared login as a **single shared Firebase Auth account** (e.g., `owners@thegatheringsilveira.com` with password `@tgs`), NOT as a client-side password string check. The login screen can present just a password field for the familiar UX and sign into the shared account behind the scenes. This keeps Firestore security rules and API-proxy token verification fully functional while staying operationally simple.
2. Kill the current client-side password check. Move all sensitive data (lock codes, alarm, WiFi, Pix keys) out of static HTML into Firestore documents readable only when authenticated (`request.auth != null` + the shared account's UID).
3. Nothing sensitive may appear in the static bundle or public repo. Audit git history; if codes were ever committed, flag them for rotation (esp. master code 202543).
4. **Future pivot path:** structure auth calls so upgrading to three individual accounts later is a config change, not a rewrite (i.e., don't hardcode the shared UID in more places than the security rules/config).

### Phase 2 — Data model in Firestore
Collections (adapt names to existing schema if one exists): `calendar` (bookings + owner blocks; sync source of truth, Airbnb iCal import), `vendors`, `tasks` (the Sorceries projects), `houseInfo` (suites, capacity, rules), `guests`, `secrets` (locked-down codes), `agentSessions` (persistent chat history in one shared space — all owners see all conversations; shared context is the point), `decisions` (see below).

**Decision log (transparency requirement):** the portal is the partners' window into the venture — Pipo and Zé are not in the Program Office where orchestration happens, so decisions must surface here. Add a `decisions` collection (date, title, summary, optional decidedBy free-text, status) rendered as a simple portal section (e.g., "The Chronicle"), and give the agent `add_decision` / `list_decisions` tools. Build-phase summaries also get logged here.

### Phase 3 — Agent chat panel
1. **Serverless proxy** (Firebase Function, or Cloud Run if streaming is smoother): holds `ANTHROPIC_API_KEY` in secret config. **Never in client JS.** Verifies the caller's Firebase Auth ID token before forwarding.
2. Claude API with the system prompt below + tool use. Streaming responses. Model: use a current Sonnet-class model by default (cost-sensible for 3 users); make it a config value.
3. Chat UI panel in the owners' portal, matching the site's existing style/theming (the portal has a fantasy naming scheme — the agent can be themed accordingly, e.g., "The Steward").

### Phase 4 — Agent tools (function calling)
- `get_calendar` / `add_owner_block` / `list_bookings` — read/write `calendar`. Writing a block should remind the owner it must ALSO be confirmed in writing to Estar Garopaba (contract clause 5.3/5.5 — the Estar-administered calendar is the official one; an unconfirmed block that collides with a booking = owner-fault cancellation, which is financially brutal per clause 6.4).
- `get_vendors` / `update_vendor`
- `get_tasks` / `add_task` / `update_task`
- `get_house_info`, `get_monthly_costs`
- `add_decision` / `list_decisions` — the Chronicle.
- Writes carry a timestamp; per-owner attribution is deliberately out for now (shared account). The agent may not know which owner it's talking to — it can simply ask when the answer depends on it (e.g., "whose dates should I block?").

## Agent system prompt v1 (embed; refine as data migrates)

> You are **The Steward**, the business manager for TheGathering Silveira 🌊🌄 — a luxury vacation rental at Rua Augusto Germano Wilke s/n°, Praia da Silveira, Garopaba SC, owned in three equal parts by Fêfo, Pipo, and Zé ("One will corrupt, two will divide. With three there is balance."). You serve all three owners equally, in English or Portuguese matching the user.
>
> **Property:** 4 themed suites (Planície/branco, Ilha-Mar/azul, Montanha/vermelho, Floresta/verde) + Container Office (Pântano/preto). Capacity 12 guests (max 8 adults + 4 children ≤10). Pool (heated — paid add-on for guests), no pets, not suitable for children under 2.
>
> **Operations:** Property management by Estar Garopaba (Natalia), plan "Gestão Total": 20% commission on gross nightly value (excludes cleaning fee, caução, platform fees; Airbnb host fee 4%). Payments flow directly to owners — Estar never holds owner money. Owners pay cleaners/vendors directly. Rental season target: available from early December for Brazilian summer. Owner use is free: block dates in the calendar AND confirm the block in writing with Estar before inviting anyone — an unconfirmed block that collides with a confirmed booking makes the owners liable for refunds, fines, and Estar's commission. Rental contracts must be signed within 48h of receipt (designated signatory model). Direct paying bookings on dates released to Estar owe the 20% commission regardless of source.
>
> **Your duties:** answer owner questions from live portal data (use your tools — never invent bookings, codes, or numbers); manage calendar blocks, tasks, and vendor info on request; flag risks (calendar conflicts, contract obligations, insurance, maintenance affecting rentability); keep a program-manager tone — concise, action-oriented, warm. Never reveal codes/secrets in a context that could be screenshared with non-owners without a heads-up. If asked something requiring a decision among owners, lay out the options and suggest they align — you serve the partnership, not any single owner.

## Acceptance criteria
1. Unauthenticated users see zero sensitive data (verify via view-source and network tab, signed out) — the shared password gates everything through real Firebase Auth, not client-side JS.
2. Any owner signs in with `@tgs` and gets the identical full experience; agent chat works end-to-end with streaming; sessions and all portal data persist in Firebase and are shared across all owners/devices.
3. Agent answers "what's booked in January?" / "quem é o vendor da piscina?" / "add a task to fix the escada" from/into live Firestore data.
4. API key only in server-side secret config; proxy rejects requests without a valid Firebase ID token (the shared account's token).
5. Airbnb iCal still syncs into the calendar collection.

## Out of scope (stays in the governance Program Office, not the build)
Estar contract negotiation, Google Doc content migration decisions, insurance, CNPJ question. The governance Program Office is Fêfo's private workspace; this portal + agent is the partnership's shared surface — nothing in the build should assume partners have access to governance docs.

## Reporting back
After each phase, produce a short build summary (what shipped, decisions made, anything needing owner sign-off). Two destinations: (1) Fêfo pastes it into his governance session to keep the program record current, and (2) once the `decisions` collection exists, log it there so Pipo and Zé see progress directly on the portal.
