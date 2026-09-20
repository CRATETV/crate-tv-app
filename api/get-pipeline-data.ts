import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { verifyAdminPassword } from './_lib/adminAuth.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const toMillis = (ts: any): number => {
    if (!ts) return 0;
    if (typeof ts.toMillis === 'function') return ts.toMillis();
    if (typeof ts._seconds === 'number') return ts._seconds * 1000;
    return 0;
};

// Filmmaker-portal entries use submittedAt; manual/legacy entries only have
// submissionDate or createdAt.
const entryTime = (entry: any): number =>
    toMillis(entry.submittedAt) || toMillis(entry.submissionDate) || toMillis(entry.createdAt);

export async function POST(request: Request) {
    try {
        const { password, latestOnly } = await request.json();

        if (!(await verifyAdminPassword(password))) {
            return json({ error: 'Unauthorized' }, 401);
        }

        const initError = getInitializationError();
        if (initError) {
            // Return 200 with a warning payload to prevent fetch failures in the UI
            return json({ pipeline: [], latestId: null, warning: initError });
        }

        const db = getAdminDb();
        if (!db) {
            return json({ pipeline: [], latestId: null, warning: "Database connection unavailable." });
        }

        // Cheap "has anything new arrived?" check for the admin panel's poller:
        // one document read instead of the whole collection.
        if (latestOnly) {
            const latest = await db.collection('movie_pipeline').orderBy('submittedAt', 'desc').limit(1).get();
            return json({ latestId: latest.docs[0]?.id ?? null });
        }

        // Read from movie_pipeline — this is where submit-film-to-pipeline.ts writes.
        // Sorted in memory rather than with orderBy('submittedAt'), because Firestore
        // silently drops any document that lacks the ordered field — which used to
        // hide every manually-added entry (those only had submissionDate).
        const snapshot = await db.collection('movie_pipeline').get();
        const pipeline = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => entryTime(b) - entryTime(a));

        return json({ pipeline });

    } catch (error) {
        console.error("Pipeline fetch error:", error);
        return json({ error: (error as Error).message }, 500);
    }
}
