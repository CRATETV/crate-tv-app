import test from 'node:test';
import assert from 'node:assert/strict';
import { splitQuotedReply, tidyEmailText } from '../api/_lib/mailText.js';

const pad = (n: number, s = '') => Array.from({ length: n }, () => s).join('\n');

test("Joe's iPhone reply: his words show, the long blank quote does not", () => {
    const raw = "Hello I'm unable to submit them online as they are 30gb files I can send you the watchable files via email link if you wish and it's suitable let me know.\n\nSent from my iPhone\n\nOn Nov 27, 2026, at 12:49 PM, Crate TV <studio@cratetv.net> wrote:\n\n" + pad(40, '>') + '\n' + pad(30, '');
    const { main, quoted } = splitQuotedReply(raw);
    assert.ok(main.startsWith("Hello I'm unable"));
    assert.ok(main.endsWith('Sent from my iPhone'));
    assert.equal(quoted, '');
});

test('earlier messages with real words are kept one tap away', () => {
    const raw = 'Sounds good, thanks!\n\nOn Mon, Nov 2, 2026 at 9:00 AM Crate TV <studio@cratetv.net> wrote:\n> Hi Joe,\n> Please send your files.\n> Thanks, Salome';
    const { main, quoted } = splitQuotedReply(raw);
    assert.equal(main, 'Sounds good, thanks!');
    assert.ok(quoted.includes('Please send your files.'));
});

test('a wrapped "On … wrote:" line (Gmail) is still found', () => {
    const raw = 'Yes please.\n\nOn Fri, Nov 27, 2026 at 12:49 PM Crate TV\n<studio@cratetv.net> wrote:\n> Earlier words here';
    const { main, quoted } = splitQuotedReply(raw);
    assert.equal(main, 'Yes please.');
    assert.ok(quoted.includes('Earlier words here'));
});

test('lines that are only > marks at the end are dropped', () => {
    const { main, quoted } = splitQuotedReply('Thanks.\n>\n>\n>\n');
    assert.equal(main, 'Thanks.');
    assert.equal(quoted, '');
});

test('an email with no quoting, or that is all quoted, is shown whole', () => {
    assert.deepEqual(splitQuotedReply('Just a note.'), { main: 'Just a note.', quoted: '' });
    const allQuoted = splitQuotedReply('On Nov 1, 2026, Someone wrote:\n> hello there');
    assert.ok(allQuoted.main.includes('hello there'));
    assert.deepEqual(splitQuotedReply(''), { main: '', quoted: '' });
});

test('spacing is tidied: no trailing spaces, no more than one blank line in a row', () => {
    assert.equal(tidyEmailText('a   \r\n\r\n\r\n\r\nb  '), 'a\n\nb');
});
