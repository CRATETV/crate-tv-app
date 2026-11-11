import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    cleanPromo, blankPromo, cleanInterest, interestEmail, theChampExample, promoRouteFor, slugProblem, promoSlugify, countChange, isRevealed, safeUrl, instagramPostUrl,
} from '../api/_lib/promoRules.js';

test('addresses: /p/<slug>, /p/<slug>/partners and <slug>.cratetv.net', () => {
    assert.deepEqual(promoRouteFor('cratetv.net', '/p/the-champ'), { slug: 'the-champ', view: 'site' });
    assert.deepEqual(promoRouteFor('cratetv.net', '/p/the-champ/partners/'), { slug: 'the-champ', view: 'partners' });
    assert.deepEqual(promoRouteFor('thechamp.cratetv.net', '/'), { slug: 'thechamp', view: 'site' });
    assert.deepEqual(promoRouteFor('thechamp.cratetv.net', '/partners'), { slug: 'thechamp', view: 'partners' });
    // CRATE's own pages are never taken over
    assert.equal(promoRouteFor('cratetv.net', '/'), null);
    assert.equal(promoRouteFor('www.cratetv.net', '/'), null);
    assert.equal(promoRouteFor('cratetv.net', '/movie/abc'), null);
    assert.equal(promoRouteFor('thechamp.cratetv.net', '/admin'), null);
    assert.equal(promoRouteFor('cratetv.net', '/p/Bad_Slug'), null);
});

test('slugs: tidy, length-limited, reserved names refused', () => {
    assert.equal(promoSlugify("The Champ's Night!"), 'the-champs-night');
    assert.equal(slugProblem('the-champ'), null);
    assert.ok(slugProblem('www'));
    assert.ok(slugProblem('-bad'));
    assert.ok(slugProblem('a'.repeat(41)));
});

test('cleaning keeps good content and drops junk', () => {
    const page = theChampExample('the-champ');
    const dirty: any = JSON.parse(JSON.stringify(page));
    dirty.slug = 'hijack';
    dirty.published = true;
    dirty.evil = '<script>';
    dirty.look.bg = 'red; background:url(x)';
    dirty.look.font = 'comic-sans';
    dirty.hero.media = [{ type: 'image', src: 'javascript:alert(1)', pos: '50% 40%' }, { type: 'video', src: 'https://x.s3.amazonaws.com/a.mp4', pos: '50% 40%' }];
    dirty.sideA.photo = 'http://not-secure.example/a.jpg';
    dirty.instagram.posts = ['https://www.instagram.com/p/ABC123/?igsh=xyz', 'https://evil.example/p/1', ''];
    dirty.sideA.tape.push(['Extra', 'Row']);

    const out = cleanPromo(dirty, 'the-champ', false);
    assert.equal(out.slug, 'the-champ');
    assert.equal(out.published, false);
    assert.equal((out as any).evil, undefined);
    assert.equal(out.look.bg, blankPromo('x', 'x').look.bg);
    assert.equal(out.look.font, 'anton');
    assert.deepEqual(out.hero.media.map(m => m.src), ['https://x.s3.amazonaws.com/a.mp4']);
    assert.equal(out.hero.media[0].type, 'video');
    assert.equal(out.sideA.photo, '');
    assert.deepEqual(out.instagram.posts, ['https://www.instagram.com/p/ABC123/']);
    assert.deepEqual(out.sideA.tape.at(-1), ['Extra', 'Row']);
    assert.equal(out.partnerPage.packs[3].perks.length, 5);
    assert.equal(out.crowdfund.tiers.length, 5);
});

test('cleaning survives garbage input', () => {
    const out = cleanPromo('nonsense', 'x-page', true);
    assert.equal(out.slug, 'x-page');
    assert.equal(out.published, true);
    assert.equal(out.title, 'Untitled');
    assert.deepEqual(out.hero.media, []);
});

test('links: only https or site paths', () => {
    assert.equal(safeUrl('https://a.com/x.jpg'), 'https://a.com/x.jpg');
    assert.equal(safeUrl('/images/a.jpg'), '/images/a.jpg');
    assert.equal(safeUrl('//evil.com/a'), '');
    assert.equal(safeUrl('data:text/html,hi'), '');
    assert.equal(instagramPostUrl('https://instagram.com/reel/Xy_z-1/'), 'https://www.instagram.com/reel/Xy_z-1/');
});

test('votes: one per email, changing your pick moves it', () => {
    assert.deepEqual(countChange(null, 'a'), { votesA: 1, votesB: 0, signups: 1 });
    assert.deepEqual(countChange(null, null), { votesA: 0, votesB: 0, signups: 1 });
    assert.deepEqual(countChange({ side: 'a' }, 'a'), { votesA: 0, votesB: 0, signups: 0 });
    assert.deepEqual(countChange({ side: 'a' }, 'b'), { votesA: -1, votesB: 1, signups: 0 });
    assert.deepEqual(countChange({ side: null }, 'b'), { votesA: 0, votesB: 1, signups: 0 });
    // signing up again without a pick keeps the old vote
    assert.deepEqual(countChange({ side: 'b' }, null), { votesA: 0, votesB: 0, signups: 0 });
});

test('reveal: by date, or switched on early', () => {
    const p = blankPromo('x', 'X');
    assert.equal(isRevealed(p), false);
    p.countdown.date = '2020-01-01T00:00:00Z';
    assert.equal(isRevealed(p), true);
    p.countdown.date = '2999-01-01T00:00:00Z';
    assert.equal(isRevealed(p), false);
    p.countdown.forceReveal = true;
    assert.equal(isRevealed(p), true);
});

test("The Champ comes with its photos and stats, and they survive saving", () => {
    const out = cleanPromo(theChampExample('the-champ'), 'the-champ', false);
    assert.equal(out.sideA.photo, '/promo/the-champ/ace.jpg');
    assert.equal(out.sideB.photo, '/promo/the-champ/beast.jpg');
    assert.deepEqual(out.hero.media.map(m => m.src), ['/promo/the-champ/ace-face.jpg', '/promo/the-champ/beast-face.jpg']);
    assert.deepEqual(out.sideA.tape[0], ['Record', '24-1']);
    assert.equal(out.countdown.date, '2027-02-20T20:00:00-05:00');
});

test('interest form: needs name, business and a way to reach them', () => {
    const packs = ['Ringside', 'Corner'];
    assert.equal(cleanInterest({ business: 'Gym', phone: '2155550100' }, packs).ok, false);
    assert.equal(cleanInterest({ name: 'Dee', phone: '2155550100' }, packs).ok, false);
    assert.equal(cleanInterest({ name: 'Dee', business: 'Gym' }, packs).ok, false);
    assert.equal(cleanInterest({ name: 'Dee', business: 'Gym', phone: '12' }, packs).ok, false);
    assert.equal(cleanInterest({ name: 'Dee', business: 'Gym', email: 'nope' }, packs).ok, false);
    const ok = cleanInterest({ name: ' Dee ', business: 'North Gym', phone: '(215) 555-0100', pack: 'Corner' }, packs);
    assert.ok(ok.ok && ok.value.name === 'Dee' && ok.value.pack === 'Corner');
    const made = cleanInterest({ name: 'Dee', business: 'Gym', email: 'DEE@GYM.COM', pack: 'Gold Tier' }, packs);
    assert.ok(made.ok && made.value.pack === 'Not sure yet' && made.value.email === 'dee@gym.com');
});

test('interest email: names the business and escapes what they typed', () => {
    const r = cleanInterest({ name: 'Dee', business: '<b>Gym</b>', phone: '2155550100', pack: 'Corner', message: '<script>x</script>' }, ['Corner']);
    assert.ok(r.ok);
    const m = interestEmail('The Champ', r.value);
    assert.equal(m.subject, 'The Champ: <b>Gym</b> is interested (Corner)');
    assert.ok(!m.html.includes('<script>') && m.html.includes('&lt;b&gt;Gym&lt;/b&gt;'));
    assert.ok(m.text.includes('Phone: 2155550100'));
});

test('older pages get the interest form defaults when cleaned', () => {
    const old: any = theChampExample('the-champ');
    delete old.partnerPage.form;
    const out = cleanPromo(old, 'the-champ', true);
    assert.equal(out.partnerPage.form.enabled, true);
    assert.equal(out.partnerPage.form.button, 'Send');
});

test('backer levels: each keeps its own payment link (https only), older levels get an empty one', () => {
    const page: any = theChampExample('the-champ');
    page.crowdfund.tiers[2].link = 'https://square.link/u/abc123';
    page.crowdfund.tiers[3].link = 'javascript:alert(1)';
    delete page.crowdfund.tiers[4].link;
    const out = cleanPromo(page, 'the-champ', true);
    assert.equal(out.crowdfund.tiers[2].link, 'https://square.link/u/abc123');
    assert.equal(out.crowdfund.tiers[3].link, '');
    assert.equal(out.crowdfund.tiers[4].link, '');
});

test("The Champ starter sends press and partner mail to the film's own inbox", () => {
    const p = theChampExample('the-champ');
    assert.equal(p.partnersBlock.email, 'thechampfilm@gmail.com');
    assert.equal(p.footer.pressEmail, 'thechampfilm@gmail.com');
    assert.equal(p.partnerPage.contactEmail, 'thechampfilm@gmail.com');
});
