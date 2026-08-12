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
 * Firebase signs ID tokens with rotating Google certificates. Rather than
 * implementing RS256 verification by hand, we ask Google's token info
 * endpoint — it validates the signature and expiry for us. We then check
 * the audience matches this project, so a token minted for some other
 * Firebase project can't be replayed here.
 */
async function verifyFirebaseToken(token) {
  if (!token) return { ok: false, reason: 'missing token' };

  const res = await fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token)
  );
  if (!res.ok) return { ok: false, reason: 'token rejected by Google' };

  const info = await res.json();
  if (info.aud !== FIREBASE_PROJECT_ID) return { ok: false, reason: 'wrong audience' };
  if (info.iss && !info.iss.includes(FIREBASE_PROJECT_ID)) {
    return { ok: false, reason: 'wrong issuer' };
  }
  const exp = Number(info.exp || 0);
  if (exp && exp * 1000 < Date.now()) return { ok: false, reason: 'token expired' };

  return { ok: true, uid: info.sub || info.user_id };
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
    const check = await verifyFirebaseToken(idToken);
    if (!check.ok) {
      return json({ error: 'Unauthorized: ' + check.reason }, 401, origin);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return json({ error: 'Proxy is not configured — ANTHROPIC_API_KEY is unset.' }, 500, origin);
    }

    let payload;
    try { payload = await request.json(); }
    catch { return json({ error: 'Body must be JSON' }, 400, origin); }

    const body = {
      model:      payload.model  || env.MODEL || DEFAULT_MODEL,
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
