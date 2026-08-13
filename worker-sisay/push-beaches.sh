#!/usr/bin/env bash
# Upload the beach matrix to Cloudflare KV.
#
# The matrix is the owners' own local knowledge — which beach the Morro shelters
# on which wind — and it is not derivable from any weather API. It lives in
# beaches.local.json, which is gitignored, and is pushed from here into the KV
# namespace Sisay's Worker reads.
#
# Re-run whenever the matrix changes. Sisay treats any wind direction not listed
# for a beach as unknown, and will say so rather than guess.
#
#   ./push-beaches.sh
#
set -euo pipefail
cd "$(dirname "$0")"

PACK="beaches.local.json"
[ -f "$PACK" ] || { echo "✗ $PACK not found. Copy beaches.example.json and fill it in."; exit 1; }

python3 - "$PACK" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
bs = d.get('beaches') or []
assert bs, 'no beaches'
gaps = []
for b in bs:
    w = b.get('wind', {})
    covered = len(w.get('clean', [])) + len(w.get('sheltered', [])) + len(w.get('blownOut', []))
    if not covered:
        gaps.append(b.get('name', b.get('id', '?')))
print(f"  {len(bs)} beaches, updated {d.get('_updated','?')}")
if gaps:
    print('  ⚠ no wind arcs yet: ' + ', '.join(gaps) + '  (Sisay will decline to guess these)')
PY

echo "→ uploading to KV (SISAY_LIMITS / beaches:v1)…"
npx wrangler kv key put "beaches:v1" --path "$PACK" --binding SISAY_LIMITS --remote

echo "✓ done. Ask Sisay: \"where should we go today?\""
