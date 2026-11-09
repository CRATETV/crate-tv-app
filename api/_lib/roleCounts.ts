// Counts for the "Personnel Breakdown" card. Filmmakers and talent are marked
// on the user's record when they are approved (filmmaker-signup sets
// isFilmmaker / verifiedFilmmakerName; approving an actor sets isActor on the
// login and verifiedActorName on the record). The old code sent back empty
// lists, so the card always said 0.

interface UserDocLike {
    isFilmmaker?: boolean;
    verifiedFilmmakerName?: string;
    isActor?: boolean;
    verifiedActorName?: string;
}

export function roleCounts(users: UserDocLike[]): { filmmakers: number; actors: number } {
    let filmmakers = 0, actors = 0;
    for (const u of users) {
        if (u?.isFilmmaker === true || (typeof u?.verifiedFilmmakerName === 'string' && u.verifiedFilmmakerName.trim())) filmmakers++;
        if (u?.isActor === true || (typeof u?.verifiedActorName === 'string' && u.verifiedActorName.trim())) actors++;
    }
    return { filmmakers, actors };
}
