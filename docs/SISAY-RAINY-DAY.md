# Rainy Day Matrix — Captain Sisay

Shipped 2026-08-31. Live on `fefoabreu.me/TheGathering/`.

## Why she said her hands were tied

She was telling the truth. Two gaps, no judgement failure:

1. **No weather tool at all.** She could not tell it was raining.
2. **No indoor venues.** `get_guide_cards` covers `coffee, burgers, sushi,
   cowork, poke, happy-hour, sandboarding, acougue, pizza`. Not one is indoors.

Same shape as the Instagram bug: a data gap that reads as a stupid agent. She
then deflected to Estar Garopaba — a non-answer — and her reply was guillotined
mid-word at `costuma ter es`, because her Worker capped replies at 700 tokens
with no way for the client to raise it.

## A note on the stack

The request asked for React/Next.js components. This project is **not React** —
`index.html` is a single static file with inline JS on GitHub Pages. Chips
already render through `tgPaintChips()` in `agent-ui.js`, shared by both agents.
The equivalent below is what actually deploys here.

## 1. Knowledge base

`TG_RAINY_DAY` in **`firebase-config.js`** — the only file both pages load, so
it sits beside `TG_HOUSE_LINKS` and `TG_SOUNDTRACK`.

**It is data, not prompt.** A prompt is not a database, and an owner should be
able to correct an opening time without editing an agent's personality.

> **The original brief contained three factual errors.** Research on 2026-08-31
> corrected all three before launch. See "What the research changed" below.

| id | kind | venue | verdict |
|---|---|---|---|
| `baleia-franca` | `museum` | Centro Nacional da Baleia Franca, Itapirubá | **Primary.** Indoor, free, has the skeleton |
| `museu-baleia` | `museum` | Museu da Baleia de Imbituba, Praia do Porto | Indoor, free, closer — but small and tired |
| `cinema` | `in-house` | Cinema Mode at the house | No drive, no weather |

Each entry carries `name, where, driveApprox, what, whyRainy, hours, price,
phone, maps, chips[], verified` (+ `caution` where warranted).

## What the research changed

**1. The skeleton is at the other museum.** There are two separate whale
institutions in Imbituba. Instituto Australis — the organisation named in the
brief — runs the **Centro Nacional in Itapirubá**, and that is where the 13.95 m
right whale skeleton is. The **Museu da Baleia** at Praia do Porto is municipal,
run by the Prefeitura, and is a different place. One local news article conflates
them; the data notes this so Sisay does not repeat it.

- Centro Nacional: **Tue–Sat 09:00–12:00 & 14:00–17:00, closed Sun/Mon. Free.**
  44 min. Confirmed against the official site *and* Google Maps, which agree exactly.
- Museu da Baleia: **Wed–Fri 08:00–12:00 & 13:00–17:00, Sat/Sun/holidays 09:00–17:00,
  closed Mon/Tue. Free.** 40 min. Confirmed by Notisul (Feb 2026) and Google Maps.

**2. Só 4x4 Kids is not an indoor playground — it was removed.** Its own Instagram
bio and TripAdvisor entry both describe *"locação de carrinhos elétricos 4x4"* —
ride-on electric car rental, plus a 5 m × 5 m kids space. **No source confirms it
is covered**, the core activity is driving small cars around, and Surfland markets
itself on "vida ao ar livre". There is no published price, and Surfland charges
park entry on top. Listing it as a rainy-day option would have sent families out
in the rain to an open-air attraction.

> **Thread worth pulling:** Surfland separately advertises an *"espaço kids
> **coberto**"* as its own amenity — a different thing from Só 4x4 Kids, and
> unverified. If that checks out it is the covered kids option this matrix is
> missing. Surfland: **(48) 99203-7446**.

**3. The chocolate shop and the Mini Museu do Mar are unrelated, and both fail.**
Different organisations, different locations, no connection.

- **Chocolate Artesanal Garopaba:** the farm café is flagged *"Temporariamente
  fechado"*, with no reviews in 2026. The business now advertises only a market
  stall — Mercado do Produtor, Tue/Fri/Sat 08:00–13:00. Outdoor, and mornings only.
- **Mini Museu do Mar:** the NGO is thriving, but the museum has **vanished from
  every current source** — no address, hours or visiting info on its own site,
  Instagram or Linktree, and no tourism guide lists it. The only hours ever
  published are from a 2019 blog post. Omitted.

## Two phone calls would close the remaining gaps

**I cannot place calls** — no telephony capability. The questions are written
out ready to read in [`RAINY-DAY-CALL-SCRIPT.md`](RAINY-DAY-CALL-SCRIPT.md):

1. **(48) 99127-8961** — Instituto Australis, to settle which site holds the
   13.95 m skeleton (one article disagrees with every other source).
2. **(48) 99203-7446** — Surfland, on whether their *espaço kids coberto* is
   real. If it is, that is the covered kids option this matrix still lacks.

## Guide cards on the public site

The venues appear in the Garopaba Guide deck under a **Rainy Day** filter, so a
guest can orient themselves without opening the concierge at all.

**Derived, not duplicated.** `tgRainyGuideCards()` in `firebase-config.js`
generates the cards from `TG_RAINY_DAY` — the same constant Sisay reads. Writing
them out again as card literals is precisely how the Instagram bug happened.

Two things this had to survive:

- **The published Firestore deck REPLACES `guideCards` wholesale.** Adding cards
  to `DEFAULT_GUIDE_CARDS` alone would make them vanish the moment the owners
  publish from the portal. `withRainyCards()` re-merges after every load, and is
  idempotent so re-merging never duplicates.
- **Deck copy is not concierge copy.** Concatenating everything produced a
  500-character card beside 145-character neighbours, so each venue carries a
  short `cardCopy`; the caution and the pitch stay in the data for Sisay to
  deliver in conversation.

Cinema Mode is excluded from the deck — it is the house, not somewhere a guest
travels to.

Both cards are fully translated, keyed on the exact English strings per the i18n
convention. Change the composed description in `TG_RAINY_DAY` and the `TG_PT`
key must change with it, or the card falls back to English — degraded, not broken.

## Hours are never guaranteed

Third-party opening times go stale and no amount of research fixes that
permanently, so every surface that states one carries the same short line:

> **EN** "Worth calling ahead to confirm." · **PT** "Vale ligar antes para confirmar."

One constant, `TG_HOURS_CAVEAT` in `firebase-config.js`, so the wording cannot
drift between the guide card and the concierge. It is appended automatically to
any card with `hours` or `price`, returned to Sisay as `hoursCaveat` in the
guest's language, and backed by a prompt rule that applies to **any** venue she
quotes hours for — not only rainy-day ones.

It is one line at the end, never a paragraph of hedging. She still gives the
answer; the caveat just names who the authority is.

## 2. Weather routing

`get_weather` → Open-Meteo at the house's coordinates (`-28.0333, -48.6167`).
No key, no attribution token, ten-minute cache.

Returns a **decided `isRainyDay` boolean**, not a WMO code — routing must not
depend on the model recalling that `82` is violent showers and `51` is drizzle.

```
isRainyDay = raining now OR today's code is wet
             OR rainChancePct >= 60 OR rainMm >= 1
```

Also returns `now`, `today`, `tomorrow`, `dayAfter` — which is how she can say
"save the beach for the day after tomorrow, that one's sunny".

## 3. Choice chips

`offer_choices` already existed in `agent-ui.js` and is shared by both agents —
no new component was needed. What was missing is that **each venue carries its
own `chips` array**, so she offers real next moves rather than inventing them:

```js
chips: [
  { label: 'How do we get there?',   send: '…' },   // → maps route
  { label: 'Price and opening hours', send: '…' },  // → operational details
  { label: 'Something for the kids',  send: '…' },  // → pivots to Surfland
  { label: 'We would rather stay in', send: '…' },  // → Cinema Mode
]
```

Labels are written in English and she translates them to the guest's language;
observed output in Portuguese: `Como chegar lá? / Museu das baleias / Ficar em casa`.

## 4. Prompt additions

Added to `SISAY_SYSTEM` in `index.html`:

- **Rain does not tie your hands** — call `get_weather` before anything outdoors;
  on `isRainyDay`, lead with `get_rainy_day_options` rather than opening with what
  she cannot do.
- **Never hand a guest back to Estar for something you can answer** — Estar owns
  exactly three things she cannot see: check-in, door codes, payments. Everything
  else is hers. "Before you deflect, call the tool."
- **Speak of yourself as a woman in Portuguese** — she had written *"tudo bem eu
  ser honesto"*. Now *sou a Sisay, estou pronta, vou ser honesta*.
- **Be brief**, extended: no preamble about her own limits, and "a reply long
  enough to be cut off mid-word has already failed".
- **Never leave a dead end** — when recommending a place, use that place's chips.

## 5. Other fixes in the same change

- **One answer, one bubble.** Each hop painted its own, so a reply that called
  `offer_choices` arrived as two messages. Later hops now append to the first.
- **`tgRenderMarkdown` paragraph spacing.** A blank line emitted `<br>` on top of
  the `<p>` margin, so every multi-paragraph reply from *either* agent had a hole
  in it. Fixed in `agent-ui.js`, so Hanna benefits too.
- **Reply cap 700 → 1100** in `worker-sisay`, deployed.

## Verified behaviour

All against the live agent on a genuinely wet day (69.7 mm, 100% chance).

**"Dia de chuva com crianças. O que fazer?"**
`get_weather → get_rainy_day_options → offer_choices`

> Chuva firme hoje, então nada de praia — mas tenho um plano ótimo pra criançada:
> o Centro Nacional de Conservação da Baleia Franca em Itapirubá, com um esqueleto
> de baleia de quase 14 metros, entrada gratuita e um passeio guiado que os
> pequenos adoram. Fica a uns 44 minutos daqui.

**"Podemos ir hoje ao museu da baleia? Que horas abre?"** — today is a Monday:

> Hoje é segunda-feira — e as duas opções de museu da baleia fecham exatamente às
> segundas… melhor plano pra hoje é o Cinema Mode em casa, e deixamos a baleia
> pra amanhã, terça, quando o Centro Nacional reabre às 9h.

That second one is the whole point of putting real hours in the data: she caught
a closed door before anyone got in a car.

**"Qual a melhor praia para hoje?"** — she calls `get_weather` *first*, says today
is not a beach day, and points at the day after tomorrow, which is the sunny one.

One bubble per answer, correct feminine Portuguese throughout, chips every time.

## Not done

- **Sisay only.** Hanna is untouched, as agreed.
- The venues are **not** in the public guide deck — they are concierge knowledge
  only. Promoting them to guide cards would put them on the guest page; say the
  word if you want that.
