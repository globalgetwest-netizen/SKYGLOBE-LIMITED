/* SkyGlobe Group — unit tests for lib/utils.js
   Run with:  npm test   (Node's built-in runner — zero extra packages) */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitize, sanitizeEmail, genRef,
  hashPassword, verifyPassword,
  signToken, verifyToken, TOKEN_TTL_MS,
  esc2,
} = require('../lib/utils');

const SECRET = 'test-secret';

test('sanitize trims, caps length, and escapes angle brackets/quotes', () => {
  assert.equal(sanitize('  hello  '), 'hello');
  assert.equal(sanitize('<script>'), '&lt;script&gt;');
  assert.equal(sanitize('a"b'), 'a&quot;b');
  assert.equal(sanitize('abcdef', 3), 'abc');
  assert.equal(sanitize(null), '');
  assert.equal(sanitize(undefined), '');
});

test('sanitizeEmail lower-cases valid emails and rejects bad ones', () => {
  assert.equal(sanitizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
  assert.equal(sanitizeEmail('not-an-email'), '');
  assert.equal(sanitizeEmail('a@b'), '');
  assert.equal(sanitizeEmail(''), '');
  assert.equal(sanitizeEmail(null), '');
});

test('genRef produces the SKY-YEAR-XXXX format', () => {
  const ref = genRef();
  assert.match(ref, /^SKY-\d{4}-[A-Z0-9]{1,4}$/);
  assert.notEqual(genRef(), genRef()); // randomised suffix
});

test('password hashing round-trips and rejects wrong passwords', () => {
  const stored = hashPassword('correct horse');
  assert.match(stored, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal(verifyPassword('correct horse', stored), true);
  assert.equal(verifyPassword('wrong', stored), false);
  assert.equal(verifyPassword('x', ''), false);
  assert.equal(verifyPassword('x', 'no-colon'), false);
});

test('signToken / verifyToken round-trip with the matching secret', () => {
  const tok = signToken('user@example.com', SECRET);
  assert.equal(verifyToken(tok, SECRET), 'user@example.com');
});

test('verifyToken rejects tampered tokens and wrong secrets', () => {
  const tok = signToken('user@example.com', SECRET);
  assert.equal(verifyToken(tok, 'other-secret'), null);
  assert.equal(verifyToken(tok + 'x', SECRET), null);
  assert.equal(verifyToken('garbage', SECRET), null);
  assert.equal(verifyToken('', SECRET), null);
  assert.equal(verifyToken(null, SECRET), null);
});

test('verifyToken rejects expired tokens', () => {
  // Forge a token whose iat is older than the TTL.
  const crypto = require('crypto');
  const old = Date.now() - TOKEN_TTL_MS - 1000;
  const payload = Buffer.from(JSON.stringify({ email: 'old@x.com', iat: old })).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  assert.equal(verifyToken(`${payload}.${sig}`, SECRET), null);
});

test('esc2 escapes all five HTML-sensitive characters', () => {
  assert.equal(esc2(`<a href="x">'&'</a>`),
    '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(esc2(null), '');
  assert.equal(esc2(42), '42');
});
