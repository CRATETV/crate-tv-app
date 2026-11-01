import test from 'node:test';
import assert from 'node:assert/strict';
import { isBlockedLocation, isBlockedRequest } from '../api/_lib/blockedRegions.js';
import { getTemplate, renderContract, CONTRACT_TEMPLATES } from '../api/_lib/contractTemplates.js';

test('sanctioned countries are blocked, others are not', () => {
    for (const c of ['CU', 'IR', 'KP', 'SY', 'cu']) assert.equal(isBlockedLocation(c), true, c);
    for (const c of ['US', 'JM', 'GB', 'UA', '']) assert.equal(isBlockedLocation(c), false, c);
    assert.equal(isBlockedLocation(null), false);
    assert.equal(isBlockedLocation(undefined, undefined), false);
});

test('Crimea, Donetsk and Luhansk are blocked; the rest of Ukraine is not', () => {
    for (const r of ['43', '40', '14', '09']) assert.equal(isBlockedLocation('UA', r), true, r);
    assert.equal(isBlockedLocation('UA', '30'), false);
    assert.equal(isBlockedLocation('UA'), false);
    assert.equal(isBlockedLocation('US', '43'), false);
});

test('reads Vercel location headers', () => {
    const req = (h: Record<string, string>) => new Request('https://x.test', { headers: h });
    assert.equal(isBlockedRequest(req({ 'x-vercel-ip-country': 'IR' })), true);
    assert.equal(isBlockedRequest(req({ 'x-vercel-ip-country': 'UA', 'x-vercel-ip-country-region': '43' })), true);
    assert.equal(isBlockedRequest(req({})), false);
});

test('master filmmaker agreement exists, fills in names and covers music', () => {
    const t = getTemplate('filmmaker-master')!;
    assert.ok(t);
    assert.equal(t.needsFilm, true);
    assert.equal(new Set(CONTRACT_TEMPLATES.map(x => x.id)).size, CONTRACT_TEMPLATES.length);
    const out = renderContract(t, { signerName: 'Ada', filmTitle: 'Test Film', filmmakerPercent: 70 });
    assert.match(out, /Ada/); assert.match(out, /Test Film/); assert.match(out, /70%/); assert.match(out, /Music\./);
    assert.doesNotMatch(out, /\{\{/);
});
