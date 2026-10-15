
// api/link-roku-account.ts
//
// Links a Roku to the signed-in viewer's Crate account. The TV shows a
// 6-character code (api/get-roku-link-code); the viewer enters it, or scans
// the QR code, at cratetv.net/link. The Roku then sees the link via
// api/roku/poll-auth and its catalogue unlocks what the account owns.
//
// SECURITY (Oct 2026): the account is taken from the viewer's verified sign-in
// token, not from an id the browser sends. Before, anyone who knew another
// person's account id could have linked a Roku to that account.

import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

const json = (data: unknown, status: number) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request) {
  try {
    const { idToken, rokuLinkCode } = await request.json();

    if (!idToken) return json({ error: 'Please sign in to link your Roku.' }, 401);
    if (!rokuLinkCode) return json({ error: 'Enter the code shown on your TV.' }, 400);

    const initError = getInitializationError();
    if (initError) throw new Error(initError);

    let uid: string;
    try {
        uid = (await getAdminAuth()!.verifyIdToken(String(idToken))).uid;
    } catch {
        return json({ error: 'Your sign-in has expired. Please sign in again.' }, 401);
    }
    
    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed.");
    
    // Normalize shortCode (e.g. ABC-123)
    const sanitizedCode = rokuLinkCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formattedCode = sanitizedCode.length === 6 
        ? `${sanitizedCode.slice(0, 3)}-${sanitizedCode.slice(3)}`
        : sanitizedCode;

    // Locate the temporary code that maps to a specific Device Hardware ID
    const codeQuery = await db.collection('roku_codes')
        .where('code', 'in', [formattedCode, sanitizedCode])
        .limit(1)
        .get();
    
    if (codeQuery.empty) {
        return json({ error: "That code didn't work. It may have expired: check the code on your TV (it refreshes) and try again." }, 404);
    }

    const codeDoc = codeQuery.docs[0];
    const codeData = codeDoc.data();
    const { deviceId } = codeData;

    // Fetch user profile info to store with the link
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    const displayName = userData?.displayName || userData?.name || 'Crate TV User';
    const avatarUrl = userData?.avatarUrl || userData?.photoURL || '';

    const batch = db.batch();

    // 1. Link hardware ID to user document
    const userRef = db.collection('users').doc(uid);
    batch.update(userRef, { rokuDeviceId: deviceId });

    // 2. Create the permanent link record that the poll-auth hub watches
    const linkRef = db.collection('roku_links').doc(deviceId);
    batch.set(linkRef, { 
        userId: uid,
        displayName: displayName,
        avatarUrl: avatarUrl,
        linkedAt: FieldValue.serverTimestamp(),
        status: 'VERIFIED'
    });

    // 3. Purge the temporary one-time shortcode
    batch.delete(codeDoc.ref);

    await batch.commit();

    return json({ success: true, message: 'Your Roku is linked. It will update by itself in a few seconds.' }, 200);

  } catch (error) {
    console.error("[Linking Process Failure]:", error);
    return json({ error: 'Something went wrong linking your Roku. Please try again.' }, 500);
  }
}
