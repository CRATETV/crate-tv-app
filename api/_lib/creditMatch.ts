import { Movie } from '../../types.js';

export const normalize = (name: string): string => name.trim().toLowerCase();

// Every director/producer name credited on a movie, as originally typed
// (not yet normalized) — comma-split for multi-credit fields.
export const getCreditedNames = (movie: Movie): string[] => {
    const directors = (movie.director || '').split(',').map(d => d.trim()).filter(Boolean);
    const producers = (movie.producers || '').split(',').map(p => p.trim()).filter(Boolean);
    return [...directors, ...producers];
};

// Matches a typed name against every movie's director/producer credits,
// returning the first match. Exact string match only (trim + lowercase) —
// same limitation the filmmaker-signup verification flow already has, not
// a new gap.
export function findCreditMatch(movies: Movie[], name: string): Movie | undefined {
    const target = normalize(name);
    if (!target) return undefined;
    return movies.find(movie => getCreditedNames(movie).some(n => normalize(n) === target));
}

// Same match, but returns every movie the name is credited on (a
// director/producer is usually credited on more than one film).
export function findAllCreditMatches(movies: Movie[], name: string): Movie[] {
    const target = normalize(name);
    if (!target) return [];
    return movies.filter(movie => getCreditedNames(movie).some(n => normalize(n) === target));
}
