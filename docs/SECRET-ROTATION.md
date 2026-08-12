# Secret rotation — required before the Vault is trusted

**Status: OPEN. Owner action.**

> Values below are redacted — this file is committed to a public repo. The full
> originals are visible in git history and on the devices themselves; the point here
> is the checklist, not the values.

Everything below was committed to a **public** repository on **2026-05-14** (`96d51cd`)
and served publicly from `owner.html` until Phase 1. It is present in **34 commits** of
git history.

Phase 1 removed these values from the site and the working tree. **That does not
un-expose them.** Public history, forks, clones and search caches keep the old values
indefinitely. The only fix is to change the underlying secrets.

## Rotate

| # | Secret | Old value (redacted) | Where to change it |
|---|---|---|---|
| 1 | Master door code | `2025••` (slot: Master) | Smart lock — all doors |
| 2 | Pipo's code | `2704••` | Smart lock, slot 004 |
| 3 | Fêfo's code | `2009••` | Smart lock, slot 005 |
| 4 | Zé's code | `2209••` | Smart lock, slot 006 |
| 5 | Maintenance code (Ricardo) | `884••` | Smart lock — **also note this was simply the property CEP (88490-000). Pick something unrelated.** |
| 6 | Owner WiFi password | `@tgsilv••••` | Router — owner network |
| 7 | Guest WiFi password | `wel••••` | Router — guest network (lower risk; rotate at leisure) |
| 8 | Airbnb private iCal token | `…?t=6d82••…` | Airbnb → Calendar → Availability → **regenerate** the export link. Anyone with the old URL can read every booking. |
| 9 | Portal password | `@tg•` | Superseded — becomes the Firebase account password (min 6 chars) |

## Third-party data — notify, don't just rotate

| Secret | Note |
|---|---|
| Vendor CPF `035.790.•••-••` (Du, gardening) | A Brazilian national ID belonging to a **third party**, published without consent. Cannot be "rotated". Under LGPD this is personal data — Du should be told it was exposed. Consider storing only a Pix phone key instead of a CPF going forward. |
| Vendor phone numbers | Published; low sensitivity, no action beyond awareness. |
| 12 guests by name + home city | Published in `owner.html`. Still hardcoded in the bundle — **moves to Firestore in Phase 2**, tracked there. |

## After rotating

1. Sign in to the portal.
2. Open **Upkeep → 🔐 Vault**.
3. Paste the **new** values and save. They are written to `gathering/secrets`, readable
   only by an owner account, and never enter this repo.

## Should we rewrite git history?

Probably not worth it. A rewrite (`git filter-repo`) would break every existing clone
and fork, and it cannot claw back what GitHub, forks or caches already hold. Rotation
makes the old values worthless, which is the outcome that matters. Revisit only if the
repository is ever made private, where a rewrite would then be meaningfully effective.
