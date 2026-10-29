import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { BINS } from './_lib/watchStats.js';

// Where do viewers watch and where do they stop? (Oct 29 2026)
// The film page reports "started", each tenth of the film it naturally watches
// (0-9) and "finished" (95%+). Counted on one of 10 random shard documents per
// film so a busy premiere never queues on a single Firestore document.
// No account needed and nothing personal is stored, just counts.
//
// Body: { movieKey, episode?: 1-based number, event: 'start' | 'bin' | 'fin', bin?: 0-9 }
const SHARDS = 10;

export async function POST(request: Request) {
    const ok = () => new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    try {
        // A full film is about 14 reports; allow a few films in a sitting.
        if (!rateLimit(`track-watch:${getIP(request)}`, 240, 10 * 60_000)) return ok();
        const body = await request.json().catch(() => ({}));
        const key = typeof body.movieKey === 'string' ? body.movieKey.trim() : '';
        if (!key || key.length > 200 || /[.\/\[\]*`~#]/.test(key)) return new Response(JSON.stringify({ error: 'Invalid film.' }), { status: 400 });
        const ep = Number.isInteger(body.episode) && body.episode >= 1 && body.episode <= 500 ? body.episode : 0;
        const event = body.event;
        let field: string;
        if (event === 'start') field = 'starts';
        else if (event === 'fin') field = 'fin';
        else if (event === 'bin' && Number.isInteger(body.bin) && body.bin >= 0 && body.bin < BINS) field = `d${body.bin}`;
        else return new Response(JSON.stringify({ error: 'Invalid event.' }), { status: 400 });

        const initError = getInitializationError();
        if (initError) return ok();
        const db = getAdminDb();
        if (!db) return ok();

        // Only films that exist (so strangers can't fill the database with made-up names).
        const exists = await db.collection('movies').doc(key).get();
        if (!exists.exists) return new Response(JSON.stringify({ error: 'Unknown film.' }), { status: 404 });

        const docId = ep ? `${key}__e${ep}` : key;
        const shard = Math.floor(Math.random() * SHARDS);
        await db.collection('film_watch').doc(docId).collection('shards').doc(String(shard)).set(
            { [field]: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
            { merge: true },
        );
        return ok();
    } catch (error) {
        console.error('Error tracking watch:', error);
        return ok(); // never bother the viewer
    }
}
