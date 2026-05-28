// ──────────────────────────────────────────────────────────────
//  TheGathering · Firebase Configuration
// ──────────────────────────────────────────────────────────────
//  Enables real-time sync between the Owner Deck Builder
//  and the Guest Booster Pack on the main site.
//
//  SETUP (one-time, ~5 min):
//  1. Go to https://console.firebase.google.com
//  2. Create a project (free Spark plan is enough)
//  3. Enable Firestore Database → "Start in test mode"
//  4. Project Settings → Your apps → Add Web App
//  5. Copy the firebaseConfig object and paste below
//  6. Set TG_FIREBASE_ENABLED = true
// ──────────────────────────────────────────────────────────────

const TG_FIREBASE_ENABLED = false;   // ← flip to true after setup

const TG_FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// Firestore path where the guide lives
const TG_GUIDE_PATH = { collection: "gathering", doc: "guide" };
