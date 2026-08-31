/**
 * Sisay — TheGathering Silveira guest concierge proxy
 * ───────────────────────────────────────────────────
 * Hanna's proxy is protected by the fact that only three owners can reach it.
 * Sisay's surface is the public website, so anyone who finds the page can call
 * her, and every call is billed to us. An unprotected public agent is a
 * stranger's free Claude subscription.
 *
 * Defence, in order of how much it actually helps:
 *   1. A hard daily spend ceiling. When the day's budget is gone, Sisay goes
 *      quiet politely rather than billing on.
 *   2. A per-session message cap, keyed on the caller's anonymous Firebase uid.
 *   3. Per-request token ceiling — concierge answers are short by design.
 *   4. Origin allowlist. Necessary, but trivially forged outside a browser,
 *      so it is the weakest of the four and never relied on alone.
 *
 * Sisay is deliberately given no path to owner data. The Firestore rules deny
 * it, and her tool set does not offer it.
 */

const ALLOWED_ORIGINS = [
  'https://fefoabreu.me',
  'https://fefoabreu.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const FIREBASE_PROJECT_ID = 'thegathering-996d2';
const FIREBASE_API_KEY    = 'AIzaSyDgogQXGPYZsOWbSwEJBva0UcMUUNuDPH4'; // public by design
const ANTHROPIC_VERSION   = '2023-06-01';
const DEFAULT_MODEL       = 'claude-sonnet-5';

// Ceilings. Deliberately conservative — a guest asking about dinner needs a
// short answer, and anything longer is either abuse or a bug.
//
// 700 was too tight, and it failed in the ugliest way: a rainy-day answer ran
// long and was guillotined mid-word ("a Estar Garopaba costuma ter es"). The
// guest sees a broken sentence, not a limit. The real fix is that Sisay is
// brief — that lives in her prompt — but the ceiling must leave enough room
// that a legitimate answer finishes rather than being cut. Still bounded:
// this is a public endpoint and the daily USD cap below is the real guard.
const MAX_TOKENS_PER_REPLY = 1100;
const DAILY_USD_CEILING    = 2.00;
const SESSION_MSG_LIMIT    = 25;    // per anonymous uid, per day
const SESSION_TTL_SECONDS  = 86400;

// Sonnet pricing per million tokens; only used to estimate spend for the cap.
const USD_PER_M_INPUT  = 3.00;
const USD_PER_M_OUTPUT = 15.00;

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin':  allow,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age':       '86400',
    'Vary': 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

const today = () => new Date().toISOString().slice(0, 10);

async function verifyFirebaseToken(token, apiKey) {
  if (!token) return { ok: false, reason: 'missing token' };
  let res;
  try {
    res = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey),
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }) });
  } catch { return { ok: false, reason: 'verification unavailable' }; }
  if (!res.ok) return { ok: false, reason: 'invalid or expired token' };
  const data = await res.json().catch(() => null);
  const user = data && Array.isArray(data.users) && data.users[0];
  if (!user) return { ok: false, reason: 'token not recognised' };
  return { ok: true, uid: user.localId };
}

/**
 * Spend so far today, in USD.
 *
 * ⚠ This is a TRIPWIRE, not a hard ceiling, and the difference matters.
 * KV reads are edge-cached (60s minimum TTL) and eventually consistent, so
 * this can run a minute behind reality. recordSpend below is a
 * read-modify-write, which is not atomic — concurrent requests overwrite each
 * other's increments and undercount, which is precisely the condition sustained
 * abuse creates.
 *
 * It will stop a slow drip. It will not stop a burst.
 *
 * The authoritative control is the spend limit set on the Anthropic workspace
 * itself, which is enforced upstream and cannot be raced. A true in-Worker
 * ceiling needs a Durable Object for an atomic counter — worth doing if guest
 * traffic ever justifies it.
 */
async function spentToday(kv) {
  // Ask for the freshest value KV will give us.
  const v = await kv.get('spend:' + today(), { cacheTtl: 60 });
  return v ? parseFloat(v) : 0;
}

/** Record estimated spend for a completed exchange. */
async function recordSpend(kv, usage) {
  if (!usage) return;
  const cost = (usage.input_tokens  || 0) / 1e6 * USD_PER_M_INPUT
             + (usage.output_tokens || 0) / 1e6 * USD_PER_M_OUTPUT;
  const key = 'spend:' + today();
  const cur = await spentToday(kv);
  // Two days of TTL so the key survives timezone edges before expiring itself.
  await kv.put(key, String(cur + cost), { expirationTtl: 172800 });
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(origin) });
    if (request.method !== 'POST')    return json({ error: 'Method not allowed' }, 405, origin);
    if (origin && !ALLOWED_ORIGINS.includes(origin)) return json({ error: 'Origin not allowed' }, 403, origin);

    const auth = request.headers.get('Authorization') || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const check = await verifyFirebaseToken(idToken, env.FIREBASE_API_KEY || FIREBASE_API_KEY);
    if (!check.ok) return json({ error: 'Unauthorized: ' + check.reason }, 401, origin);

    const kv = env.SISAY_LIMITS;

    /*  LOCAL KNOWLEDGE — the beach matrix and the trail/waterfall pack.
     *
     *  These are the owners' own research: which corner of which beach works
     *  on which wind, which waterfalls have drowned people. Deliberately NOT
     *  in the repo (it is public) — they live in KV and are served from here.
     *
     *  Handled BEFORE the Anthropic key check and outside the message limit
     *  on purpose: this is a data read, not a model call. Charging a guest a
     *  message from their daily allowance for the page to load a beach list
     *  would be absurd, and it must keep working after the model budget for
     *  the day is spent. Auth still applies — the check above already ran. */
    let body0 = null;
    try { body0 = await request.clone().json(); } catch (e) {}
    if (body0 && body0.action === 'knowledge') {
      if (!kv) return json({ error: 'Knowledge store not bound.' }, 500, origin);
      const want = String(body0.pack || '');
      const KEYS = { beaches: 'beaches:v1', trails: 'trails:v1' };
      if (!KEYS[want]) return json({ error: 'Unknown pack.' }, 400, origin);
      const raw = await kv.get(KEYS[want], { cacheTtl: 3600 });
      if (!raw) return json({ error: 'Pack not loaded yet: ' + want }, 404, origin);
      return new Response(raw, {
        status: 200,
        headers: { ...cors(origin), 'Content-Type': 'application/json' },
      });
    }

    if (!env.ANTHROPIC_API_KEY) return json({ error: 'Proxy is not configured.' }, 500, origin);

    // 1. Daily ceiling — the one that actually protects the balance.
    if (kv) {
      const spent = await spentToday(kv);
      if (spent >= (parseFloat(env.DAILY_USD_CEILING) || DAILY_USD_CEILING)) {
        return json({
          error: 'daily_limit',
          message: "Sisay has stepped away for the day. She'll be back at the helm tomorrow — " +
                   "in the meantime the Garopaba Guide below has every recommendation she'd give you.",
        }, 429, origin);
      }

      // 2. Per-session cap, keyed on the anonymous uid.
      const sKey = 'sess:' + today() + ':' + check.uid;
      const used = parseInt((await kv.get(sKey)) || '0', 10);
      if (used >= SESSION_MSG_LIMIT) {
        return json({
          error: 'session_limit',
          message: "That's a lot of questions — and I've loved them. Give me a little while, " +
                   "or browse the Guide below in the meantime.",
        }, 429, origin);
      }
      ctx.waitUntil(kv.put(sKey, String(used + 1), { expirationTtl: SESSION_TTL_SECONDS }));
    }

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: 'Body must be JSON' }, 400, origin); }

    const body = {
      model:      env.MODEL || DEFAULT_MODEL,
      max_tokens: Math.min(payload.max_tokens || MAX_TOKENS_PER_REPLY, MAX_TOKENS_PER_REPLY),
      messages:   payload.messages || [],
      stream:     false,   // non-streaming so usage can be metered against the cap
    };
    if (payload.system) body.system = payload.system;
    if (payload.tools)  body.tools  = payload.tools;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
                 'x-api-key': env.ANTHROPIC_API_KEY,
                 'anthropic-version': ANTHROPIC_VERSION },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      // A 401 from upstream almost always means the stored secret is malformed
      // rather than wrong. Report its SHAPE — never its value — so the problem
      // is diagnosable without anyone pasting a key into a chat or a log.
      let keyShape;
      if (upstream.status === 401) {
        const k = env.ANTHROPIC_API_KEY || '';
        keyShape = {
          length: k.length,
          startsWithExpectedPrefix: k.startsWith('sk-ant-'),
          hasLeadingOrTrailingSpace: k !== k.trim(),
          containsNewline: /[\r\n]/.test(k),
          containsQuotes: /["']/.test(k),
        };
      }
      return json({ error: 'Upstream error', status: upstream.status, detail, keyShape },
                  upstream.status, origin);
    }

    const result = await upstream.json();
    if (kv) ctx.waitUntil(recordSpend(kv, result.usage));
    return json(result, 200, origin);
  },
};
