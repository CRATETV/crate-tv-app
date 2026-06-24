import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { createSign } from 'crypto';

function getSignedUrl(rawUrl: string): string {
    const cfDomain = process.env.CLOUDFRONT_DOMAIN || 'd3jhtrl1gnrh4b.cloudfront.net';
    const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
    const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const expiry = Math.floor(Date.now() / 1000) + 14400;
    let cfUrl = rawUrl;
    try { const u = new URL(rawUrl); cfUrl = `https://${cfDomain}${u.pathname}`; } catch {}
    if (!keyPairId || !privateKey) return cfUrl;
    const policy = JSON.stringify({ Statement: [{ Resource: cfUrl, Condition: { DateLessThan: { 'AWS:EpochTime': expiry } } }] });
    const sign = createSign('RSA-SHA1');
    sign.update(policy);
    const sig = sign.sign(privateKey, 'base64').replace(/\+/g,'-').replace(/=/g,'_').replace(/\//g,'~');
    const pol = Buffer.from(policy).toString('base64').replace(/\+/g,'-').replace(/=/g,'_').replace(/\//g,'~');
    return `${cfUrl}?Policy=${pol}&Signature=${sig}&Key-Pair-Id=${keyPairId}`;
}

export async function POST(request: Request) {
    try {
        const { movieKey, blockId, idToken } = await request.json();
        if (!idToken) return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: {'Content-Type':'application/json'} });
        const auth = getAdminAuth();
        const db = getAdminDb();
        if (!auth || !db) return new Response(JSON.stringify({ error: 'Service unavailable.' }), { status: 503, headers: {'Content-Type':'application/json'} });
        let uid: string;
        try { uid = (await auth.verifyIdToken(idToken)).uid; }
        catch { return new Response(JSON.stringify({ error: 'Invalid session.' }), { status: 401, headers: {'Content-Type':'application/json'} }); }
        const userData = (await db.collection('users').doc(uid).get()).data() || {};
        let hasAccess = false;
        const now = new Date();
        if (userData.hasFestivalAllAccess) hasAccess = true;
        if (!hasAccess && blockId) {
            const exp = (userData.unlockedBlocks || {})[blockId];
            if (exp && new Date(exp) > now) hasAccess = true;
        }
        if (!hasAccess && movieKey) {
            const rental = (userData.rentals || {})[movieKey];
            if (rental && new Date(rental) > now) hasAccess = true;
        }
        if (!hasAccess && blockId) {
            const snap = await db.collection('festival_tickets').where('uid','==',uid).where('itemId','==',blockId).limit(1).get();
            if (!snap.empty) hasAccess = true;
        }
        if (!hasAccess && blockId) {
            const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
            for (const d of daysSnap.docs) {
                const block = d.data().blocks?.find((b: any) => b.id === blockId);
                if (block && (!block.price || block.price === 0)) { hasAccess = true; break; }
            }
        }
        if (!hasAccess) return new Response(JSON.stringify({ error: 'Access denied.' }), { status: 403, headers: {'Content-Type':'application/json'} });
        const { getApiData } = await import('./_lib/data.js');
        const data = await getApiData({ noCache: false });
        let rawUrl: string | null = null;
        if (movieKey && data.movies?.[movieKey]?.fullMovie) rawUrl = data.movies[movieKey].fullMovie;
        if (!rawUrl && blockId) {
            outer: for (const day of (data.festivalData || [])) {
                for (const block of (day.blocks || [])) {
                    if (block.id === blockId) {
                        for (const key of (block.movieKeys || [])) {
                            if (data.movies?.[key]?.fullMovie) { rawUrl = data.movies[key].fullMovie; break outer; }
                        }
                    }
                }
            }
        }
        if (!rawUrl) return new Response(JSON.stringify({ error: 'Film not found.' }), { status: 404, headers: {'Content-Type':'application/json'} });
        return new Response(JSON.stringify({ url: getSignedUrl(rawUrl), expiresAt: new Date(Date.now()+14400000).toISOString() }), {
            status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    } catch (e) {
        return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500, headers: {'Content-Type':'application/json'} });
    }
}
