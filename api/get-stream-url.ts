import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { createSign } from 'crypto';

function getSignedCloudFrontUrl(rawUrl: string): string {
    const cfDomain = process.env.CLOUDFRONT_DOMAIN || 'd3jhtrl1gnrh4b.cloudfront.net';
    const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
    const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const expiry = Math.floor(Date.now() / 1000) + 14400;

    let cfUrl = rawUrl;
    try {
        const urlObj = new URL(rawUrl);
        cfUrl = `https://${cfDomain}${urlObj.pathname}`;
    } catch { cfUrl = rawUrl; }

    if (!keyPairId || !privateKey) return cfUrl;

    const policy = JSON.stringify({ Statement: [{ Resource: cfUrl, Condition: { DateLessThan: { 'AWS:EpochTime': expiry } } }] });
    const sign = createSign('RSA-SHA1');
    sign.update(policy);
    const signature = sign.sign(privateKey, 'base64').replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~');
    const policyB64 = Buffer.from(policy).toString('base64').replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~');
    return `${cfUrl}?Policy=${policyB64}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { movieKey, blockId, idToken } = body;

        if (!idToken) return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401 });

        const initError = getInitializationError();
        if (initError) return new Response(JSON.stringify({ error: 'Service unavailable.' }), { status: 503 });

        const auth = getAdminAuth();
        const db = getAdminDb();
        if (!auth || !db) return new Response(JSON.stringify({ error: 'Service unavailable.' }), { status: 503 });

        let uid: string;
        try {
            const decoded = await auth.verifyIdToken(idToken);
            uid = decoded.uid;
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid or expired session.' }), { status: 401 });
        }

        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        if (!userData) return new Response(JSON.stringify({ error: 'User not found.' }), { status: 403 });

        let hasAccess = false;
        const now = new Date();

        if (userData.hasFestivalAllAccess) hasAccess = true;

        if (!hasAccess && blockId) {
            const unlockedBlocks = userData.unlockedBlocks || {};
            const expiry = unlockedBlocks[blockId];
            if (expiry && new Date(expiry) > now) hasAccess = true;
            if (!hasAccess && Array.isArray(userData.unlockedBlockIds) && userData.unlockedBlockIds.includes(blockId)) hasAccess = true;
        }

        if (!hasAccess && movieKey) {
            const rental = (userData.rentals || {})[movieKey];
            if (rental && new Date(rental) > now) hasAccess = true;
        }

        if (!hasAccess && blockId) {
            const ticketsSnap = await db.collection('festival_tickets').where('uid', '==', uid).where('itemId', '==', blockId).limit(1).get();
            if (!ticketsSnap.empty) hasAccess = true;
        }

        // For $0 blocks — check if block price is 0 and user is signed in (access is free)
        if (!hasAccess && blockId) {
            const daysSnap = await db.collection('festival').doc('schedule').collection('days').get();
            for (const dayDoc of daysSnap.docs) {
                const block = dayDoc.data().blocks?.find((b: any) => b.id === blockId);
                if (block && (!block.price || block.price === 0)) { hasAccess = true; break; }
            }
        }

        if (!hasAccess) return new Response(JSON.stringify({ error: 'Access denied. Please purchase a ticket.' }), { status: 403 });

        const { getApiData } = await import('./_lib/data.js');
        const data = await getApiData({ noCache: false });

        let rawUrl: string | null = null;

        if (movieKey && data.movies?.[movieKey]?.fullMovie) {
            rawUrl = data.movies[movieKey].fullMovie;
        }

        if (!rawUrl && blockId) {
            const days = data.festivalData || [];
            outer: for (const day of days) {
                for (const block of (day.blocks || [])) {
                    if (block.id === blockId) {
                        for (const key of (block.movieKeys || [])) {
                            if (data.movies?.[key]?.fullMovie) { rawUrl = data.movies[key].fullMovie; break outer; }
                        }
                    }
                }
            }
        }

        if (!rawUrl) return new Response(JSON.stringify({ error: 'Film not found.' }), { status: 404 });

        const signedUrl = getSignedCloudFrontUrl(rawUrl);
        return new Response(JSON.stringify({ url: signedUrl, expiresAt: new Date(Date.now() + 14400 * 1000).toISOString() }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });

    } catch (error) {
        console.error('[get-stream-url] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error.' }), { status: 500 });
    }
}
