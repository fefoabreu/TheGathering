/**
 * Hanna — TheGathering Silveira owners' agent proxy
 * ─────────────────────────────────────────────────
 * Sits between the owners' portal and the Anthropic API so the API key
 * never reaches the browser.
 *
 * Two jobs:
 *   1. Hold ANTHROPIC_API_KEY as an encrypted Worker secret.
 *   2. Refuse anything that isn't a real caller — a Firebase ID token
 *      from this project, and an allowed origin. Without that check this
 *      is an open relay billed to us.
 *
 * Streams the response straight through so the portal renders tokens as
 * they arrive.
 */

const ALLOWED_ORIGINS = [
  'https://fefoabreu.me',
  'https://fefoabreu.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const FIREBASE_PROJECT_ID = 'thegathering-996d2';
// Public by design — Firebase web API keys are identifiers, not secrets.
const FIREBASE_API_KEY    = 'AIzaSyDgogQXGPYZsOWbSwEJBva0UcMUUNuDPH4';
const ANTHROPIC_VERSION   = '2023-06-01';
const DEFAULT_MODEL       = 'claude-sonnet-5';
const MAX_TOKENS          = 2048;

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
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

/**
 * Verify a Firebase ID token.
 *
 * Firebase ID tokens are JWTs signed by Google's securetoken service — not
 * Google OAuth ID tokens, so the oauth2 tokeninfo endpoint rejects them.
 * Rather than hand-rolling RS256 verification against rotating X.509 certs,
 * we hand the token to Firebase's own accounts:lookup, which validates the
 * signature, expiry and project binding in one call and returns the user.
 * Fewer moving parts on a security boundary is worth one round trip.
 */
async function verifyFirebaseToken(token, apiKey) {
  if (!token) return { ok: false, reason: 'missing token' };
  if (!apiKey) return { ok: false, reason: 'proxy misconfigured' };

  let res;
  try {
    res = await fetch(
      'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(apiKey),
      { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }) }
    );
  } catch {
    return { ok: false, reason: 'verification unavailable' };
  }

  if (!res.ok) return { ok: false, reason: 'invalid or expired token' };

  const data = await res.json().catch(() => null);
  const user = data && Array.isArray(data.users) && data.users[0];
  if (!user) return { ok: false, reason: 'token not recognised' };

  return { ok: true, uid: user.localId };
}


/**
 * Google Calendar sync (read-only).
 *
 * The property's shared Google Calendar — thegatheringsilveira@gmail.com — is
 * where the three owners actually work, so it is the source of truth for what
 * is happening at the house. We read its secret iCal address server-side; the
 * URL is a bearer credential and never reaches the browser.
 *
 * Read-only and additive by design. Synced events are returned separately from
 * the portal's own owner blocks and never overwrite them: losing a block a
 * human typed is exactly the failure that turns into an owner-fault
 * cancellation under clause 6.4.
 */

function icsUnfold(text) {
  // RFC 5545 folds long lines with CRLF + a single space or tab.
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

function icsUnescape(v) {
  return (v || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',')
                  .replace(/\;/g, ';').replace(/\\\\/g, '\\');
}

/** DTSTART;VALUE=DATE:20260910  or  DTSTART:20260910T130000Z → YYYY-MM-DD */
function icsDate(raw) {
  if (!raw) return null;
  const m = raw.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function parseIcs(text) {
  const out = [];
  const body = icsUnfold(text);
  const blocks = body.split(/BEGIN:VEVENT/).slice(1);

  for (const b of blocks) {
    const chunk = b.split(/END:VEVENT/)[0];
    const field = name => {
      const m = chunk.match(new RegExp('^' + name + '[^:\\r\\n]*:(.*)$', 'mi'));
      return m ? m[1].trim() : '';
    };
    const status = field('STATUS').toUpperCase();
    if (status === 'CANCELLED') continue;

    const from = icsDate(field('DTSTART'));
    let to     = icsDate(field('DTEND'));
    if (!from) continue;

    // All-day DTEND is exclusive in iCal; show the last occupied night.
    const allDay = /VALUE=DATE(?!-TIME)/i.test(chunk.match(/^DTSTART[^:\r\n]*/mi)?.[0] || '');
    if (allDay && to) {
      const d = new Date(to + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      to = d.toISOString().slice(0, 10);
    }

    out.push({
      uid:      field('UID'),
      title:    icsUnescape(field('SUMMARY')) || '(untitled)',
      from,
      to:       to || from,
      where:    icsUnescape(field('LOCATION')),
      notes:    icsUnescape(field('DESCRIPTION')).slice(0, 500),
      source:   'google',
      recurring: /^RRULE/mi.test(chunk),
      rrule:    (chunk.match(/^RRULE:(.*)$/mi) || [,''])[1].trim(),
      transp:   (chunk.match(/^TRANSP:(.*)$/mi) || [,''])[1].trim(),
      timed:    !/VALUE=DATE(?!-TIME)/i.test(chunk.match(/^DTSTART[^:\r\n]*/mi)?.[0] || ''),
    });
  }
  out.sort((a, b) => a.from.localeCompare(b.from));
  return out;
}

async function fetchIcs(url, source) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'TheGathering/1.0' } });
    if (!res.ok) return { source, error: 'HTTP ' + res.status, events: [] };
    const events = parseIcs(await res.text()).map(e => ({ ...e, source }));
    return { source, events };
  } catch (e) {
    return { source, error: 'unreachable', events: [] };
  }
}

async function handleCalendar(env, origin) {
  const feeds = [];
  if (env.GCAL_ICS_URL)   feeds.push({ url: env.GCAL_ICS_URL,   source: 'google' });
  if (env.AIRBNB_ICS_URL) feeds.push({ url: env.AIRBNB_ICS_URL, source: 'airbnb' });

  if (!feeds.length) {
    return json({ error: 'calendar_not_configured',
                  message: 'No calendar feeds are connected yet.' }, 503, origin);
  }

  const kv = env.HANNA_CACHE;
  if (kv) {
    const hit = await kv.get('cal:v2', 'json');
    if (hit) return json({ ...hit, cached: true }, 200, origin);
  }

  // Both feeds in parallel; one failing must not take the other down.
  const results = await Promise.all(feeds.map(f => fetchIcs(f.url, f.source)));

  const events = results.flatMap(r => r.events)
                        .sort((a, b) => a.from.localeCompare(b.from));
  const sources = {};
  results.forEach(r => { sources[r.source] = r.error ? { error: r.error } : { count: r.events.length }; });

  const payload = { events, count: events.length, sources, fetchedAt: new Date().toISOString() };
  if (kv) await kv.put('cal:v2', JSON.stringify(payload), { expirationTtl: 600 });
  return json(payload, 200, origin);
}

/**
 * Property knowledge (read-only).
 *
 * Distilled from the owners' Google Drive folder — the partnership agreement,
 * the Habite-se, the project file. Hanna could reason perfectly well about the
 * house but had never been told anything about it, so questions like "when did
 * we buy it" got an honest "I have no record of that".
 *
 * It lives in KV rather than in this file because the repo is public, and
 * rather than in Firestore because guests on the public site hold anonymous
 * Firebase tokens and the rules grant any signed-in caller the `gathering`
 * collection. KV is only reachable from inside the Worker.
 *
 * Deliberately excluded when the pack was built: CPFs, bank accounts, home
 * addresses and personal phone numbers, for the owners and for third parties
 * alike. None of it helps answer a question about the house, and it is
 * LGPD-regulated the moment it concerns someone who is not an owner.
 *
 * Keyword match, not embeddings. The pack is seven sections — anything
 * cleverer would cost more than reading the whole thing.
 */
async function handleDocs(env, origin, query) {
  const kv = env.HANNA_CACHE;
  if (!kv) return json({ error: 'knowledge_unavailable' }, 503, origin);

  const pack = await kv.get('knowledge:v1', 'json');
  if (!pack || !Array.isArray(pack.sections)) {
    return json({
      error: 'knowledge_not_loaded',
      message: 'No property knowledge pack has been uploaded yet.',
    }, 503, origin);
  }

  const q = String(query || '').toLowerCase();
  if (!q) {
    return json({ updated: pack._updated, source: pack._source,
                  sections: pack.sections.map(s => ({ id: s.id, title: s.title })) }, 200, origin);
  }

  const scored = pack.sections.map(s => {
    let score = 0;
    for (const k of (s.keywords || [])) if (q.includes(k.toLowerCase())) score += 2;
    for (const w of q.split(/[^a-zà-ÿ0-9]+/i)) {
      if (w.length < 4) continue;
      if ((s.title + ' ' + s.body).toLowerCase().includes(w)) score += 1;
    }
    return { s, score };
  }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  // Nothing matched — hand back the contents page rather than nothing at all,
  // so she can say what she does hold instead of guessing.
  const hits = scored.length ? scored.map(x => x.s) : pack.sections.slice(0, 1);

  return json({
    updated: pack._updated,
    source:  pack._source,
    matched: scored.length,
    available: pack.sections.map(s => s.title),
    sections: hits.map(s => ({ id: s.id, title: s.title, body: s.body })),
  }, 200, origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, origin);
    }
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: 'Origin not allowed' }, 403, origin);
    }
    // Caller must present a Firebase ID token from this project.
    const auth = request.headers.get('Authorization') || '';
    const idToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    const check = await verifyFirebaseToken(idToken, env.FIREBASE_API_KEY || FIREBASE_API_KEY);
    if (!check.ok) {
      return json({ error: 'Unauthorized: ' + check.reason }, 401, origin);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Proxy is not configured — ANTHROPIC_API_KEY is unset.' }, 500, origin);
    }

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: 'Body must be JSON' }, 400, origin); }

    // Calendar sync shares the proxy's auth rather than standing up a second
    // authenticated surface.
    if (payload.action === 'calendar') return handleCalendar(env, origin);
    if (payload.action === 'docs')     return handleDocs(env, origin, payload.query);

    const body = {
      // The model is set by config, not by the caller. Letting the client
      // pick meant a browser session could request a costlier model and
      // quietly undo the choice made here.
      model:      env.MODEL || DEFAULT_MODEL,
      max_tokens: Math.min(payload.max_tokens || MAX_TOKENS, 8192),
      messages:   payload.messages || [],
      stream:     payload.stream !== false,
    };
    if (payload.system) body.system = payload.system;
    if (payload.tools)  body.tools  = payload.tools;
    if (payload.tool_choice) body.tool_choice = payload.tool_choice;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         env.ANTHROPIC_API_KEY,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      return json({ error: 'Upstream error', status: upstream.status, detail }, upstream.status, origin);
    }

    // Pass the SSE stream through untouched.
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'Content-Type':  body.stream ? 'text/event-stream; charset=utf-8' : 'application/json',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        ...cors(origin),
      },
    });
  },
};
