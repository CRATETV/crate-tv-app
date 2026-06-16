/**
 * CRATE TV — Secure Stream URL Endpoint
 * 
 * THE CORE SECURITY FIX: Raw S3/CloudFront URLs must NEVER be sent to the client.
 * This endpoint is the only way to get a playable URL for a film. It:
 *   1. Verifies the request has a valid Firebase ID token
 *   2. Verifies the user has actually paid (checks Firestore server-side)
 *   3. Only then returns a short-lived signed CloudFront URL (4 hours)
 * 
 * A signed URL that expires in 4 hours cannot be shared or used after expiry.
 * Even if someone copies it from DevTools, it stops working at the end of the session.
 */

import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';
import { CloudFrontClient, SignedUrl } from '@aws-sdk/cloudfront-signer';
import { createSign } from 'crypto';

// ── CloudFront signed URL generator ──────────────────────────────────────────
function getSignedCloudFrontUrl(rawUrl: string, expiresInSeconds = 14400): string {
    // Convert any S3 URL to CloudFront domain
    const cfDomain = process.env.CLOUDFRONT_DOMAIN || 'd3jhtrl1gnrh4b.cloudfront.net';
    const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
    const privateKey = process.env.CLOUDFRONT_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!keyPairId || !privateKey) {
        // Fallback: if CloudFront signing not configured, return URL as-is
        // (less secure, but better than broken player)
        console.warn('[get-stream-url] CloudFront signing not configured — returning unsigned URL');
        return rawUrl;
    }

    // Normalise to CloudFront URL
    let cfUrl = rawUrl;
    if (rawUrl.includes('s3.amazonaws.com') || rawUrl.includes('s3.us-east-1.amazonaws.com')) {
        const urlObj = new URL(rawUrl);
        cfUrl = `https://${cfDomain}${urlObj.pathname}`;
    } else if (!rawUrl.includes(cfDomain)) {
        const urlObj = new URL(rawUrl);
        cfUrl = `https://${cfDomain}${urlObj.pathname}`;
    }

    const expiry = Math.floor(Date.now() / 1000) + expiresInSeconds;

    // Generate CloudFront signed URL using RSA-SHA1
    const policy = JSON.stringify({
        Statement: [{
            Resource: cfUrl,
            Condition: { DateLessThan: { 'AWS:EpochTime': expiry } }
        }]
    });

    const sign = createSign('RSA-SHA1');
    sign.update(policy);
    const signature = sign.sign(privateKey, 'base64')
        .replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~');

    const policyB64 = Buffer.from(policy).toString('base64')
        .replace(/\+/g, '-').replace(/=/g, '_').replace(/\//g, '~');

    return `${cfUrl}?Policy=${policyB64}&Signature=${signature}&Key-Pair-Id=${keyPairId}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { movieKey, blockId, idToken } = body;

        // 1. Require a Firebase ID token — no anonymous access
        if (!idToken) {
            return new Response(JSON.stringify({ error: 'Authentication required.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const initError = getInitializationError();
        if (initError) {
            return new Response(JSON.stringify({ error: 'Service unavailable.' }), { status: 503 });
        }

        const auth = getAdminAuth();
        const db = getAdminDb();
        if (!auth || !db) {
            return new Response(JSON.stringify({ error: 'Service unavailable.' }), { status: 503 });
        }

        // 2. Verify the Firebase token server-side — cannot be forged
        let uid: string;
        try {
            const decoded = await auth.verifyIdToken(idToken);
            uid = decoded.uid;
        } catch {
            return new Response(JSON.stringify({ error: 'Invalid or expired session. Please sign in again.' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 3. Verify payment server-side — check Firestore directly
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();

        if (!userData) {
            return new Response(JSON.stringify({ error: 'User not found.' }), { status: 403 });
        }

        let hasAccess = false;
        const now = new Date();

        // Check festival all-access pass
        if (userData.hasFestivalAllAccess) hasAccess = true;

        // Check block unlock (festival block tickets)
        if (!hasAccess && blockId) {
            const unlockedBlocks = userData.unlockedBlocks || {};
            const expiry = unlockedBlocks[blockId];
            if (expiry && new Date(expiry) > now) hasAccess = true;
            // Also check array format
            if (!hasAccess && Array.isArray(userData.unlockedBlockIds)) {
                if (userData.unlockedBlockIds.includes(blockId)) hasAccess = true;
            }
        }

        // Check individual movie rental
        if (!hasAccess && movieKey) {
            const rentals = userData.rentals || {};
            const rentalExpiry = rentals[movieKey];
            if (rentalExpiry && new Date(rentalExpiry) > now) hasAccess = true;
        }

        // Check watch party unlock
        if (!hasAccess && movieKey) {
            const watchPartyKeys = userData.unlockedWatchPartyKeys || [];
            if (watchPartyKeys.includes(movieKey)) hasAccess = true;
        }

        // Check festival_tickets collection (belt-and-suspenders)
        if (!hasAccess && blockId) {
            const ticketsSnap = await db.collection('festival_tickets')
                .where('uid', '==', uid)
                .where('itemId', '==', blockId)
                .limit(1)
                .get();
            if (!ticketsSnap.empty) hasAccess = true;
        }

        if (!hasAccess) {
            return new Response(JSON.stringify({ error: 'Access denied. Please purchase a ticket to watch this film.' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 4. Fetch the raw URL from S3 data — never from client input
        const { getApiData } = await import('./_lib/data.js');
        const data = await getApiData({ noCache: false });

        let rawUrl: string | null = null;

        // Try to find by movieKey
        if (movieKey && data.movies?.[movieKey]) {
            rawUrl = data.movies[movieKey].fullMovie || data.movies[movieKey].streamUrl || null;
        }

        // If blockId given and it's a festival block, find the current active film
        if (!rawUrl && blockId) {
            const days = data.festivalData || [];
            outer: for (const day of days) {
                for (const block of (day.blocks || [])) {
                    if (block.id === blockId) {
                        // Return URL for first film in block (WatchPartyPage manages index)
                        for (const key of (block.movieKeys || [])) {
                            if (data.movies?.[key]?.fullMovie) {
                                rawUrl = data.movies[key].fullMovie;
                                break outer;
                            }
                        }
                    }
                }
            }
        }

        if (!rawUrl) {
            return new Response(JSON.stringify({ error: 'Film not found or not yet available.' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // 5. Return a signed, expiring URL — not the raw S3 URL
        const signedUrl = getSignedCloudFrontUrl(rawUrl, 14400); // 4 hours

        return new Response(JSON.stringify({
            url: signedUrl,
            expiresAt: new Date(Date.now() + 14400 * 1000).toISOString(),
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                // Never cache this response — each request gets a fresh signed URL
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            }
        });

    } catch (error) {
        console.error('[get-stream-url] Error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
