import { test } from 'node:test';
import assert from 'node:assert/strict';
import { viewsByCountry } from '../api/_lib/viewCountries.js';

test('views are counted by country, biggest first, split by website and Roku', () => {
    const r = viewsByCountry([
        { country: 'US', platform: 'WEB', type: 'VIEW' }, { country: 'us', platform: 'ROKU', type: 'VIEW' },
        { country: 'TT', platform: 'WEB', type: 'VIEW' }, { platform: 'WEB', type: 'VIEW' },
        { country: 'US', platform: 'WEB', type: 'CLICK' },
    ]);
    assert.deepEqual(r.map(x => [x.code, x.views, x.web, x.roku]), [['US', 2, 1, 1], ['TT', 1, 1, 0], ['unknown', 1, 1, 0]]);
    assert.equal(r[0].name, 'United States');
    assert.equal(r[2].name, 'Unknown');
    assert.deepEqual(viewsByCountry([]), []);
});
