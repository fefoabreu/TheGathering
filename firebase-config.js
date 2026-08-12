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

const TG_OWNER_EMAIL = "owners@thegatheringsilveira.com";
