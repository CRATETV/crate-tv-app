// ops/sanitize-public-data.cjs
//
// ONE-TIME clean-up after the October 2026 security update. Run it once,
// right after deploying the new code and Firestore rules.
//
//   1. data/movies (readable by anyone) used to hold each film's FULL record,
//      including the raw video file link. This trims every entry down to
//      the four public watch-party fields.
//   2. watch_parties/{id} (readable by anyone) held the director backstage
//      key. This moves any existing key to watch_party_secrets/{id}
//      (server-only) and removes it from the public record.
//
// Usage (from the project folder):
//   node ops/sanitize-public-data.cjs            ← dry run, changes nothing
//   node ops/sanitize-public-data.cjs --apply    ← actually writes
//
// Credentials: set GOOGLE_APPLICATION_CREDENTIALS to the path of your NEW
// service-account key (keep it outside the project folder), e.g.
//   export GOOGLE_APPLICATION_CREDENTIALS=~/keys/crate-firebase-admin.json

const admin = require('firebase-admin');

const APPLY = process.argv.includes('--apply');
const PUBLIC_FIELDS = ['isWatchPartyEnabled', 'watchPartyStartTime', 'isWatchPartyPaid', 'watchPartyPrice'];

function init() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    // Fallback for the old setup — a key file next to the project.
    admin.initializeApp({ credential: admin.credential.cert(require('../service-account.json')) });
  }
  return admin.firestore();
}

async function main() {
  const db = init();
  console.log(APPLY ? '*** APPLY MODE — writing changes ***' : 'Dry run — nothing will be written. Add --apply to write.');

  // 1. data/movies
  const ref = db.collection('data').doc('movies');
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const cleaned = {};
  let removedFields = 0, withLinks = 0;
  for (const [key, entry] of Object.entries(data || {})) {
    if (!entry || typeof entry !== 'object') continue;
    const keep = {};
    for (const f of PUBLIC_FIELDS) if (f in entry) keep[f] = entry[f];
    removedFields += Object.keys(entry).length - Object.keys(keep).length;
    if (entry.fullMovie) withLinks++;
    cleaned[key] = keep;
  }
  console.log(`data/movies: ${Object.keys(cleaned).length} films, ${withLinks} exposed video links, ${removedFields} fields to remove.`);
  if (APPLY) {
    await ref.set(cleaned); // full overwrite (not merge) so old fields are really gone
    console.log('  ✓ data/movies trimmed.');
  }

  // 2. backstage keys
  const parties = await db.collection('watch_parties').get();
  let moved = 0;
  for (const doc of parties.docs) {
    const key = doc.data().backstageKey;
    if (!key) continue;
    moved++;
    if (APPLY) {
      if (doc.data().status === 'live') {
        await db.collection('watch_party_secrets').doc(doc.id).set({ backstageKey: key, updatedAt: new Date().toISOString() }, { merge: true });
      }
      await doc.ref.update({ backstageKey: null });
    }
  }
  console.log(`watch_parties: ${moved} public backstage key(s) ${APPLY ? 'moved/cleared' : 'to move/clear'}.`);
  console.log('Done.');
}

main().catch(e => { console.error(e); process.exit(1); });
