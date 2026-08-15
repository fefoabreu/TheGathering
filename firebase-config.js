// ──────────────────────────────────────────────────────────────
//  TheGathering · Firebase Configuration
// ──────────────────────────────────────────────────────────────
//  Enables real-time sync between the Owner Deck Builder
//  and the Guest Booster Pack on the main site.
//
//  Firebase web API keys are intentionally public — security is
//  enforced by Firestore security rules, not the API key.
// ──────────────────────────────────────────────────────────────

const TG_FIREBASE_ENABLED = true;

const TG_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDgogQXGPYZsOWbSwEJBva0UcMUUNuDPH4",
  authDomain:        "thegathering-996d2.firebaseapp.com",
  projectId:         "thegathering-996d2",
  storageBucket:     "thegathering-996d2.firebasestorage.app",
  messagingSenderId: "736571740736",
  appId:             "1:736571740736:web:ec86a8ea050bd5406945a5"
};

// Firestore path where the published guest guide lives (public read)
const TG_GUIDE_PATH = { collection: "gathering", doc: "guide" };

// Owner-only records. Readable and writable only by an account whose UID is
// listed in config/access — see firestore.rules.
const TG_BLOCKS_PATH   = { collection: "gathering", doc: "calendar" };
const TG_PROJECTS_PATH = { collection: "gathering", doc: "projects" };

// Door codes, WiFi, the Airbnb iCal feed and vendor payment details. Never in
// this repo — the values live in Firestore and are entered from the portal.
const TG_SECRETS_PATH  = { collection: "gathering", doc: "secrets" };

// Phase 2 — the rest of the portal's data. Same document-per-topic shape as
// the records above, so this extends the existing schema rather than
// replacing it. Volumes here are tiny (tens of records), well inside the 1MB
// per-document limit.
const TG_BOOKINGS_PATH = { collection: "gathering", doc: "bookings"  };
const TG_VENDORS_PATH  = { collection: "gathering", doc: "vendors"   };
const TG_HOUSE_PATH    = { collection: "gathering", doc: "houseInfo" };
const TG_COSTS_PATH    = { collection: "gathering", doc: "costs"     };

// The Chronicle. A real collection, not a document: it grows over time and
// wants ordering and limits. Same for agent chat sessions in Phase 3.
const TG_DECISIONS_COLL = "decisions";
const TG_SESSIONS_COLL  = "agentSessions";

// ──────────────────────────────────────────────────────────────
//  The house soundtrack
// ──────────────────────────────────────────────────────────────
//  Defined once, here, because this file is the only thing both the
//  guest site and the owners' portal already load — so Hanna and Sisay
//  read the same object rather than each carrying its own copy of the
//  links. It reaches the agents as DATA: merged into Hanna's
//  get_house_info and Sisay's house manual at read time, not written
//  into either system prompt. Change the links here and both agents,
//  and the guest page, follow.
//
//  Public playlists — nothing secret, safe in the bundle.
// ──────────────────────────────────────────────────────────────
const TG_SOUNDTRACK = {
  name:    "TheGathering 🌊🌄",
  what:    "The house's official trilha sonora, curated by the three owners — MPB and Brazilian sounds with sunset beach-house energy, meant to match the place.",
  spotify: "https://open.spotify.com/playlist/6p1z0izahO4LRsymqqhA9N",
  apple:   "https://music.apple.com/us/playlist/thegathering/pl.u-55D66ZKsVADkDz",
};

// ──────────────────────────────────────────────────────────────
//  Owner sign-in
// ──────────────────────────────────────────────────────────────
//  Phase 1 is deliberately "Auth-Lite": all three owners share one
//  Firebase account, so the gate can keep its single password field.
//  This is an identifier, not a secret — the password is only ever
//  what the owner types, and is never stored in the bundle.
//
//  Pivot to individual accounts later: set TG_OWNER_ACCOUNTS to the
//  three addresses and show the email field. Authorisation itself is
//  data, not code — add each new UID to config/access in Firestore
//  and the rules pick it up with no redeploy.
// ──────────────────────────────────────────────────────────────

// The portal gate. Owner decision (Aug 12): this is the only access control
// for now — inside, all three owners see everything, as in the shared Google
// Doc. It is a shared team password, not a per-person credential.
const TG_GATE_PASSWORD = "@tgs";
