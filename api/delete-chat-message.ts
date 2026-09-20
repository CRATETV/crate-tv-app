import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';
import { FieldValue } from 'firebase-admin/firestore';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

// Firestore document ids only — anything with a "/" would point at a different path.
const SAFE_ID = /^[A-Za-z0-9._-]{1,200}$/;

/** Deletes one chat message from a watch party. */
export async function POST(request: Request) {
  try {
    const { movieKey, messageId, adminPassword } = await request.json();

    if (!movieKey || !messageId || !adminPassword) {
      return json({ error: 'MovieKey, messageId, and Password required.' }, 400);
    }

    // Any valid admin key may moderate chat — the two main passwords, ADMIN_PASSWORD_*
    // keys and collaborator keys. This used to accept only the first two, so anyone
    // signed in with another kind of key got "Invalid admin password" on every delete.
    if (!(await verifyAdminPassword(adminPassword))) {
      return json({ error: 'Invalid admin password.' }, 401);
    }
    if (!SAFE_ID.test(String(movieKey)) || !SAFE_ID.test(String(messageId))) {
      return json({ error: 'Invalid movieKey or messageId.' }, 400);
    }

    const initError = getInitializationError();
    if (initError) throw new Error(initError);

    const db = getAdminDb();
    if (!db) throw new Error("Database connection failed");

    const messageRef = db.collection('watch_parties').doc(movieKey).collection('messages').doc(messageId);
    const snap = await messageRef.get();

    if (!snap.exists) {
      return json({ success: true, message: 'Message already gone.' });
    }

    const removed = snap.data() || {};
    await messageRef.delete();

    // Moderation trail: who said what, and that an admin removed it.
    await db.collection('audit_logs').add({
      action: 'CHAT_MESSAGE_DELETED',
      type: 'MUTATION',
      role: 'admin',
      details: `Removed a chat message by ${String(removed.userName || 'unknown').slice(0, 80)} in watch party "${movieKey}": "${String(removed.text || '').slice(0, 120)}"`,
      timestamp: FieldValue.serverTimestamp(),
      ip: '',
      metadata: { movieKey, messageId, userId: removed.userId || null },
    }).catch(err => console.warn('audit log for chat delete failed:', err));

    return json({ success: true });
  } catch (error) {
    console.error('Delete Chat Message Error:', error);
    return json({ error: (error as Error).message }, 500);
  }
}
