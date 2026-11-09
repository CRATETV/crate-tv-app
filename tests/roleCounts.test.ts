import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roleCounts } from '../api/_lib/roleCounts.js';

test('counts approved filmmakers and actors; ignores everyone else', () => {
    const r = roleCounts([
        { isFilmmaker: true, verifiedFilmmakerName: 'Bubacarr Sarge' },
        { isFilmmaker: true, isActor: true },                 // dual role counts in both
        { verifiedActorName: 'Jane Doe' },                    // approved actor, doc only has the name
        { isActor: false, isFilmmaker: false },
        {},
        { verifiedFilmmakerName: '   ' },                     // blank name is not verified
    ]);
    assert.deepEqual(r, { filmmakers: 2, actors: 2 });
});

test('empty list gives zeros', () => {
    assert.deepEqual(roleCounts([]), { filmmakers: 0, actors: 0 });
});
