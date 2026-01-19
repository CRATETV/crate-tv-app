
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const { uid, rokuLinkCode } = await request.json();

    if (!uid || !rokuLinkCode) {
      return new Response(JSON.stringify({ error: 'Identity and ShortCode required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);
    
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
        return new Response(JSON.stringify({ error: 'Voucher code invalid or expired.' }), {
            status: 404, headers: { 'Content-Type': 'application/json' }
        });
    }

    const codeDoc = codeQuery.docs[0];
    const codeData = codeDoc.data();
    const { deviceId } = codeData;

    const batch = db.batch();

    // 1. Link hardware ID to user document
    const userRef = db.collection('users').doc(uid);
    batch.update(userRef, { rokuDeviceId: deviceId });

    // 2. Create the permanent link record that the poll-auth hub watches
    const linkRef = db.collection('roku_links').doc(deviceId);
    batch.set(linkRef, { 
        userId: uid,
        linkedAt: FieldValue.serverTimestamp(),
        status: 'VERIFIED'
    });

    // 3. Purge the temporary one-time shortcode
    batch.delete(codeDoc.ref);

    await batch.commit();

    return new Response(JSON.stringify({ success: true, message: 'Handshake successful. Device authorized.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("[Linking Process Failure]:", error);
    return new Response(JSON.stringify({ error: "System rejected the handshake protocol." }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
