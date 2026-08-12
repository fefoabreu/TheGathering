#!/usr/bin/env bash
# Upload Hanna's property knowledge pack to Cloudflare KV.
#
# The pack is distilled from the owners' Google Drive folder and is NOT in this
# repo — the repo is public. It lives in worker/knowledge.local.json, which is
# gitignored, and is pushed from here into the KV namespace the Worker reads.
#
# Re-run this whenever the source documents change materially. There is no live
# Drive sync: the pack is a snapshot, and Hanna is told so.
#
#   ./push-knowledge.sh
#
set -euo pipefail
cd "$(dirname "$0")"

PACK="knowledge.local.json"
[ -f "$PACK" ] || { echo "✗ $PACK not found — nothing to upload."; exit 1; }

# Fail loudly rather than shipping malformed JSON the Worker will silently drop.
python3 -c "import json,sys; d=json.load(open('$PACK')); assert d.get('sections'), 'no sections'; print(f'  {len(d[\"sections\"])} sections, updated {d.get(\"_updated\",\"?\")}')" \
  || { echo "✗ $PACK is not valid JSON."; exit 1; }

echo "→ uploading to KV (HANNA_CACHE / knowledge:v1)…"
npx wrangler kv key put "knowledge:v1" --path "$PACK" --binding HANNA_CACHE --remote

echo "✓ done. Ask Hanna: \"when did we buy the house, and how long did the build take?\""
