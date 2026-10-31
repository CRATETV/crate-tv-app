import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstWorkingAddress } from '../api/_lib/videoExists.js';

const old = 'https://films.example.com/old.mp4';
const good = 'https://films.example.com/main.mp4';
const check = async (k: string) => (k.includes('old') ? 'no' : 'yes') as 'yes' | 'no';

test('a stale Roku address falls back to the main video that exists', async () => {
    assert.equal(await firstWorkingAddress([old, good], check), good);
    assert.equal(await firstWorkingAddress([good, old], check), good);
});

test('nothing usable gives null; YouTube and no storage never count', async () => {
    assert.equal(await firstWorkingAddress([old], check), null);
    assert.equal(await firstWorkingAddress(['https://youtu.be/x', undefined], check), null);
    assert.equal(await firstWorkingAddress([good], null), null);
});

test('any doubt keeps the address', async () => {
    assert.equal(await firstWorkingAddress([old], async () => 'unknown'), old);
});
