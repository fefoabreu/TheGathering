#!/usr/bin/env bash
# Upload the trail set to Cloudflare KV.
#
# The matrix is the owners' own local knowledge — which beach the Morro shelters
# on which wind — and it is not derivable from any weather API. It lives in
# trails.local.json, which is gitignored, and is pushed from here into the KV
# namespace Sisay's Worker reads.
#
# Re-run whenever the matrix changes. Sisay treats any wind direction not listed
# for a beach as unknown, and will say so rather than guess.
#
#   ./push-trails.sh
#
set -euo pipefail
cd "$(dirname "$0")"

PACK="trails.local.json"
[ -f "$PACK" ] || { echo "✗ $PACK not found. Copy trails.example.json and fill it in."; exit 1; }

python3 - "$PACK" <<'PYEOF'
import json, sys
d = json.load(open(sys.argv[1]))
ts = d.get('trails') or []
assert ts, 'no trails'
unrated = [t['name'] for t in ts if not t.get('difficulty') or 'not stated' in str(t.get('difficulty'))]
print(f"  {len(ts)} trails, {len(d.get('guides',[]))} guides, updated {d.get('_updated','?')}")
if unrated:
    print('  ! no difficulty rating: ' + '; '.join(unrated))
for g in d.get('_gaps', []):
    print('  gap: ' + g[:78])
PYEOF

echo "→ uploading to KV (SISAY_LIMITS / trails:v1)…"
npx wrangler kv key put "trails:v1" --path "$PACK" --binding SISAY_LIMITS --remote

echo "✓ done. Ask Sisay: \"where should we go today?\""
