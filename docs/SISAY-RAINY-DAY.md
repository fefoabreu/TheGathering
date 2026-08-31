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

| id | kind | venue |
|---|---|---|
| `australis` | `museum` | Instituto Australis — Museu da Baleia, Imbituba |
| `so4x4kids` | `kids` | Só 4x4 Kids, at Surfland Brasil |
| `chocolate` | `food` | Casa de Chocolates Garopaba & Mini Museu do Mar |
| `cinema` | `in-house` | Cinema Mode at the house |

Each entry carries `name, where, driveApprox, what, whyRainy, maps, chips[],
verified`.

### Honesty about what is not known

`verified` is load-bearing. The **places and what they are** came from the
owners. **Hours and prices did not** and are marked unconfirmed, with the tool
instructing her to say so. Sending a family forty minutes through rain to a
closed door is the one unforgivable failure here — "call ahead" beats a
confident invention.

**Owner action:** confirm hours/prices for the three venues, and whether the
chocolate shop and the Mini Museu do Mar are one venue or two. Then update
`verified` and add a `hours` / `price` field.

### Cinema Mode

Built from the house manual's own `tv`, `projector` and `sonos` entries, so it
does not go stale: projector → HDMI → sound to Sonos, not the built-in speaker;
or the 75" Frame TV via the One Connect box, one power press to leave Art Mode;
Sonos grouped across living room, kitchen and deck.

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

Asked *"O que fazer com as crianças em um dia chuvoso?"* on a genuinely wet day
(69.7 mm, 100% chance):

```
tools called: get_weather → get_rainy_day_options → offer_choices
```

> Chuva firme hoje, então nada de praia — mas tenho o lugar certo pras crianças:
> o Só 4x4 Kids, dentro do complexo Surfland Brasil, uns 10-15 minutinhos daqui.
> É uma área coberta com piscina de bolinhas e playground, então elas gastam
> energia enquanto vocês sentam com um café. 🌧️
>
> Só um aviso: não tenho certeza do horário e preço, vale ligar antes de sair de casa.

One bubble, correct feminine Portuguese, unprompted honesty about the unverified
hours, and chips to continue.

## Not done

- **Sisay only.** Hanna is untouched, as agreed.
- The venues are **not** in the public guide deck — they are concierge knowledge
  only. Promoting them to guide cards would put them on the guest page; say the
  word if you want that.
