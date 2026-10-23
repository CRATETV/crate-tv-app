// api/unlock-watch-party.ts
//
// FIX for the bug found overnight (Aug 21-22, 2026): unlockWatchParty()
// in AuthContext.tsx only ever updated LOCAL browser state — it never
// saved anything to Firestore. unlockedWatchPartyKeys is a protected
// field (client writes correctly blocked by firestore.rules), so the
// "unlock" looked like it worked in the moment, but nothing persisted.
// The instant a viewer refreshed, switched devices, or their session
// reloaded, the app checked the real database, found nothing, and
// locked them back out — exactly what happened to Donna and Sa during
// tonight's Tino watch party.
//
// This endpoint does the real, persisted grant, server-side, using the
// Admin SDK (which bypasses the client-facing security rules by
// design) — same pattern already used in process-square-payment.ts.
//
// It only saves a ticket when the playback rules (api/_lib/entitlements.ts)
// already let this person into the party: a free party, a festival pass for
// a festival block, or a block ticket. A current rental is honored but never
// turned into a permanent ticket.
// This prevents someone from calling the endpoint directly to grant
// themselves free access to a paid block.

import admin from 'firebase-admin';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { resolveMovieAccess } from './_lib/entitlements.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const initError = getInitializationError();
  if (initError) {
    return res.status(500).json({ error: 'Server not configured correctly' });
  }

  const { movieKey } = req.body || {};
  if (!movieKey || typeof movieKey !== 'string') {
    return res.status(400).json({ error: 'movieKey is required' });
  }

  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const db = getAdminDb();
  if (!db) {
    return res.status(500).json({ error: 'Database not available' });
  }

  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = userSnap.data() || {};

    // Already unlocked — nothing to do, respond success (idempotent).
    const alreadyUnlocked: string[] = userData.unlockedWatchPartyKeys || [];
    if (alreadyUnlocked.includes(movieKey)) {
      return res.status(200).json({ ok: true, alreadyUnlocked: true });
    }

    // Same rules as playback (api/_lib/entitlements.ts). This used to save a
    // permanent ticket for ANY party to anyone with a festival pass, or with
    // any rental of the film ever, even an expired one (fixed Oct 23 2026).
    const rentalExp = userData.rentals?.[movieKey];
    if (rentalExp && new Date(rentalExp) > new Date()) {
      // A current rental already lets them in; don't turn it into a
      // permanent ticket.
      return res.status(200).json({ ok: true, viaRental: true });
    }
    const access = await resolveMovieAccess(db, { uid, movieKey, mode: 'live' });
    if (!access.granted) {
      return res.status(403).json({ error: 'No valid access found for this watch party' });
    }

    const newUnlocked = [...alreadyUnlocked, movieKey];
    await userRef.update({ unlockedWatchPartyKeys: newUnlocked });

    return res.status(200).json({ ok: true, unlockedWatchPartyKeys: newUnlocked });
  } catch (e: any) {
    console.error('[unlock-watch-party] Failed:', e);
    return res.status(500).json({ error: 'Failed to unlock watch party' });
  }
}
