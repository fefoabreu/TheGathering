# Hanna — owners' agent proxy

Cloudflare Worker sitting between the owners' portal and the Anthropic API,
so the API key never reaches the browser.

- **Live at:** `https://hanna.fefoabreu.me`
- **Deploy:** `cd worker && wrangler deploy`
- **Logs:** `wrangler tail tgs-hanna`

## The secret

The API key is an encrypted Worker secret and is deliberately **not** in this
repo, in `wrangler.toml`, or anywhere in git. Set it once:

```bash
cd worker
wrangler secret put ANTHROPIC_API_KEY
```

Paste the key at the prompt. It is write-only from then on — Cloudflare will
not show it again, and `wrangler.toml` stays safe to commit.

Rotate the same way: run the command again with a new key, then revoke the old
one at console.anthropic.com.

## What it refuses

| Request | Response |
|---|---|
| No Firebase ID token | `401 Unauthorized: missing token` |
| Token from another Firebase project | `401 wrong audience` |
| Expired token | `401 token expired` |
| Origin not in the allowlist | `403 Origin not allowed` |
| Anything but POST/OPTIONS | `405` |

Authentication is checked *before* configuration, so an anonymous caller
learns nothing about the Worker's setup. Without these checks the Worker would
be an open relay billed to our account.
