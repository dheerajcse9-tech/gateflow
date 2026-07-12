// Shared security & validation helpers.
// Extracted from the API route so they can be unit-tested in isolation and
// reused without duplication (fixes audit DRY findings).

import crypto from 'crypto'

// ===== Password hashing (scrypt) =====
export function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex')
  const h = crypto.scryptSync(password, s, 32).toString('hex')
  return { salt: s, hash: h }
}

export function verifyPassword(password, salt, hash) {
  if (!salt || !hash) return false
  const h = crypto.scryptSync(password, salt, 32).toString('hex')
  // Constant-time comparison to avoid timing attacks.
  const a = Buffer.from(h)
  const b = Buffer.from(hash)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// ===== Stateless HMAC tokens =====
export function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

export function b64uDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64').toString()
}

export function signToken(payload, secret, ttlSec = 60 * 60 * 8) {
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + ttlSec }
  const enc = base64url(JSON.stringify(body))
  const sig = base64url(crypto.createHmac('sha256', secret).update(enc).digest())
  return `${enc}.${sig}`
}

export function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [enc, sig] = token.split('.')
  const expected = base64url(crypto.createHmac('sha256', secret).update(enc).digest())
  // Constant-time signature comparison.
  const a = Buffer.from(sig || '')
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(b64uDecode(enc))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function getBearer(request) {
  const h = request.headers.get('authorization') || ''
  if (h.startsWith('Bearer ')) return h.slice(7).trim()
  return null
}

// ===== Input sanitization / validation =====
// Denylist-based HTML scrubber. Defense-in-depth only — the frontend renders
// all user content as escaped React text nodes. Now also strips UNQUOTED event
// handlers and additional dangerous URI schemes (fixes audit H-4).
export function sanitizeString(s, maxLen = 2000) {
  if (typeof s !== 'string') return ''
  return s
    .slice(0, maxLen)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(iframe|object|embed|link|meta|style|svg|math)[^>]*>/gi, '')
    // Strip inline event handlers whether the value is double/single quoted or unquoted.
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(javascript|vbscript|data)\s*:/gi, '')
    .trim()
}

// Only allow http(s) URLs to be persisted for fields rendered into href/src.
// Anything else (javascript:, data:, relative, malformed) becomes ''.
export function sanitizeUrl(u, maxLen = 2000) {
  if (typeof u !== 'string') return ''
  const v = u.trim().slice(0, maxLen)
  if (!v) return ''
  try {
    const parsed = new URL(v)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString()
    return ''
  } catch {
    return ''
  }
}

export function isValidEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254
}

export function passwordStrength(p) {
  if (typeof p !== 'string' || p.length < 6 || p.length > 200) return 'Password must be 6-200 characters'
  return null
}
