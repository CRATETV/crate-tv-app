// This is a Vercel Serverless Function
// Path: /api/get-user-diagnostics
//
// Read-only support tool: given an email, returns a snapshot of that
// account's access flags, purchases, and activity so an admin can see
// what a user should be seeing without logging in as them. Never returns
// a password or anything that would let the caller act as the user.
import { getAdminDb, getAdminAuth, getInitializationError } from './_lib/firebaseAdmin.js';

export async function POST(request: Request) {
    try {
        const { password, email } = await request.json();

        const primaryAdminPassword = process.env.ADMIN_PASSWORD;
        const masterPassword = process.env.ADMIN_MASTER_PASSWORD;
        if (password !== primaryAdminPassword && password !== masterPassword) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        if (!email || typeof email !== 'string') {
            return new Response(JSON.stringify({ error: 'Email is required.' }), { status: 400 });
        }

        const initError = getInitializationError();
        if (initError) throw new Error(initError);
        const db = getAdminDb();
        const auth = getAdminAuth();
        if (!db || !auth) throw new Error('Database or Auth connection failed.');

        const normalizedEmail = email.trim().toLowerCase();

        let authRecord;
        try {
            authRecord = await auth.getUserByEmail(normalizedEmail);
        } catch (e: any) {
            if (e.code === 'auth/user-not-found') {
                return new Response(JSON.stringify({ found: false }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            throw e;
        }

        const uid = authRecord.uid;
        const [profileSnap, ticketsByUidSnap, ticketsByEmailSnap] = await Promise.all([
            db.collection('users').doc(uid).get(),
            db.collection('festival_tickets').where('uid', '==', uid).get(),
            db.collection('festival_tickets').where('email', '==', normalizedEmail).get(),
        ]);

        const profile: any = profileSnap.exists ? profileSnap.data() : {};

        // Resolve watched movie keys to titles for display — the User doc
        // only stores keys, so a support view showing just a count isn't
        // useful for spotting "did they already watch the film they say
        // won't load."
        const watchedKeys: string[] = profile?.watchedMovies || [];
        const watchedMovieDocs = await Promise.all(watchedKeys.map((key: string) => db.collection('movies').doc(key).get()));
        const watchedMovies = watchedMovieDocs.map((doc, i) => ({
            key: watchedKeys[i],
            title: doc.exists ? (doc.data()?.title || watchedKeys[i]) : `${watchedKeys[i]} (deleted)`,
        }));

        // A ticket can be found by uid, by email, or both (guest checkouts
        // only have email) — dedupe by doc id since either query might
        // return the same document.
        const ticketsById = new Map<string, any>();
        [...ticketsByUidSnap.docs, ...ticketsByEmailSnap.docs].forEach(doc => {
            const data = doc.data();
            ticketsById.set(doc.id, {
                id: doc.id,
                itemId: data.itemId || null,
                paymentType: data.paymentType || null,
                amountPaid: typeof data.amountPaid === 'number' ? data.amountPaid : null,
                promoCode: data.promoCode || null,
                purchasedAt: data.purchasedAt?.toDate?.().toISOString() || null,
            });
        });
        const festivalTickets = Array.from(ticketsById.values())
            .sort((a, b) => (b.purchasedAt || '').localeCompare(a.purchasedAt || ''));

        const result = {
            found: true,
            uid,
            email: authRecord.email,
            name: profile?.name || authRecord.displayName || null,
            createdAt: authRecord.metadata.creationTime || null,
            lastSignInAt: authRecord.metadata.lastSignInTime || null,
            emailVerified: !!authRecord.emailVerified,
            disabled: !!authRecord.disabled,
            roles: {
                isActor: !!profile?.isActor,
                isFilmmaker: !!profile?.isFilmmaker,
                isIndustryPro: !!profile?.isIndustryPro,
                isPremiumSubscriber: !!profile?.isPremiumSubscriber,
            },
            festivalAccess: {
                hasFestivalAllAccess: !!profile?.hasFestivalAllAccess,
                festivalPassExpiry: profile?.festivalPassExpiry || null,
                hasCrateFestPass: !!profile?.hasCrateFestPass,
                crateFestPassExpiry: profile?.crateFestPassExpiry || null,
                hasJuryPass: !!profile?.hasJuryPass,
                unlockedBlockIds: profile?.unlockedBlockIds || [],
                unlockedBlocks: profile?.unlockedBlocks || {},
                unlockedWatchPartyKeys: profile?.unlockedWatchPartyKeys || [],
            },
            purchases: {
                purchasedMovieKeys: profile?.purchasedMovieKeys || [],
                rentals: profile?.rentals || {},
                ticketStubCount: (profile?.ticketStubs || []).length,
                festivalTickets,
            },
            activity: {
                watchlistCount: (profile?.watchlist || []).length,
                watchedMovies,
                likedMoviesCount: (profile?.likedMovies || []).length,
                rokuDeviceId: profile?.rokuDeviceId || null,
            },
        };

        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
        console.error('Error in get-user-diagnostics API:', error);
        return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
    }
}
