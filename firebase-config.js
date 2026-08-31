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
//  Owner decision (Aug 16): ONE shared account, not three personal ones.
//  All three owners sign in as the house account, the same way they already
//  share the Google Doc.
//
//  ⚠ Adding an address here is HALF the job. Google's OAuth consent screen is
//  in Testing mode, so an address must ALSO be listed as a test user there or
//  Google blocks it before Firebase ever sees it — the symptom is "Access
//  blocked: has not completed the Google verification process", which looks
//  nothing like an allowlist problem. Change both, or neither.
//  Console → APIs & Services → OAuth consent screen → Test users.
const TG_OWNER_EMAILS = [
  "thegatheringsilveira@gmail.com",   // the standard, shared by all three
  // Personal accounts are deliberately NOT here. To add one, add it as a test
  // user on the consent screen first, then uncomment:
  // "fefoabreu@gmail.com",
  // "piero.cabral@gmail.com",
  // "wilayres@gmail.com",
];

// Read-only, all of them. Hanna never writes to the Drive, the calendar or
// the mailbox — every scope here ends in .readonly, which is the whole point.
//
// Owner decision (Aug 16): everything within the property folder is in scope,
// and the calendar and mailbox on the house account are too. These are
// requested TOGETHER at sign-in, so there is one consent screen rather than
// three, and one token that expires with the tab.
//
// Note on Google's tiers: drive.readonly and calendar.readonly are SENSITIVE
// scopes; gmail.readonly is RESTRICTED, which is a higher bar. In Testing mode
// all three work for listed test users without Google verification — that is
// the right posture for four owners and one house.
const TG_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
];
const TG_DRIVE_SCOPE = TG_GOOGLE_SCOPES[0];   // kept for older call sites

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

// ──────────────────────────────────────────────────────────────
//  The house links — one list, three consumers
// ──────────────────────────────────────────────────────────────
//  Same reasoning as TG_SOUNDTRACK above, and it should have been done
//  here from the start. The Instagram URL used to exist three times —
//  hardcoded in the guest footer, hardcoded again in the owner Portals
//  tab, and written in the Google Doc — and in none of the places an
//  agent could read. So Sisay answered "I don't have the house's
//  Instagram handle" on a page whose own footer was rendering it.
//
//  Every consumer now reads THIS list: the guest footer, the owner
//  Portals grid, Sisay's house manual and Hanna's get_house_info.
//  Add a link here and all four follow. Add it anywhere else and you
//  have recreated the bug.
//
//  `guest: true` marks what a guest may be told. Owner-only entries
//  (host dashboard, cameras, Drive) never reach Sisay — she filters on
//  this flag, she is not trusted to judge it.
//
//  URLs and public handles only. Passwords — the mailbox password, the
//  WiFi key, camera credentials — live in the Vault (gathering/secrets)
//  and never in this file: the repo is public.
// ──────────────────────────────────────────────────────────────
const TG_HOUSE_LINKS = [
  { id:'instagram', guest:true,  icon:'📸', title:'Instagram',
    url:'https://www.instagram.com/thegatheringsilveira/',
    handle:'@thegatheringsilveira',
    desc:'The house on Instagram — @thegatheringsilveira' },
  { id:'airbnb', guest:true,  icon:'🏡', title:'Airbnb Listing',
    url:'https://www.airbnb.com/rooms/1608023407293236428',
    desc:'The public listing — this is the one to share and to book through' },
  { id:'site', guest:true,  icon:'🌊', title:'House Site',
    url:'https://fefoabreu.me/TheGathering/',
    desc:'TheGathering Silveira — the house’s own site' },
  { id:'email', guest:true,  icon:'✉️', title:'House Email',
    url:'mailto:TheGatheringSilveira@gmail.com',
    handle:'TheGatheringSilveira@gmail.com',
    desc:'TheGatheringSilveira@gmail.com' },
  { id:'maps', guest:true,  icon:'📍', title:'Google Maps',
    url:'https://maps.google.com/?q=Rua+Augusto+Germano+Wilke,+Praia+da+Silveira,+Garopaba+SC+88490-000',
    desc:'Rua Augusto Germano Wilke, s/n° — Praia da Silveira, Garopaba SC 88490-000' },
  { id:'plans', guest:true,  icon:'📐', title:'Interior Plans (PDF)',
    url:'https://drive.google.com/file/d/1DgvXtR9ICB9rTatGpDKlddUYYSA9RGgN/view',
    desc:'Architectural layouts — all 5 suites' },
  { id:'airbnb-host', guest:false, icon:'🔑', title:'Airbnb Host Dashboard',
    url:'https://www.airbnb.com/hosting/listings',
    desc:'Manage listings, messages and reservations' },
  { id:'eufy', guest:false, icon:'📷', title:'Eufy Security Cameras',
    url:'https://mysecurity.eufylife.com/#/camera',
    desc:'Live camera access — mysecurity.eufylife.com' },
  { id:'drive', guest:false, icon:'📁', title:'Google Drive',
    url:'https://drive.google.com/drive/folders/1Q3Wo8OoiDPC_hls-2cgRextAZueU3gIV',
    desc:'All house documents, photos and plans' },
];

/** The links a guest may be given. Sisay reads only this. */
function tgGuestLinks() { return TG_HOUSE_LINKS.filter(l => l.guest); }

// The house's own address, in one place for the same reason.
const TG_HOUSE_ADDRESS = 'Rua Augusto Germano Wilke, s/n° · Praia da Silveira, Garopaba SC 88490-000';


// ──────────────────────────────────────────────────────────────
//  The Rainy Day Matrix
// ──────────────────────────────────────────────────────────────
//  Asked what to do on a wet day, Sisay used to answer that her guide is
//  "focada em comida, praia e aventura" — accurate, and useless. The guide
//  cards cover coffee, burgers, sushi, surf and sandboarding; not one of
//  them is indoors. Her hands were not tied by judgement, they were tied by
//  data, exactly as with the Instagram handle.
//
//  These live here rather than in her system prompt on purpose: a prompt is
//  not a database, and the owners should be able to correct an opening time
//  without anyone editing an agent's personality. Reached through
//  get_rainy_day_options.
//
//  HOURS AND PRICES GO STALE. Every entry carries `verified` and, where a
//  detail could not be confirmed, says so in plain words. Sisay is told to
//  pass that uncertainty on rather than smoothing it over — sending a family
//  forty minutes through the rain to a closed door is the one unforgivable
//  failure here.
// ──────────────────────────────────────────────────────────────
const TG_RAINY_DAY = [
  {
    id: 'baleia-franca',
    kind: 'museum',
    name: 'Centro Nacional de Conservação da Baleia Franca (Espaço Australis)',
    where: 'Av. Atlântica s/n, Itapirubá Norte, Imbituba',
    driveApprox: '44 minutes, 41 km',
    what: 'Run by Instituto Australis. The Espaço Australis annex holds a complete 13.95 m '
        + 'adult right whale skeleton. Guided visits, a deck with a telescope for whale watching.',
    whyRainy: 'Indoors, free, and reviewers single out how well the guided tour lands with '
            + 'children. The strongest rainy-morning answer near the house.',
    cardCopy: 'A complete 13.95 m right whale skeleton, indoors, with guided visits and a '
            + 'telescope deck for spotting the real thing offshore. Free, and it lands well with children.',
    hours: 'Tuesday to Saturday, 09:00–12:00 and 14:00–17:00. CLOSED Sunday and Monday.',
    price: 'Free.',
    booking: 'Families can walk in. Groups of 10 or more must book 72h ahead.',
    phone: '+55 48 99127-8961',
    maps: 'https://maps.google.com/?q=Centro+Nacional+de+Conservacao+da+Baleia+Franca+Itapiruba+Imbituba',
    chips: [
      { label: 'How do we get there?', send: 'How do we get to the Centro Nacional da Baleia Franca in Itapirubá?' },
      { label: 'Opening hours',        send: 'When is the Centro Nacional da Baleia Franca open?' },
      { label: 'The other whale museum', send: 'Tell me about the other whale museum in Imbituba.' },
      { label: 'We would rather stay in', send: 'We would rather stay at the house — set up a movie day.' },
    ],
    verified: 'Hours and free entry confirmed 2026-08-31 against the official site '
            + '(baleiafranca.org.br) AND Google Maps, which agree exactly. September is Mês da '
            + 'Baleia Franca with special programming — worth a call before going.',
  },
  {
    id: 'museu-baleia',
    kind: 'museum',
    name: 'Museu da Baleia de Imbituba (Barracão Manoel Rosa)',
    where: 'Rua Itagiba s/n, Praia do Porto, Imbituba',
    driveApprox: '40 minutes, 30 km',
    what: 'The municipal museum, in a restored 1973 whaling station — whale bones, the old '
        + 'ovens, harpoons. Staff give informal tours. Run by the Prefeitura, not by Australis.',
    whyRainy: 'Indoors and free, and closer than Itapirubá.',
    cardCopy: 'The municipal museum inside a restored 1973 whaling station — bones, the old '
            + 'ovens, harpoons. Small and worn, but free, indoors and closer than Itapirubá.',
    caution: 'Small and visibly tired — recent reviews say the panels are worn and there is '
           + 'little information. Good for 45 minutes, thin as the whole outing. The subject is '
           + 'the whaling slaughter, which is heavy going for young children.',
    hours: 'Wednesday to Friday 08:00–12:00 and 13:00–17:00; Saturday, Sunday and holidays '
         + '09:00–17:00. CLOSED Monday and Tuesday.',
    price: 'Free.',
    phone: '(48) 3255-0268',
    maps: 'https://maps.google.com/?q=Museu+da+Baleia+de+Imbituba+Praia+do+Porto',
    chips: [
      { label: 'How do we get there?', send: 'How do we get to the Museu da Baleia in Imbituba?' },
      { label: 'Opening hours',        send: 'When is the Museu da Baleia de Imbituba open?' },
      { label: 'The one with the skeleton', send: 'Tell me about the Centro Nacional da Baleia Franca instead.' },
      { label: 'We would rather stay in', send: 'We would rather stay at the house — set up a movie day.' },
    ],
    verified: 'Hours and free entry confirmed 2026-08-31 by two independent sources — Notisul '
            + '(Feb 2026) and Google Maps. NOTE: this is NOT where the big skeleton is; that is '
            + 'at Itapirubá. One local news article confuses the two — do not repeat that.',
  },
  {
    id: 'cinema',
    kind: 'in-house',
    name: 'Cinema Mode, at the house',
    where: 'Here — no drive, no weather',
    what: 'The deck projector or the 75" Frame TV in the living room, with the Sonos '
        + 'carrying the sound through living room, kitchen and deck.',
    whyRainy: 'The best answer when nobody wants to get in a car. Rain on the hillside '
            + 'with the projector going is genuinely one of the better evenings here.',
    steps: [
      'Deck projector: power it on, then select the HDMI input.',
      'Send the sound to the Sonos rather than the projector\u2019s own speaker — it is not close.',
      'Indoors instead: the Samsung Frame TV, 75", in the living room. Input runs through '
        + 'the One Connect box behind the panel.',
      'The Frame sits in Art Mode when idle — one press of the remote\u2019s power button '
        + 'wakes it to TV rather than turning it off.',
      'Sonos: open the app on the guest WiFi, pick the rooms you want grouped, then AirPlay '
        + 'or Spotify Connect to them.',
      'If the pool heating was arranged before arrival, a heated pool in light rain is its own '
        + 'kind of good — the deck is covered enough to get back inside dry.',
    ],
    chips: [
      { label: 'How do I use the projector?', send: 'Walk me through the deck projector step by step.' },
      { label: 'Sound through the house',      send: 'How do I get the sound onto the Sonos in every room?' },
      { label: 'Something to watch',            send: 'What should we watch tonight?' },
      { label: 'Actually, we would go out',    send: 'We would rather go out — what is open in the rain?' },
    ],
    verified: 'From the house manual. The kit is the house\u2019s own, so this does not go stale.',
  },
];

/** Rainy-day options, optionally filtered by kind. */
function tgRainyDay(kind) {
  return kind ? TG_RAINY_DAY.filter(o => o.kind === kind) : TG_RAINY_DAY;
}

/*  The same venues, shaped as guide cards for the public deck.
 *
 *  DERIVED, not duplicated. Writing these out a second time as card literals
 *  is how the Instagram bug happened: two copies, one of them quietly wrong.
 *  Hours and prices here are research-backed with dated sources, so they are
 *  exactly the thing that must not drift. Edit TG_RAINY_DAY and the card,
 *  the concierge and the deck all move together.
 *
 *  Cinema Mode is excluded — the deck is places in Garopaba, and the house
 *  is not somewhere a guest travels to.
 */
/*  Hours and prices for someone else's business go stale, and no amount of
 *  research fixes that permanently. Rather than chase them, every surface
 *  that states an opening time carries the same short caveat, so the guest
 *  knows the authority is the establishment, not us. One constant, so the
 *  wording cannot drift between the card and the concierge.
 */
const TG_HOURS_CAVEAT = {
  en: 'Worth calling ahead to confirm.',
  pt: 'Vale ligar antes para confirmar.',
};

const TG_RAINY_CARD_STYLE = {
  'baleia-franca': { emoji: '🐋', color: 'blue',
    flavor: '"Fourteen metres of right whale, and not a drop of rain on you."' },
  'museu-baleia':  { emoji: '🏛️', color: 'blue',
    flavor: '"The old whaling station, kept as a reminder."' },
};

function tgRainyGuideCards() {
  return TG_RAINY_DAY.filter(o => o.kind !== 'in-house').map((o, i) => {
    const style = TG_RAINY_CARD_STYLE[o.id] || { emoji: '🌧️', color: 'blue', flavor: '' };
    /*  Deck copy, not concierge copy. Concatenating what + whyRainy + hours +
        caution produced a 500-character card next to 145-character neighbours.
        `cardCopy` is written for the deck; the caution and the pitch stay in
        the data for Sisay to deliver in conversation, where they belong. */
    const bits = [o.cardCopy || o.what];
    if (o.hours) bits.push(o.hours);
    if (o.price) bits.push('Entry: ' + o.price);
    // Anything with a stated opening time carries the caveat.
    if (o.hours || o.price) bits.push(TG_HOURS_CAVEAT.en);
    return {
      id: 'rainy-' + o.id,
      name: o.name,
      category: 'rainy-day',
      categoryLabel: 'Rainy Day · Indoors',
      emoji: style.emoji,
      color: style.color,
      description: bits.join(' '),
      address: o.where + (o.driveApprox ? ' — ' + o.driveApprox : ''),
      tags: ['rainy-day', 'indoor', 'family', 'museum'],
      flavor: style.flavor,
      active: true,
      order: 100 + i,          // after the curated deck, never displacing it
      rarity: 'rare',
      link: o.maps,
      phone: o.phone || '',
    };
  });
}
