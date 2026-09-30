# TheGathering — open items

Living handoff. A fresh session (local or cloud) should read this after
`CLAUDE.md` to know what is half-done. Update it as things close.

Last reviewed: 2026-09-30.

**Nothing secret goes in this file.** No phone numbers, no codes, no WiFi. The
repository is public.

---

## Can be done from any device, no Mac needed

These happen in a browser on the live portal
(`https://fefoabreu.me/TheGathering/owner.html`), signed in with Google on the
house account. Hard-reload on first visit — Pages caches HTML for four hours.

### 1. Add Jonas to the vendor directory
Not done. Jonas — Esquadritec, **🎛️ Persianas Automáticas**, group *service*,
cadence *Sob demanda*. His number is in the WhatsApp thread; it goes in the
form's phone field and lands in the Vault, never in this repo.

Preferred: just tell Hanna in words — she has `add_vendor` and will do it.
That also exercises the path the owners actually want to use. The `+ Add vendor`
form in Upkeep is the fallback.

### 2. Import the inventory, then publish the guest view
Not done. Upkeep tab → **⤓ Import Anexo II** → pick
`~/Documents/TheGathering-local/inventory-seed.json` → then **Publish guest
view**.

The seed is deliberately NOT in this repo (197 items with brands against a
published address is a shopping list). It lives on Fêfo's Mac, so **this step
needs the Mac that holds the file** — or the file copied to whichever device is
doing it. Everything else on this list is device-independent.

Until it runs, `inventory` and `gathering/inventoryGuest` are empty, Hanna's
`get_pendencias` returns the "not imported yet" message, and Sisay's
`get_amenities` tells guests she will check with the owners rather than
guessing. All three degrade honestly, so shipping before the import was safe.

### 3. Sign the Anexo II conferência
Clause 4.11/4.12: Estar compiles the inventory, owners have five business days
from receipt to check and validate it. Vistoria was 2026-09-03; the Termo at the
end of the PDF is blank. Anexo II is the baseline Estar measures damage against,
so the 21 pendências stand as recorded until disputed. Worth a Chronicle entry
either way.

---

## Needs a signed-in Mac (local CLI credentials)

### 4. Confirm the guest WiFi password
`worker-sisay/house.local.json` (gitignored) holds a password transcribed from
Fêfo's doc and **never confirmed by a human**. Sisay hands it to guests. Verify
it, then re-push the pack to KV with wrangler. Until confirmed, treat it as
suspect.

### 5. Anything touching firestore.rules or Worker secrets
`firebase deploy --only firestore:rules` and `wrangler secret put` need local
auth. A cloud session cannot do these without re-authenticating.

---

## Code, any session

### 6. Suite bed data contradicts Anexo II
Owners confirmed the suite mapping on 2026-09-28: Q01 Planície, Q02 Ilha,
Q03 Montanha, Q04 Floresta. Under that mapping the portal's own room table
(`owner.html`, the `planicie`/`ilha`/`montanha`/`floresta` array) is wrong for
two suites:

- **Planície** is listed `bed:'King'`, but Suíte 1 in Anexo II has a queen, a
  double and an auxiliary single on a planned bunk structure with a ladder and
  safety net.
- **Floresta** is listed `bed:'Flex bunks'`, but Suíte 4 has the king, the
  banheira and the double vanity.

Either the portal table is stale or the mapping needs another look. Not resolved
— confirm against the planta before editing, because the guest site renders
these too.

---

## Recently closed

- Vendor `contactVia` (whatsapp | phone | email): form field, card badge with a
  wa.me link, Hanna's add/update tools and prompt (2026-09-30). The seed marks
  Renan whatsapp, but the live directory is already seeded — tell Hanna
  "Renan only answers on WhatsApp" once to set it.
- Vendor directory writes: form + Hanna's `add_vendor`/`update_vendor`/
  `remove_vendor`, all through one transaction (2026-09-25).
- `saveVault()` last-write-wins clobber: now a per-field merge inside a
  transaction (2026-09-25).
- House inventory: `inventory` collection, guest projection, Hanna's
  `get_inventory`/`get_pendencias`, Sisay's `get_amenities` (2026-09-28).
