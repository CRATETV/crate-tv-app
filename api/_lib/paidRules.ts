// One rule for "is this film free for everyone?" and "what is safe to publish?".
//
// A film can be paid three ways:
//   1. it's for sale (isForSale),
//   2. it's a paid watch party (isWatchPartyPaid),
//   3. it's in a festival block that has a price. Festival films carry no
//      price of their own; their BLOCK does. Several places used to check only
//      1 and 2, so paid festival films counted as free on the Roku and in the
//      public TV feeds. A block only makes its films free when its price is
//      exactly 0. A block with no price set counts as paid, same as the
//      watch party rules.
//
// Video links are never published for paid films. Viewers who are allowed to
// watch get a short-lived signed link from /api/get-stream-url (or the Roku
// feed), never the raw file address.

export interface BlockLike { id?: string; price?: number; movieKeys?: string[] }
export interface DayLike { blocks?: BlockLike[] }

/** Film keys that sit in at least one festival block that isn't free. */
export function paidFestivalFilmKeys(festivalData: unknown): Set<string> {
    const keys = new Set<string>();
    if (!Array.isArray(festivalData)) return keys;
    for (const day of festivalData as DayLike[]) {
        for (const block of day?.blocks || []) {
            if (block && block.price !== 0) (block.movieKeys || []).forEach(k => keys.add(k));
        }
    }
    return keys;
}

export function isFreeForEveryone(movie: { key?: string; isForSale?: boolean; isWatchPartyPaid?: boolean } | null | undefined, paidKeys: Set<string>): boolean {
    if (!movie) return false;
    if (movie.isForSale === true || movie.isWatchPartyPaid === true) return false;
    if (movie.key && paidKeys.has(movie.key)) return false;
    return true;
}

/** YouTube/Vimeo links are public embeds anyway; anything else is one of our files. */
export function isPublicEmbedUrl(url: unknown): boolean {
    if (typeof url !== 'string' || !url) return false;
    try {
        const host = new URL(url).hostname.replace(/^www\./, '');
        return ['youtube.com', 'm.youtube.com', 'youtu.be', 'vimeo.com', 'player.vimeo.com'].includes(host);
    } catch {
        return false;
    }
}

/**
 * A copy of a film record that is safe to hand to anyone:
 *  - fullMovie only if it's a public YouTube/Vimeo embed,
 *  - rokuStreamUrl never (the Roku gets signed links from its own feed),
 *  - episode links only for free series (or public embeds).
 * Never mutates the original (the server shares cached records across requests).
 */
export function publicSafeMovie<T extends Record<string, any>>(movie: T, paidKeys: Set<string>): T {
    const free = isFreeForEveryone(movie, paidKeys);
    const out: Record<string, any> = { ...movie };
    if (!isPublicEmbedUrl(out.fullMovie)) out.fullMovie = undefined;
    delete out.rokuStreamUrl;
    if (Array.isArray(out.episodes)) {
        out.episodes = out.episodes.map((ep: any) => (free || isPublicEmbedUrl(ep?.url)) ? ep : { ...ep, url: undefined });
    }
    return out as T;
}

/** The whole published data set with every film made public-safe. */
export function publicSafeData<T extends Record<string, any>>(data: T): T {
    const paidKeys = paidFestivalFilmKeys(data?.festivalData);
    const movies: Record<string, any> = {};
    for (const [key, m] of Object.entries(data?.movies || {})) {
        if (m && typeof m === 'object') movies[key] = publicSafeMovie(m as Record<string, any>, paidKeys);
    }
    const out: Record<string, any> = { ...data, movies };
    delete out.promoCodes;
    return out as T;
}
