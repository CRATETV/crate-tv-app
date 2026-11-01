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

test('only the Master Filmmaker Agreement is offered to filmmakers; retired ones still open', async () => {
    const { ACTIVE_CONTRACT_TEMPLATES } = await import('../api/_lib/contractTemplates.js');
    const { FILM_ONBOARDING_TEMPLATES } = await import('../api/_lib/contracts.js');
    assert.equal(ACTIVE_CONTRACT_TEMPLATES[0].id, 'filmmaker-master');
    assert.deepEqual(ACTIVE_CONTRACT_TEMPLATES.filter(t => t.audience === 'filmmaker').map(t => t.id), ['filmmaker-master', 'festival-submission']);
    assert.deepEqual(FILM_ONBOARDING_TEMPLATES, ['filmmaker-master']);
    for (const id of ['filmmaker-distribution', 'rights-warranty', 'payee-information']) {
        assert.ok(getTemplate(id), id);
        assert.ok(!ACTIVE_CONTRACT_TEMPLATES.some(t => t.id === id), id);
    }
});
