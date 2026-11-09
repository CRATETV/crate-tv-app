// Path: /api/roku-save-progress
// Roku -> phone/web: the channel reports where a linked viewer stopped, so the phone can pick up there.
// Same trust level as roku-mark-watched: the device id must be linked to an account. It only ever writes
// one whole number (seconds) into that account's playbackProgress.
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { cleanProgress } from './_lib/rokuResume.js';

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

export async function POST(request: Request) {
    try {
        const form = await request.formData();
        const deviceId = String(form.get('deviceId') || '');
        const movieKey = String(form.get('movieKey') || '').trim();
        const seconds = cleanProgress(form.get('seconds'));
        if (!deviceId || !movieKey || movieKey.length > 200 || /[.\/\[\]*`~#]/.test(movieKey) || seconds === null) return json({ error: 'Invalid progress.' }, 400);

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database connection failed.');

        const link = (await db.collection('roku_links').doc(deviceId).get()).data();
        if (!link?.userId) return json({ success: true, message: 'Device not linked, not saved.' });
        await db.collection('users').doc(link.userId).set({ playbackProgress: { [movieKey]: seconds } }, { merge: true });
        return json({ success: true });
    } catch (e) {
        console.error('roku-save-progress error:', e);
        return json({ error: 'Could not save progress.' }, 500);
    }
}
