// Generates CloudFront signed cookies for HLS streaming.
// Unlike signed URLs (which only work for one file), signed cookies
// cover an entire path pattern — so the .m3u8 playlist AND all the
// .ts segment files are all covered by one cookie set.
// The client stores these cookies, and CloudFront accepts them on
// every subsequent request for files under the hls/ path.

import { getAdminDb } from './_lib/firebaseAdmin.js';
import { getAuth } from 'firebase-admin/auth';
import { createSign } from 'crypto';

const CLOUDFRONT_DOMAIN = process.env.CLOUDFRONT_DOMAIN || 'd3jhtrl1gnrh4b.cloudfront.net';
const KEY_PAIR_ID = process.env.CLOUDFRONT_KEY_PAIR_ID || '';
const PRIVATE_KEY = (process.env.CLOUDFRONT_PRIVATE_KEY || '').replace(/\\n/g, '\n');

function signPolicy(policy: string): string {
    const sign = createSign('RSA-SHA1');
    sign.update(policy);
    return sign.sign(PRIVATE_KEY, 'base64')
        .replace(/\+/g, '-')
        .replace(/=/g, '_')
        .replace(/\//g, '~');
}

export async function POST(request: Request): Promise<Response> {
    try {
        // Verify Firebase auth token
        const { idToken, hlsPath } = await request.json();
        if (!idToken) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
        }

        const db = getAdminDb();
        if (!db) return new Response(JSON.stringify({ error: 'DB unavailable' }), { status: 500 });

        // Verify the token
        const auth = getAuth();
        const decoded = await auth.verifyIdToken(idToken);
        const uid = decoded.uid;

        // Check user has festival access
        const userDoc = await db.collection('users').doc(uid).get();
        const userData = userDoc.data();
        if (!userData) {
            return new Response(JSON.stringify({ error: 'User not found' }), { status: 403 });
        }

        const hasFestivalAllAccess = userData.hasFestivalAllAccess || false;
        const unlockedBlocks = userData.unlockedBlocks || {};
        const hasAnyFestivalAccess = hasFestivalAllAccess || Object.keys(unlockedBlocks).length > 0;

        if (!hasAnyFestivalAccess) {
            return new Response(JSON.stringify({ error: 'No festival access' }), { status: 403 });
        }

        if (!KEY_PAIR_ID || !PRIVATE_KEY) {
            return new Response(JSON.stringify({ error: 'CloudFront signing not configured' }), { status: 500 });
        }

        // Create a signed cookie valid for 4 hours covering the entire hls/ path
        const expiry = Math.floor(Date.now() / 1000) + 4 * 60 * 60;
        const resourceUrl = `https://${CLOUDFRONT_DOMAIN}/hls/*`;

        const policy = JSON.stringify({
            Statement: [{
                Resource: resourceUrl,
                Condition: { DateLessThan: { 'AWS:EpochTime': expiry } }
            }]
        });

        const encodedPolicy = Buffer.from(policy)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/=/g, '_')
            .replace(/\//g, '~');

        const signature = signPolicy(policy);

        // Return the three CloudFront cookie values the client needs to set
        return new Response(JSON.stringify({
            success: true,
            cookies: {
                'CloudFront-Policy': encodedPolicy,
                'CloudFront-Signature': signature,
                'CloudFront-Key-Pair-Id': KEY_PAIR_ID,
            },
            domain: CLOUDFRONT_DOMAIN,
            expires: expiry,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error('[GET-HLS-COOKIES] Error:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
}
