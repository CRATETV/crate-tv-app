import test from 'node:test';
import assert from 'node:assert/strict';
import { darkenEmailBody, renderBrandedEmail, renderEmailButton, EMAIL_WORDMARK_URL } from '../api/_lib/emailBranding.js';

test('dark text on a white card becomes light text on the dark card', () => {
    const out = darkenEmailBody('<h1 style="color:#1a1a1a;font-size:28px">Hi</h1><p style="margin:0;color: #666666;">x</p><p style="color:#999">y</p>');
    assert.match(out, /color:#f5f5f7/);
    assert.match(out, /color:#b4b4bc/);
    assert.match(out, /color:#9d9da7/);
    assert.doesNotMatch(out, /#1a1a1a|#666666|#999/);
});

test('light panels and thin lines flip, accents and buttons stay', () => {
    const out = darkenEmailBody('<div style="background:#f4f4f4;border-left:3px solid #ef4444;border-top:1px solid #e5e5e5"><a style="background-color:#FF3B5C;color:#ffffff">Go</a></div>');
    assert.match(out, /background:#2a2b30/);
    assert.match(out, /#ef4444/);
    assert.match(out, /border-top:1px solid #34353b/);
    assert.match(out, /background-color:#FF3B5C;color:#ffffff/);
});

test('background-color and border-color are not mistaken for text color', () => {
    const out = darkenEmailBody('<td style="background-color:#000000;border-color:#000">z</td>');
    assert.match(out, /background-color:#000000/);
    assert.match(out, /border-color:#000/);
});

test('the template has the wordmark, no colored banner, and a dark card', () => {
    const html = renderBrandedEmail({ title: 'T', bodyHtml: '<p style="color:#1a1a1a">Body</p>' });
    assert.ok(html.includes(EMAIL_WORDMARK_URL));
    assert.ok(!html.includes('email-header.png'));
    assert.ok(!html.includes('#FF3B5C; height: 3px'));
    assert.match(html, /bgcolor="#1f2023"/);
    assert.match(html, /color:#f5f5f7/);
});

test('the button still stands out', () => {
    assert.match(renderEmailButton('Go', 'https://x.y'), /#FF3B5C/);
});
