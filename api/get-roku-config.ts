// api/get-roku-config.ts
// Admin-only read of roku/config (the Roku management tabs: content
// filter, row manager, hero manager). No client Firestore rule ever
// existed for the top-level "roku" collection — same class of bug as
// jury_reviews/guest_judging/grant_ledger, fixed the same way. The live
// Roku TV app itself reads its catalog through api/roku-feed.ts (Admin
// SDK server-side already), so that path is unaffected by this.

import { getAdminDb, getInitializationError } from './_lib/firebaseAdmin.js';
import { RokuConfig } from '../types.js';

const DEFAULT_CONFIG: RokuConfig = {
    _version: 0,
    _lastUpdated: null,
    _updatedBy: 'system',
    hero: { mode: 'auto', items: [] },
    topTen: { enabled: true, mode: 'auto', title: 'Top 10 Today', movieKeys: [], showNumbers: true },
    nowStreaming: { enabled: true, title: 'Now Streaming', mode: 'auto', movieKeys: [], daysBack: 30 },
    categories: { mode: 'all', hidden: [], order: [], customTitles: {}, separateSection: [] },
    content: { hiddenMovies: [], featuredMovies: [] },
    features: { liveStreaming: false, watchParties: false, paidContent: false, festivalMode: false },
};

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        let isAuthenticated = false;
        if (password && (password === primaryAdminPassword || password === masterPassword)) {
            isAuthenticated = true;
        } else if (password) {
            for (const key in process.env) {
                if (key.startsWith('ADMIN_PASSWORD_') && process.env[key] === password) {
                    isAuthenticated = true;
                    break;
                }
            }
        }
        if (!isAuthenticated) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        if (!db) throw new Error('DB fail');

        const doc = await db.collection('roku').doc('config').get();
        const config: RokuConfig = doc.exists ? { ...DEFAULT_CONFIG, ...doc.data() } as RokuConfig : DEFAULT_CONFIG;

        return new Response(JSON.stringify({ config }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('[get-roku-config] Error:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
