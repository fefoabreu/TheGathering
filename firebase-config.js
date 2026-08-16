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

// ──────────────────────────────────────────────────────────────
//  Owner sign-in — Google SSO on the shared property account
// ──────────────────────────────────────────────────────────────
//  The three owners share TheGatheringSilveira@gmail.com, which is also
//  the account that owns the Drive folder and the calendar. Signing in
//  WITH that account does two jobs at once: it proves who is at the
//  keyboard, and it hands the portal a Google token that can read the
//  Drive as that account. No refresh token is stored anywhere — the
//  token lives in memory for the session and dies with the tab, which
//  is strictly safer than parking a long-lived credential in a Worker.
//
//  Only these addresses may enter. Enforced in the browser for the UX
//  and AGAIN in the Worker, which is the boundary that actually counts.
// ──────────────────────────────────────────────────────────────
const TG_OWNER_EMAILS = [
  "thegatheringsilveira@gmail.com",   // the standard — shared by all three
  "fefoabreu@gmail.com",
  "piero.cabral@gmail.com",
  "wilayres@gmail.com",
];

// Read-only. Hanna never writes to the Drive.
const TG_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

// Property Mgmt → Garopaba → The Gathering Silveira. Used to mark whether a
// search hit came from the property folder or from somewhere else the account
// can see — provenance, not a restriction. See the sync-scope note in the brief.
const TG_PROPERTY_FOLDER_ID = "1Q3Wo8OoiDPC_hls-2cgRextAZueU3gIV";

// Legacy password path. Leave true until Google sign-in is confirmed working,
// then set false — while it is true the old hole is still open.
const TG_ALLOW_PASSWORD_FALLBACK = true;

// The portal gate. Owner decision (Aug 12): this is the only access control
// for now — inside, all three owners see everything, as in the shared Google
// Doc. It is a shared team password, not a per-person credential.
const TG_GATE_PASSWORD = "@tgs";
