import type { User } from '../types';

// Turns a user document from the database into the User the app uses.
//
// Oct 30 2026: watch party tickets (unlockedWatchPartyKeys), the Crate Fest pass
// and the jury pass were never copied here. The server had them, but the page only
// "remembered" a ticket for the visit in which it was bought. Refresh the page, or
// sign in on a phone, and the ticket looked gone. Every access field the server
// grants must be listed here; tests/userProfileMap.test.ts fails if one is dropped.
const strings = (v: unknown): string[] => Array.isArray(v) ? v.filter((item: any): item is string => typeof item === 'string') : [];

export function userFromDoc(uid: string, data: Record<string, any>): User {
    return {
        uid,
        email: data.email || '',
        name: data.name || data.email?.split('@')[0] || 'Creator',
        isActor: data.isActor === true,
        isFilmmaker: data.isFilmmaker === true,
        avatar: data.avatar || 'fox',
        isPremiumSubscriber: data.isPremiumSubscriber === true,
        watchlist: strings(data.watchlist),
        watchedMovies: strings(data.watchedMovies),
        likedMovies: strings(data.likedMovies),
        hasFestivalAllAccess: data.hasFestivalAllAccess === true,
        festivalPassExpiry: typeof data.festivalPassExpiry === 'string' ? data.festivalPassExpiry : undefined,
        hasCrateFestPass: data.hasCrateFestPass === true,
        crateFestPassExpiry: typeof data.crateFestPassExpiry === 'string' ? data.crateFestPassExpiry : undefined,
        hasJuryPass: data.hasJuryPass === true,
        unlockedBlockIds: strings(data.unlockedBlockIds),
        unlockedBlocks: (data.unlockedBlocks && typeof data.unlockedBlocks === 'object') ? data.unlockedBlocks : {},
        unlockedWatchPartyKeys: strings(data.unlockedWatchPartyKeys),
        purchasedMovieKeys: strings(data.purchasedMovieKeys),
        rentals: data.rentals || {},
        rokuDeviceId: data.rokuDeviceId || undefined,
    };
}
