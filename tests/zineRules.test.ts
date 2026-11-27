import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublishedStory, readingMinutes, storyWords, storyChecklist, sanitizePartnerPiece, pieceToDraftStory, typeLabel, storyDescription, storyToPlainText } from '../api/_lib/zineRules.js';

const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

test('stories without a status count as published; drafts do not', () => {
    assert.equal(isPublishedStory({}), true);
    assert.equal(isPublishedStory({ status: 'published' }), true);
    assert.equal(isPublishedStory({ status: 'draft' }), false);
    assert.equal(isPublishedStory(null), false);
});
test('reading time rounds up and is never zero', () => {
    assert.equal(readingMinutes({ sections: [{ type: 'text', content: words(10) }] }), 1);
    assert.equal(readingMinutes({ sections: [{ type: 'text', content: words(401) }] }), 3);
    assert.equal(readingMinutes({ content: words(200) }), 1);
    assert.equal(storyWords({ sections: [{ type: 'image', content: 'https://x/y.jpg' }, { type: 'text', content: 'a b c' }] }), 3);
});
test('type names read well', () => {
    assert.equal(typeLabel('DIRECTORS_NOTES'), "Director's notes");
    assert.equal(typeLabel('whatever'), 'Story');
});
test('an empty story is told what is missing', () => {
    const c = storyChecklist({});
    assert.ok(c.errors.some(e => /headline/i.test(e)));
    assert.ok(c.errors.some(e => /cover picture/i.test(e)));
    assert.ok(c.errors.some(e => /byline/i.test(e)));
    assert.ok(c.errors.some(e => /words/i.test(e)));
});
test('a ready story has no errors; extras become tips', () => {
    const c = storyChecklist({ title: 'A Good Headline', heroImage: 'https://x/a.jpg', author: 'Salome', type: 'FILM_FEATURE', sections: [{ type: 'text', content: words(100) }, { type: 'image', content: 'https://x/b.jpg' }] });
    assert.deepEqual(c.errors, []);
    assert.ok(c.tips.some(t => /caption/i.test(t)));
    assert.ok(c.tips.some(t => /film card/i.test(t)));
    assert.ok(c.tips.some(t => /summary/i.test(t)));
});
test('empty blocks stop publishing', () => {
    const c = storyChecklist({ title: 'T', heroImage: 'h', author: 'a', sections: [{ type: 'text', content: words(80) }, { type: 'quote', content: '  ' }] });
    assert.ok(c.errors.some(e => /empty block/i.test(e)));
});

const good = { title: 'Why We Started', deck: 'A festival is a living room', body: words(130), byline: 'Ann Lee', role: 'Festival director', pullQuote: 'We wanted a room for everyone.', photos: [{ url: 'https://b.s3.amazonaws.com/a.jpg', caption: 'Opening night', credit: 'Sam' }, { url: 'https://b.s3.amazonaws.com/b.jpg', caption: 'The crowd', credit: '' }] };

test('a good partner piece passes; problems are listed in plain words', () => {
    assert.deepEqual(sanitizePartnerPiece(good).errors, []);
    const bad = sanitizePartnerPiece({ title: '', body: 'short', photos: [{ url: 'http://insecure/a.jpg', caption: 'x' }, { url: 'javascript:alert(1)', caption: 'y' }] });
    assert.ok(bad.errors.length >= 4);
    assert.equal(bad.piece.photos.length, 0);
    const nocap = sanitizePartnerPiece({ ...good, photos: [{ url: 'https://x/a.jpg', caption: '' }] });
    assert.ok(nocap.errors.some(e => /caption/i.test(e)));
});
test('web code in a piece is stripped', () => {
    const r = sanitizePartnerPiece({ ...good, title: '<script>alert(1)</script>Hello', byline: '<b>Ann</b>' });
    assert.equal(r.piece.title, 'alert(1)Hello');
    assert.equal(r.piece.byline, 'Ann');
});
test('too many words and too many photos are cut or refused', () => {
    assert.ok(sanitizePartnerPiece({ ...good, body: words(2600) }).errors.some(e => /under/i.test(e)));
    const many = Array.from({ length: 10 }, (_, i) => ({ url: `https://x/${i}.jpg`, caption: 'c' }));
    assert.equal(sanitizePartnerPiece({ ...good, photos: many }).piece.photos.length, 6);
});
test('an approved piece becomes a draft story: first photo is the cover, rest spread through, never published by itself', () => {
    const { piece } = sanitizePartnerPiece({ ...good, body: ['Intro paragraph ' + words(40), '## A heading', words(40), words(40), words(40)].join('\n\n') });
    const story = pieceToDraftStory(piece, { id: 'p1', name: 'Philly Fest' });
    assert.equal(story.status, 'draft');
    assert.equal(story.type, 'FESTIVAL_VOICES');
    assert.equal(story.heroImage, good.photos[0].url);
    assert.equal(story.author, 'Ann Lee, Festival director');
    assert.equal(story.partnerName, 'Philly Fest');
    assert.ok(story.sections.some(s => s.type === 'header' && s.content === 'A heading'));
    assert.ok(story.sections.some(s => s.type === 'quote'));
    const imgs = story.sections.filter(s => s.type === 'image');
    assert.equal(imgs.length, 1);
    assert.equal(imgs[0].caption, 'The crowd');
    assert.equal(new Set(story.sections.map(s => s.id)).size, story.sections.length);
});

test('share preview falls back to the first paragraph when there is no summary', () => {
    assert.equal(storyDescription({ subtitle: 'A short summary', sections: [{ type: 'text', content: 'Body' }] }), 'A short summary');
    assert.equal(storyDescription({ subtitle: '', sections: [{ type: 'image', content: 'x.jpg' }, { type: 'text', content: '<p>First  paragraph</p>' }] }), 'First paragraph');
    assert.equal(storyDescription({ content: 'Old style story' }), 'Old style story');
    assert.equal(storyDescription({}), '');
    const long = storyDescription({ subtitle: 'a'.repeat(300) });
    assert.equal(long.length, 160);
    assert.ok(long.endsWith('\u2026'));
});
test('the copy-for-Facebook text holds the whole story, the film line and the Crate link', () => {
    const text = storyToPlainText({
        title: 'How We Love', subtitle: 'On showing up', author: 'Aliya, love story writer',
        sections: [
            { type: 'text', content: 'First paragraph.' },
            { type: 'image', content: 'https://x/y.jpg' },
            { type: 'header', content: 'Rising' },
            { type: 'quote', content: 'We rise.' },
            { type: 'film', content: 'film-1' },
        ],
    }, 'https://cratetv.net/zine/abc', k => (k === 'film-1' ? 'You Don\'t Know My Name' : undefined));
    assert.ok(text.startsWith('How We Love\n\nOn showing up\n\nBy Aliya, love story writer'));
    assert.ok(text.includes('First paragraph.'));
    assert.ok(!text.includes('y.jpg'));
    assert.ok(text.includes('RISING'));
    assert.ok(text.includes('\u201cWe rise.\u201d'));
    assert.ok(text.includes("If this resonates with you, watch You Don't Know My Name on Crate TV."));
    assert.ok(text.trim().endsWith('Read it and more stories on Crate TV: https://cratetv.net/zine/abc'));
});
test('a film block for a film that is gone is skipped, and old stories still copy', () => {
    const gone = storyToPlainText({ title: 'T', sections: [{ type: 'film', content: 'nope' }] }, 'https://l');
    assert.ok(!gone.includes('watch'));
    const old = storyToPlainText({ title: 'T', content: 'Old body' }, 'https://l');
    assert.ok(old.includes('Old body'));
});
