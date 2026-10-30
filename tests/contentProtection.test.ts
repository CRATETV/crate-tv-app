import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isProtectionExempt } from '../services/contentProtection';
const el = (match: boolean) => ({ closest: () => (match ? {} : null) }) as any;
test('typing boxes and marked text can still be copied', () => { assert.equal(isProtectionExempt(el(true), false), true); });
test('ordinary page content is protected', () => { assert.equal(isProtectionExempt(el(false), false), false); });
test('an admin session is never blocked', () => { assert.equal(isProtectionExempt(el(false), true), true); });
