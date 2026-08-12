# Sisay — guest concierge proxy

Cloudflare Worker for the public guest site. Live at `https://sisay.fefoabreu.me`.

## The secret

```bash
cd worker-sisay
wrangler secret put ANTHROPIC_API_KEY
```

Same key as Hanna is fine — it was created as "TheGathering AI Agents". The
Workers stay separate so one can never exhaust the other's budget.

## Why this one is different from Hanna's

Hanna's callers are three owners behind a password. Sisay's surface is a public
website, so anyone who finds the page can call her and **every call is billed to
us**. Four guards, in order of how much they actually help:

| Guard | Where | Effect |
|---|---|---|
| Daily USD ceiling | KV `spend:YYYY-MM-DD` | At the cap Sisay goes quiet politely. Default **$2.00/day** — change `DAILY_USD_CEILING` in `wrangler.toml`. |
| Per-session cap | KV `sess:date:uid` | 25 messages per anonymous visitor per day |
| Reply ceiling | `MAX_TOKENS_PER_REPLY` | 700 tokens — a concierge answer is short |
| Origin allowlist | request header | Weakest; trivially forged outside a browser, never relied on alone |

Spend is estimated from returned `usage` at Sonnet pricing, which is why her
responses are non-streaming — usage only arrives with a complete response.

## Watching the spend

```bash
wrangler kv key list  --binding SISAY_LIMITS --remote
wrangler kv key get   "spend:$(date +%F)" --binding SISAY_LIMITS --remote
wrangler tail tgs-sisay
```

## What Sisay cannot reach

No bookings, guest names, door codes, WiFi passwords, vendor details or
financials. Firestore rules deny them and her tool set does not offer them. She
reads only the published guide and the house manual.
