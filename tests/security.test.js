import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  hashPassword, verifyPassword, signToken, verifyToken,
  sanitizeString, sanitizeUrl, isValidEmail, passwordStrength,
} from '../lib/security.js'

test('password hashing round-trips and rejects wrong password', () => {
  const { salt, hash } = hashPassword('correct horse battery')
  assert.equal(verifyPassword('correct horse battery', salt, hash), true)
  assert.equal(verifyPassword('wrong', salt, hash), false)
  assert.equal(verifyPassword('x', null, null), false)
})

test('two hashes of the same password use different salts', () => {
  const a = hashPassword('same')
  const b = hashPassword('same')
  assert.notEqual(a.salt, b.salt)
  assert.notEqual(a.hash, b.hash)
})

test('token signs and verifies with the correct secret', () => {
  const token = signToken({ userId: 'u1' }, 'secret-a', 60)
  const payload = verifyToken(token, 'secret-a')
  assert.equal(payload.userId, 'u1')
  assert.ok(payload.exp > payload.iat)
})

test('token fails verification with a different secret', () => {
  const token = signToken({ userId: 'u1' }, 'secret-a', 60)
  assert.equal(verifyToken(token, 'secret-b'), null)
})

test('expired token is rejected', () => {
  const token = signToken({ userId: 'u1' }, 'secret-a', -10)
  assert.equal(verifyToken(token, 'secret-a'), null)
})

test('tampered token is rejected', () => {
  const token = signToken({ userId: 'u1' }, 'secret-a', 60)
  const [body] = token.split('.')
  assert.equal(verifyToken(`${body}.deadbeef`, 'secret-a'), null)
  assert.equal(verifyToken('garbage', 'secret-a'), null)
  assert.equal(verifyToken(null, 'secret-a'), null)
})

test('sanitizeString strips scripts and quoted + unquoted handlers', () => {
  assert.equal(sanitizeString('<script>alert(1)</script>hi'), 'hi')
  assert.ok(!/onerror/i.test(sanitizeString('<img src=x onerror=alert(1)>')))
  assert.ok(!/onclick/i.test(sanitizeString('<b onclick="x()">t</b>')))
  assert.ok(!/javascript:/i.test(sanitizeString('javascript:alert(1)')))
})

test('sanitizeString enforces max length', () => {
  assert.equal(sanitizeString('a'.repeat(50), 10).length, 10)
})

test('sanitizeUrl allows only http(s)', () => {
  assert.equal(sanitizeUrl('https://a.com/x'), 'https://a.com/x')
  assert.equal(sanitizeUrl('http://a.com'), 'http://a.com/')
  assert.equal(sanitizeUrl('javascript:alert(1)'), '')
  assert.equal(sanitizeUrl('data:text/html,x'), '')
  assert.equal(sanitizeUrl('not a url'), '')
  assert.equal(sanitizeUrl(''), '')
})

test('isValidEmail behaves', () => {
  assert.equal(isValidEmail('a@b.co'), true)
  assert.equal(isValidEmail('bad'), false)
  assert.equal(isValidEmail('a@b'), false)
  assert.equal(isValidEmail('a'.repeat(260) + '@b.co'), false)
})

test('passwordStrength enforces 6-200 chars', () => {
  assert.equal(passwordStrength('123456'), null)
  assert.notEqual(passwordStrength('123'), null)
  assert.notEqual(passwordStrength('x'.repeat(201)), null)
})
