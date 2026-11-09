// Lobby poll endpoint (Nov 2026).
//
//   POST { action:'set',    password, movieKey, question, options }   host starts a poll
//   POST { action:'tally',  password, movieKey }                       host sees live counts
//   POST { action:'reveal', password, movieKey }                       host closes voting + shows results to everyone
//   POST { action:'clear',  password, movieKey }                       host removes the poll
//   POST { action:'vote',   idToken, movieKey, option }                a signed-in viewer votes (one vote each, changeable while open)
//
// The poll lives on watch_parties/{movieKey}.poll (viewers already listen to that
// doc). Votes live in watch_parties/{movieKey}/poll_votes/{uid} and are written
// only here — the database rules keep browsers from writing to watch parties.
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { canUseTab } from './_lib/adminAuth.js';
import { rateLimit, getIP } from './_lib/rateLimit.js';
import { cleanPollInput, voteProblem, tally } from './_lib/watchPartyPoll.js';

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const action = String(body.action || '');
        const movieKey = String(body.movieKey || '').trim();
        if (!movieKey || movieKey.includes('/')) return json({ error: 'Party identification required.' }, 400);

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('Database offline.');
        const partyRef = db.collection('watch_parties').doc(movieKey);

        // ── Viewer vote ──
        if (action === 'vote') {
            if (!rateLimit(`poll-vote:${getIP(request) || 'unknown'}`, 30, 60_000)) return json({ error: 'Too many tries. Wait a moment.' }, 429);
            const auth = getAdminAuth();
            if (!auth) throw new Error('Auth offline.');
            let uid = '';
            try { uid = (await auth.verifyIdToken(String(body.idToken || ''))).uid; }
            catch { return json({ error: 'Sign in to vote.' }, 401); }

            const poll = (await partyRef.get()).data()?.poll;
            const problem = voteProblem(poll, body.option);
            if (problem) return json({ error: problem }, 400);
            await partyRef.collection('poll_votes').doc(uid).set({ pollId: poll.id, option: body.option, at: FieldValue.serverTimestamp() });
            return json({ success: true });
        }

        // ── Host actions ──
        if (!(await canUseTab(body.password, ['watchParty']))) return json({ error: 'Unauthorized' }, 401);

        if (action === 'set') {
            const clean = cleanPollInput(body.question, body.options);
            if (!clean.ok) return json({ error: clean.error }, 400);
            const poll = { id: Date.now().toString(36), question: clean.question, options: clean.options, status: 'open', showResults: false };
            await partyRef.set({ poll }, { merge: true });
            return json({ success: true, poll });
        }

        const current = (await partyRef.get()).data()?.poll;

        if (action === 'tally' || action === 'reveal') {
            if (!current?.id) return json({ error: 'There is no poll right now.' }, 400);
            const votes = (await partyRef.collection('poll_votes').get()).docs.map(d => d.data());
            const counts = tally(votes, current.id, current.options.length);
            if (action === 'reveal') {
                await partyRef.set({ poll: { ...current, status: 'closed', showResults: true, results: counts } }, { merge: true });
            }
            return json({ success: true, counts, total: counts.reduce((s, c) => s + c, 0) });
        }

        if (action === 'clear') {
            await partyRef.update({ poll: FieldValue.delete() });
            return json({ success: true });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (e) {
        console.error('[watch-party-poll]', e);
        return json({ error: (e as Error).message || 'Poll failed.' }, 500);
    }
}
