# Two calls to close the rainy-day gaps

I can't place phone calls — no telephony capability. These are the questions,
in Portuguese, ready to read out. Each says what to do with the answer.

---

## Call 1 — Instituto Australis · **(48) 99127-8961**

**Why:** one local news article (SCTODODIA, 26/02/2026) attributes the 13.95 m
skeleton to the *municipal* Museu da Baleia at Praia do Porto. Every other
source — including Australis's own 2021 announcement — puts it at the Centro
Nacional in Itapirubá. Sisay currently tells guests Itapirubá. Worth one call to
be certain, because it's a 44-minute drive.

> "Oi, bom dia! Estou organizando indicações para hóspedes de uma casa de
> temporada na Praia da Silveira, em Garopaba. Três perguntas rápidas:
>
> 1. O esqueleto completo da baleia franca, de quase 14 metros, fica aí no
>    Centro Nacional em Itapirubá, ou no Museu da Baleia lá na Praia do Porto?
> 2. O horário continua terça a sábado, das 9h às 12h e das 14h às 17h?
> 3. Em setembro, no Mês da Baleia Franca, muda alguma coisa no horário ou tem
>    programação especial que valha a pena avisar aos hóspedes?"

**If Itapirubá confirms the skeleton:** nothing to change.
**If it's actually at Praia do Porto:** tell me and I'll swap the descriptions —
it's a two-line data edit.

---

## Call 2 — Surfland Brasil · **(48) 99203-7446**

**Why:** the brief asked for *Só 4x4 Kids* as a covered play area. It isn't —
its own Instagram bio says *"locação de carrinhos elétricos 4x4"*, and nothing
confirms it's under a roof, so I left it out. But Surfland **separately**
advertises an *espaço kids coberto*, which is a different thing and would be
exactly the covered kids option this matrix is missing.

> "Oi! Pergunta rápida sobre o espaço kids coberto de vocês:
>
> 1. Ele é realmente coberto — dá pra usar em dia de chuva forte?
> 2. Qual o horário de funcionamento?
> 3. Quanto custa? E precisa pagar a entrada do parque também, ou o espaço kids
>    é cobrado à parte?
> 4. Precisa reservar antes ou pode chegar e usar?
> 5. Qual a faixa de idade que ele atende?"

**If it's genuinely covered:** send me the answers and I'll add it as the third
venue plus a guide card — it's the closest of the three (about 21 minutes) and
would be the best rainy option for small children.
**If it's open-air:** nothing to do, it stays out.

---

## Optional third — Chocolate Artesanal Garopaba · **(48) 99215-4781**

Lower priority: even if the café reopens it looks open-air, so it fails the
rainy test either way. Worth asking only if you want it as a fair-weather card.

> "Oi! A cafeteria lá da estrada de Areias de Macacu está funcionando, ou por
> enquanto vocês estão só na banca do Mercado do Produtor? Tem alguma parte
> coberta pra dia de chuva?"

---

## What changes after the calls

Everything lives in `TG_RAINY_DAY` in `firebase-config.js`. Give me the answers
and the edit touches one place — the concierge, the guide card and the deck
filter all follow from it.
