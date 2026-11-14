// Sign-up email typo check. Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestEmailFix, emailTypoMessage } from '../services/emailTypo.js';

test('catches the .con typo that started this (Nov 2026)', () => {
    assert.equal(suggestEmailFix('ashleystewartatelier@gmail.con'), 'ashleystewartatelier@gmail.com');
});

test('catches other misspelled endings on any domain', () => {
    assert.equal(suggestEmailFix('a@mycompany.cmo'), 'a@mycompany.com');
    assert.equal(suggestEmailFix('a@school.comm'), 'a@school.com');
});

test('catches misspelled big providers', () => {
    assert.equal(suggestEmailFix('a@gmial.com'), 'a@gmail.com');
    assert.equal(suggestEmailFix('a@gmail.co'), 'a@gmail.com');
    assert.equal(suggestEmailFix('a@hotmial.com'), 'a@hotmail.com');
});

test('ignores case and spaces', () => {
    assert.equal(suggestEmailFix('  Sam@Gmail.CON '), 'sam@gmail.com');
});

test('leaves normal addresses alone', () => {
    for (const ok of ['a@gmail.com', 'a@yahoo.com', 'a@school.edu', 'a@studio.co', 'a@site.net', 'a@mail.co.uk', 'a@cratetv.net', 'a@university.org']) {
        assert.equal(suggestEmailFix(ok), null, ok);
    }
});

test('ignores things that are not addresses', () => {
    assert.equal(suggestEmailFix(''), null);
    assert.equal(suggestEmailFix('nope'), null);
    assert.equal(suggestEmailFix('a@'), null);
});

test('message names the fix', () => {
    assert.match(emailTypoMessage('a@gmail.con')!, /a@gmail\.com/);
    assert.equal(emailTypoMessage('a@gmail.com'), null);
});
