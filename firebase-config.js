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

// Owner-only records — these require an authenticated session.
// The owner portal signs in anonymously on load; see firestore.rules.
const TG_BLOCKS_PATH   = { collection: "gathering", doc: "calendar" };
const TG_PROJECTS_PATH = { collection: "gathering", doc: "projects" };
