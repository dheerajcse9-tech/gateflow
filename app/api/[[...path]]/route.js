import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { BRANCHES, CS_SUBJECTS, getAllCSTopics, TOTAL_CS_TOPICS, TARGET_DATES } from '@/lib/seedData'
import {
  hashPassword, verifyPassword, signToken, verifyToken, getBearer,
  sanitizeString, sanitizeUrl, isValidEmail, passwordStrength,
} from '@/lib/security'
import {
  todayISO, daysBetween, clampDuration, sessionXp, computeStreak, TOPIC_XP,
} from '@/lib/domain'

// ===== Mongo connection (cached across hot-reloads / invocations) =====
// Using a global cache prevents connection storms during dev hot-reload and
// serverless warm invocations (audit M-4).
const globalForMongo = globalThis
let indexesEnsured = false

async function connectToMongo() {
  if (globalForMongo._gpDb) return globalForMongo._gpDb
  if (!globalForMongo._gpConnecting) {
    globalForMongo._gpConnecting = (async () => {
      if (!process.env.MONGO_URL) throw new Error('MONGO_URL is not configured')
      const c = new MongoClient(process.env.MONGO_URL, { maxPoolSize: 10 })
      await c.connect()
      globalForMongo._gpClient = c
      globalForMongo._gpDb = c.db(process.env.DB_NAME || 'gateplus')
      return globalForMongo._gpDb
    })()
  }
  const db = await globalForMongo._gpConnecting
  await ensureIndexes(db)
  return db
}

async function ensureIndexes(db) {
  if (indexesEnsured) return
  indexesEnsured = true
  try {
    await Promise.all([
      db.collection('users').createIndex({ id: 1 }, { unique: true }),
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('users').createIndex({ username: 1 }),
      db.collection('users').createIndex({ 'branches.branchCode': 1 }),
      db.collection('study_sessions').createIndex({ userId: 1, date: 1 }),
      db.collection('study_sessions').createIndex({ userId: 1, createdAt: -1 }),
      db.collection('activity_events').createIndex({ userId: 1, createdAt: -1 }),
      db.collection('activity_events').createIndex({ createdAt: -1 }),
      db.collection('community_posts').createIndex({ createdAt: -1 }),
      db.collection('admins').createIndex({ email: 1 }, { unique: true }),
      db.collection('audit_logs').createIndex({ createdAt: -1 }),
    ])
  } catch (e) {
    // Index creation is best-effort; never block a request on it.
    console.error('ensureIndexes error:', e.message)
  }
}

// ===== CORS =====
// Wildcard origin is NEVER combined with credentials (that combination is
// rejected by browsers and is unsafe). When an explicit allowlist is set we
// reflect the request origin and allow credentials (audit H-3).
const CORS_ALLOWLIST = (process.env.CORS_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean)

function applyCORS(response, request) {
  const wildcard = CORS_ALLOWLIST.length === 0 || CORS_ALLOWLIST.includes('*')
  const reqOrigin = request?.headers.get('origin') || ''
  if (wildcard) {
    response.headers.set('Access-Control-Allow-Origin', '*')
  } else if (reqOrigin && CORS_ALLOWLIST.includes(reqOrigin)) {
    response.headers.set('Access-Control-Allow-Origin', reqOrigin)
    response.headers.set('Vary', 'Origin')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

export async function OPTIONS(request) {
  return applyCORS(new NextResponse(null, { status: 200 }), request)
}

// ===== Misc helpers =====
function genUsername(email, branch) {
  const prefix = (email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')
  const num = Math.floor(Math.random() * 900) + 100
  return `${prefix}${branch.toLowerCase()}_${num}`
}

function sanitizeUser(user) {
  if (!user) return null
  const { _id, passwordHash, passwordSalt, ...rest } = user
  return rest
}

const VALID_BRANCHES = ['CS', 'DA', 'ECE', 'EE', 'ME', 'CE']
const VALID_TARGET_YEARS = [2026, 2027, 2028]

// ===== Secrets =====
const ADMIN_SECRET = process.env.ADMIN_SECRET
const USER_SECRET = process.env.USER_SECRET
// Fail fast in production if signing secrets are missing; fall back to a
// deterministic dev-only value locally so `next dev` still works.
function requireSecret(value, name) {
  if (value) return value
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} must be set in production`)
  }
  return `dev-only-insecure-${name}`
}

async function requireAdmin(request, db) {
  const token = getBearer(request)
  const payload = verifyToken(token, requireSecret(ADMIN_SECRET, 'ADMIN_SECRET'))
  if (!payload || !payload.adminId) return null
  const admin = await db.collection('admins').findOne({ id: payload.adminId })
  if (!admin) return null
  const { passwordHash, passwordSalt, _id, ...rest } = admin
  return rest
}

// Authenticate a user from the Bearer token. Identity is ALWAYS derived from
// the verified token — never from request body/query (fixes audit C-1/H-2).
async function requireUser(request, db) {
  const token = getBearer(request)
  const payload = verifyToken(token, requireSecret(USER_SECRET, 'USER_SECRET'))
  if (!payload || !payload.userId) return null
  const user = await db.collection('users').findOne({ id: payload.userId })
  if (!user || user.suspended) return null
  return user
}

async function logAudit(db, adminId, action, target = null, meta = null) {
  await db.collection('audit_logs').insertOne({
    id: uuidv4(), adminId, action, target, meta, createdAt: new Date().toISOString(),
  })
}

async function emitActivity(db, user, branchCode, action, subject, topic, xpEarned) {
  await db.collection('activity_events').insertOne({
    id: uuidv4(),
    userId: user.id,
    username: user.username,
    branchCode,
    action,
    subject,
    topic,
    xpEarned,
    createdAt: new Date(),
  })
}

// Update streak based on current activity.
async function updateStreak(db, user, branchCode) {
  const today = todayISO()
  const branch = user.branches.find((b) => b.branchCode === branchCode)
  if (!branch) return user

  const next = computeStreak(branch, today)
  if (next.unchanged) return user

  await db.collection('users').updateOne(
    { id: user.id, 'branches.branchCode': branchCode },
    {
      $set: {
        'branches.$.streak': next.streak,
        'branches.$.maxStreak': next.maxStreak,
        'branches.$.lastActiveDate': new Date().toISOString(),
      },
      $inc: { totalActiveDays: 1 },
    }
  )
  return await db.collection('users').findOne({ id: user.id })
}

// ===== Rate limiting (in-memory, per-process) =====
const rateBuckets = new Map()
function rateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now()
  const arr = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs)
  arr.push(now)
  rateBuckets.set(key, arr)
  if (rateBuckets.size > 5000) {
    for (const [k, v] of rateBuckets) {
      if (!v.length || now - v[v.length - 1] > windowMs) rateBuckets.delete(k)
    }
  }
  return arr.length <= limit
}
function clientKey(request, suffix = '') {
  const fwd = request.headers.get('x-forwarded-for') || ''
  const ip = fwd.split(',')[0].trim() || 'anon'
  return `${ip}:${suffix}`
}

async function ensureSeedAdmin(db) {
  const cnt = await db.collection('admins').countDocuments()
  if (cnt === 0) {
    // Never seed a hard-coded weak password in production. Use an env-provided
    // initial password, or generate a strong random one and print it to the
    // server log exactly once (audit C-3).
    let initial = process.env.ADMIN_INITIAL_PASSWORD
    if (!initial) {
      initial = crypto.randomBytes(12).toString('base64url')
      console.warn(`[GateFlow] Seeded initial admin admin@gateplus.local with generated password: ${initial}`)
      console.warn('[GateFlow] Log in and change it immediately, or set ADMIN_INITIAL_PASSWORD.')
    }
    const { salt, hash } = hashPassword(initial)
    await db.collection('admins').insertOne({
      id: uuidv4(),
      email: 'admin@gateplus.local',
      name: 'Root Admin',
      role: 'superadmin',
      passwordSalt: salt,
      passwordHash: hash,
      mustChangePassword: true,
      createdAt: new Date().toISOString(),
    })
  }
}

function newUserDoc(email, username, branchCode, targetYear, { salt = null, hash = null } = {}) {
  return {
    id: uuidv4(),
    email,
    username,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
    dailyGoalMinutes: 360,
    totalActiveDays: 0,
    suspended: false,
    loginAttempts: 0,
    lockUntil: null,
    branches: [
      {
        branchCode,
        targetYear,
        xp: 0, level: 1, streak: 0, maxStreak: 0,
        lastActiveDate: null,
        completedTopics: [], revisedTopics: [],
        isActive: true,
      },
    ],
  }
}

async function handleRoute(request, { params }) {
  const resolvedParams = await params
  const { path = [] } = resolvedParams
  const route = `/${path.join('/')}`
  const method = request.method
  const url = new URL(request.url)

  // Local CORS binder so every response carries the correct headers.
  const cors = (response) => applyCORS(response, request)
  const json = (data, init) => cors(NextResponse.json(data, init))

  try {
    const db = await connectToMongo()

    // ============ ROOT ============
    if (route === '/' && method === 'GET') {
      return json({ message: 'GatePlus API' })
    }

    // ============ AUTH ============
    if (route === '/auth/signup' && method === 'POST') {
      if (!rateLimit(clientKey(request, 'signup'), 5, 60000)) {
        return json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 })
      }
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').toLowerCase().trim()
      const password = body.password || ''
      const branchCode = VALID_BRANCHES.includes(body.branchCode) ? body.branchCode : 'CS'
      const targetYear = VALID_TARGET_YEARS.includes(Number(body.targetYear)) ? Number(body.targetYear) : 2027
      if (!isValidEmail(email)) return json({ error: 'Please enter a valid email address.' }, { status: 400 })
      const pe = passwordStrength(password); if (pe) return json({ error: pe }, { status: 400 })
      const existing = await db.collection('users').findOne({ email })
      if (existing) {
        return json({ error: 'An account with this email already exists. Sign In instead.' }, { status: 409 })
      }
      const { salt, hash } = hashPassword(password)
      const username = genUsername(email, branchCode)
      const user = newUserDoc(email, username, branchCode, targetYear, { salt, hash })
      try {
        await db.collection('users').insertOne(user)
      } catch (e) {
        if (e.code === 11000) return json({ error: 'An account with this email already exists. Sign In instead.' }, { status: 409 })
        throw e
      }
      const token = signToken({ userId: user.id }, requireSecret(USER_SECRET, 'USER_SECRET'), 60 * 60 * 24 * 7)
      return json({ user: sanitizeUser(user), token })
    }

    if (route === '/auth/google' && method === 'POST') {
      if (!rateLimit(clientKey(request, 'google'), 10, 60000)) {
        return json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 })
      }
      const body = await request.json().catch(() => ({}))
      const { credential } = body
      if (!credential) {
        return json({ error: 'Missing credential token.' }, { status: 400 })
      }
      const clientId = process.env.GOOGLE_CLIENT_ID
      if (!clientId) {
        return json({ error: 'Google sign-in is not configured.' }, { status: 500 })
      }
      try {
        const { OAuth2Client } = require('google-auth-library')
        const client = new OAuth2Client(clientId)
        const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId })
        const payload = ticket.getPayload()
        if (!payload || !payload.email || payload.email_verified === false) {
          return json({ error: 'Invalid token payload.' }, { status: 400 })
        }
        const email = payload.email.toLowerCase().trim()
        const name = payload.name || email.split('@')[0]
        let user = await db.collection('users').findOne({ email })
        if (!user) {
          const username = name.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '') + '_' + (Math.floor(100 + Math.random() * 900))
          user = newUserDoc(email, username, 'CS', 2027)
          try {
            await db.collection('users').insertOne(user)
          } catch (e) {
            if (e.code === 11000) {
              user = await db.collection('users').findOne({ email })
            } else throw e
          }
        }
        if (user.suspended) {
          return json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 })
        }
        const token = signToken({ userId: user.id }, requireSecret(USER_SECRET, 'USER_SECRET'), 60 * 60 * 24 * 7)
        return json({ user: sanitizeUser(user), token })
      } catch (err) {
        console.error('Google verification error:', err.message)
        return json({ error: 'Google authentication failed. Please try again.' }, { status: 401 })
      }
    }

    if (route === '/auth/login' && method === 'POST') {
      if (!rateLimit(clientKey(request, 'login'), 8, 60000)) {
        return json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 })
      }
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').toLowerCase().trim()
      const password = body.password || ''
      if (!isValidEmail(email)) return json({ error: 'Invalid email or password.' }, { status: 401 })
      const user = await db.collection('users').findOne({ email })
      if (!user) return json({ error: 'Invalid email or password.' }, { status: 401 })
      if (user.suspended) return json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 })
      if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
        return json({ error: 'Account temporarily locked due to repeated failures. Try again later.' }, { status: 423 })
      }
      if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        const attempts = (user.loginAttempts || 0) + 1
        const update = { $set: { loginAttempts: attempts } }
        if (attempts >= 5) {
          update.$set.lockUntil = new Date(Date.now() + 15 * 60000).toISOString()
          update.$set.loginAttempts = 0
        }
        await db.collection('users').updateOne({ id: user.id }, update)
        return json({ error: 'Invalid email or password.' }, { status: 401 })
      }
      await db.collection('users').updateOne({ id: user.id }, { $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date().toISOString() } })
      const token = signToken({ userId: user.id }, requireSecret(USER_SECRET, 'USER_SECRET'), 60 * 60 * 24 * 7)
      return json({ user: sanitizeUser(user), token })
    }

    // ============ USER (authenticated) ============
    if (route === '/user/me' && method === 'GET') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      return json({ user: sanitizeUser(user) })
    }

    if (route === '/user/goal' && method === 'PATCH') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const goal = Math.max(0, Math.min(1440, Number(body.dailyGoalMinutes) || 0))
      await db.collection('users').updateOne({ id: user.id }, { $set: { dailyGoalMinutes: goal } })
      const updated = await db.collection('users').findOne({ id: user.id })
      return json({ user: sanitizeUser(updated) })
    }

    if (route === '/user/branch/add' && method === 'POST') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const branchCode = VALID_BRANCHES.includes(body.branchCode) ? body.branchCode : null
      if (!branchCode) return json({ error: 'Invalid branch' }, { status: 400 })
      const targetYear = VALID_TARGET_YEARS.includes(Number(body.targetYear)) ? Number(body.targetYear) : 2027
      if (user.branches.some((b) => b.branchCode === branchCode)) {
        return json({ error: 'Branch already added' }, { status: 400 })
      }
      const newBranch = {
        branchCode, targetYear,
        xp: 0, level: 1, streak: 0, maxStreak: 0,
        lastActiveDate: null, completedTopics: [], revisedTopics: [],
        isActive: false,
      }
      await db.collection('users').updateOne({ id: user.id }, { $push: { branches: newBranch } })
      const updated = await db.collection('users').findOne({ id: user.id })
      return json({ user: sanitizeUser(updated) })
    }

    if (route === '/user/branch/switch' && method === 'POST') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const branchCode = body.branchCode
      if (!user.branches.some((b) => b.branchCode === branchCode)) {
        return json({ error: 'Branch not found' }, { status: 404 })
      }
      await db.collection('users').updateOne({ id: user.id }, { $set: { 'branches.$[].isActive': false } })
      await db.collection('users').updateOne(
        { id: user.id, 'branches.branchCode': branchCode },
        { $set: { 'branches.$.isActive': true } }
      )
      const updated = await db.collection('users').findOne({ id: user.id })
      return json({ user: sanitizeUser(updated) })
    }

    // ============ TOPICS ============
    if (route === '/topics' && method === 'GET') {
      const branch = url.searchParams.get('branch') || 'CS'
      if (branch === 'CS') {
        return json({ subjects: CS_SUBJECTS, topics: getAllCSTopics(), total: TOTAL_CS_TOPICS })
      }
      return json({ subjects: [], topics: [], total: 0 })
    }

    if (route === '/topics/complete' && method === 'POST') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const { topicId, subject, topicName } = body
      const branchCode = VALID_BRANCHES.includes(body.branchCode) ? body.branchCode : 'CS'
      if (!topicId) return json({ error: 'topicId required' }, { status: 400 })
      const branch = user.branches.find((b) => b.branchCode === branchCode)
      if (!branch) return json({ error: 'Branch not found' }, { status: 404 })
      if (branch.completedTopics.includes(topicId)) {
        return json({ user: sanitizeUser(user), alreadyCompleted: true })
      }
      await db.collection('users').updateOne(
        { id: user.id, 'branches.branchCode': branchCode },
        { $addToSet: { 'branches.$.completedTopics': topicId }, $inc: { 'branches.$.xp': TOPIC_XP } }
      )
      const updated = await updateStreak(db, await db.collection('users').findOne({ id: user.id }), branchCode)
      await emitActivity(db, updated, branchCode, 'completed', subject, topicName, TOPIC_XP)
      return json({ user: sanitizeUser(updated), xpEarned: TOPIC_XP })
    }

    if (route === '/topics/complete' && method === 'DELETE') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const { topicId } = body
      const branchCode = VALID_BRANCHES.includes(body.branchCode) ? body.branchCode : 'CS'
      const branch = user.branches.find((b) => b.branchCode === branchCode)
      // Only decrement XP if the topic was actually completed (fixes audit M-1:
      // prevents XP from going negative on repeated/invalid deletes).
      if (!branch || !branch.completedTopics.includes(topicId)) {
        return json({ user: sanitizeUser(user), notCompleted: true })
      }
      await db.collection('users').updateOne(
        { id: user.id, 'branches.branchCode': branchCode },
        { $pull: { 'branches.$.completedTopics': topicId }, $inc: { 'branches.$.xp': -TOPIC_XP } }
      )
      const updated = await db.collection('users').findOne({ id: user.id })
      return json({ user: sanitizeUser(updated) })
    }

    if (route === '/topics/revise' && method === 'POST') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const { topicId, subject, topicName } = body
      const branchCode = VALID_BRANCHES.includes(body.branchCode) ? body.branchCode : 'CS'
      if (!topicId) return json({ error: 'topicId required' }, { status: 400 })
      const branch = user.branches.find((b) => b.branchCode === branchCode)
      if (!branch) return json({ error: 'Branch not found' }, { status: 404 })
      // Only award XP the first time a topic is revised (fixes audit M-2:
      // prevents infinite XP farming by re-revising the same topic).
      const alreadyRevised = (branch.revisedTopics || []).includes(topicId)
      const inc = alreadyRevised ? {} : { 'branches.$.xp': TOPIC_XP }
      await db.collection('users').updateOne(
        { id: user.id, 'branches.branchCode': branchCode },
        { $addToSet: { 'branches.$.revisedTopics': topicId }, ...(alreadyRevised ? {} : { $inc: inc }) }
      )
      const updated = await updateStreak(db, await db.collection('users').findOne({ id: user.id }), branchCode)
      if (!alreadyRevised) await emitActivity(db, updated, branchCode, 'revised', subject, topicName, TOPIC_XP)
      return json({ user: sanitizeUser(updated), xpEarned: alreadyRevised ? 0 : TOPIC_XP })
    }

    // ============ SESSIONS ============
    if (route === '/sessions' && method === 'POST') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const branchCode = VALID_BRANCHES.includes(body.branchCode) ? body.branchCode : 'CS'
      const durationMinutes = clampDuration(body.durationMinutes)
      const session = {
        id: uuidv4(),
        userId: user.id,
        branchCode,
        subject: sanitizeString(body.subject || '', 200),
        topic: sanitizeString(body.topic || '', 300),
        durationMinutes,
        type: ['study', 'revision', 'practice', 'mock'].includes(body.type) ? body.type : 'study',
        source: sanitizeString(body.source || 'timer', 40),
        youtubeUrl: sanitizeUrl(body.youtubeUrl || '') || null,
        date: todayISO(),
        createdAt: new Date().toISOString(),
      }
      await db.collection('study_sessions').insertOne(session)
      const xp = sessionXp(durationMinutes)
      if (xp > 0) {
        await db.collection('users').updateOne(
          { id: user.id, 'branches.branchCode': branchCode },
          { $inc: { 'branches.$.xp': xp } }
        )
      }
      const updated = await updateStreak(db, await db.collection('users').findOne({ id: user.id }), branchCode)
      await emitActivity(db, updated, branchCode, 'logged', session.subject, session.topic, xp)
      const { _id, ...sess } = session
      return json({ session: sess, user: sanitizeUser(updated) })
    }

    if (route === '/sessions' && method === 'GET') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const range = url.searchParams.get('range') || 'today'
      let query = { userId: user.id }
      if (range === 'today') query.date = todayISO()
      else if (range === 'week') {
        const days = []
        for (let i = 0; i < 7; i++) { const d = new Date(); d.setUTCDate(d.getUTCDate() - i); days.push(todayISO(d)) }
        query.date = { $in: days }
      } else if (range === 'prevweek') {
        const days = []
        for (let i = 7; i < 14; i++) { const d = new Date(); d.setUTCDate(d.getUTCDate() - i); days.push(todayISO(d)) }
        query.date = { $in: days }
      }
      const sessions = await db.collection('study_sessions').find(query).sort({ createdAt: -1 }).limit(1000).toArray()
      const cleaned = sessions.map(({ _id, ...rest }) => rest)
      return json({ sessions: cleaned })
    }

    // ============ STATS ============
    if (route === '/stats/snapshot' && method === 'GET') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const branchCode = VALID_BRANCHES.includes(url.searchParams.get('branch')) ? url.searchParams.get('branch') : 'CS'
      const today = todayISO()
      const sessions = await db.collection('study_sessions').find({ userId: user.id, date: today, branchCode }).toArray()
      const totalMinutes = sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0)
      const subjects = new Set(sessions.map((s) => s.subject)).size
      const branch = user?.branches?.find((b) => b.branchCode === branchCode)
      return json({
        totalMinutes,
        sessions: sessions.length,
        subjectsTouched: subjects,
        dailyGoalMinutes: user?.dailyGoalMinutes || 360,
        streak: branch?.streak || 0,
        maxStreak: branch?.maxStreak || 0,
        xp: branch?.xp || 0,
        completedTopics: branch?.completedTopics?.length || 0,
      })
    }

    if (route === '/stats/heatmap' && method === 'GET') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      // Bound the scan to the last ~13 months so this never loads a user's
      // entire history unboundedly (audit M-5).
      const cutoff = new Date(); cutoff.setUTCDate(cutoff.getUTCDate() - 400)
      const cutoffISO = todayISO(cutoff)
      const sessions = await db.collection('study_sessions')
        .find({ userId: user.id, date: { $gte: cutoffISO } }).limit(5000).toArray()
      const events = await db.collection('activity_events')
        .find({ userId: user.id, createdAt: { $gte: new Date(cutoff) } }).limit(5000).toArray()
      const map = {}
      sessions.forEach((s) => {
        const d = s.date
        if (!map[d]) map[d] = { minutes: 0, topics: 0 }
        map[d].minutes += s.durationMinutes || 0
      })
      events.forEach((e) => {
        const d = new Date(e.createdAt).toISOString().split('T')[0]
        if (!map[d]) map[d] = { minutes: 0, topics: 0 }
        if (e.action === 'completed' || e.action === 'revised') map[d].topics += 1
      })
      return json({ heatmap: map })
    }

    if (route === '/stats/users' && method === 'GET') {
      const total = await db.collection('users').countDocuments()
      const all = await db.collection('users').find({}, { projection: { branches: 1 } }).toArray()
      const byBranch = { CS: 0, DA: 0, ECE: 0, EE: 0, ME: 0, CE: 0 }
      all.forEach((u) => {
        (u.branches || []).forEach((b) => {
          if (byBranch[b.branchCode] !== undefined) byBranch[b.branchCode] += 1
        })
      })
      // Report the real user count (audit M-3: removed fabricated +1317 inflation).
      return json({ total, byBranch })
    }

    if (route === '/stats/roi' && method === 'GET') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const branchCode = VALID_BRANCHES.includes(url.searchParams.get('branch')) ? url.searchParams.get('branch') : 'CS'
      const branch = user?.branches?.find((b) => b.branchCode === branchCode)
      const completed = new Set(branch?.completedTopics || [])
      const allTopics = getAllCSTopics()
      const bySubject = {}
      allTopics.forEach((t) => {
        if (!bySubject[t.subjectKey]) bySubject[t.subjectKey] = { total: 0, completed: 0, info: CS_SUBJECTS.find((s) => s.key === t.subjectKey) }
        bySubject[t.subjectKey].total += 1
        if (completed.has(t.id)) bySubject[t.subjectKey].completed += 1
      })
      const roi = Object.entries(bySubject).map(([key, v]) => {
        const pct = v.completed / v.total
        const pendingMarks = v.info.avgMarks * (1 - pct)
        const remainingTopics = v.total - v.completed
        const score = remainingTopics > 0 ? Math.round((pendingMarks / remainingTopics) * 10 * (v.info.weightage / 10)) * 5 : 0
        let tier = 'Low'
        if (score >= 80) tier = 'Extremely High'
        else if (score >= 60) tier = 'High'
        else if (score >= 45) tier = 'Medium'
        return { ...v.info, pendingMarks: Math.round(pendingMarks * 10) / 10, score, tier, completed: v.completed, total: v.total }
      })
      roi.sort((a, b) => b.score - a.score)
      return json({ roi })
    }

    // ============ ACTIVITY ============
    if (route === '/activity/recent' && method === 'GET') {
      const events = await db.collection('activity_events').find({}).sort({ createdAt: -1 }).limit(20).toArray()
      const cleaned = events.map(({ _id, ...rest }) => rest)
      return json({ events: cleaned })
    }

    // ============ COMMUNITY ============
    if (route === '/community/posts' && method === 'GET') {
      const posts = await db.collection('community_posts').find({}).sort({ createdAt: -1 }).limit(100).toArray()
      const cleaned = posts.map(({ _id, ...rest }) => rest)
      return json({ posts: cleaned })
    }

    if (route === '/community/posts' && method === 'POST') {
      const user = await requireUser(request, db)
      if (!user) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const title = sanitizeString(body.title || '', 200)
      if (!title) return json({ error: 'Title required' }, { status: 400 })
      const branchCode = VALID_BRANCHES.includes(body.branchCode) ? body.branchCode : 'CS'
      const tags = Array.isArray(body.tags) ? body.tags.slice(0, 10).map((t) => sanitizeString(String(t), 40)) : []
      const post = {
        id: uuidv4(),
        userId: user.id,
        username: user.username, // server-derived, never trust client
        branchCode,
        type: ['Doubt', 'Discussion', 'Resource'].includes(body.type) ? body.type : 'Doubt',
        title,
        body: sanitizeString(body.content || '', 5000),
        tags,
        upvotes: 0, downvotes: 0, views: 0, replies: [],
        createdAt: new Date().toISOString(),
      }
      await db.collection('community_posts').insertOne(post)
      const { _id, ...clean } = post
      return json({ post: clean })
    }

    if (route === '/community/leaderboard' && method === 'GET') {
      const branchCode = VALID_BRANCHES.includes(url.searchParams.get('branch')) ? url.searchParams.get('branch') : 'CS'
      // Only project the fields needed and cap the scan.
      const users = await db.collection('users')
        .find({ 'branches.branchCode': branchCode }, { projection: { username: 1, branches: 1 } })
        .limit(5000).toArray()
      const board = users.map((u) => {
        const b = u.branches.find((x) => x.branchCode === branchCode) || {}
        return {
          username: u.username,
          xp: b.xp || 0,
          completed: (b.completedTopics || []).length,
          streak: b.streak || 0,
          level: Math.floor((b.xp || 0) / 100) + 1,
        }
      })
      board.sort((a, b) => b.xp - a.xp || b.completed - a.completed)
      return json({ leaderboard: board.slice(0, 100) })
    }

    // ============ ADMIN AUTH ============
    if (route === '/admin/login' && method === 'POST') {
      if (!rateLimit(clientKey(request, 'admin-login'), 5, 60000)) {
        return json({ error: 'Too many attempts.' }, { status: 429 })
      }
      await ensureSeedAdmin(db)
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').toLowerCase().trim()
      const password = body.password || ''
      const admin = await db.collection('admins').findOne({ email })
      if (!admin || !verifyPassword(password, admin.passwordSalt, admin.passwordHash)) {
        return json({ error: 'Invalid admin credentials.' }, { status: 401 })
      }
      await db.collection('admins').updateOne({ id: admin.id }, { $set: { lastLogin: new Date().toISOString() } })
      const token = signToken({ adminId: admin.id, role: admin.role }, requireSecret(ADMIN_SECRET, 'ADMIN_SECRET'), 60 * 60 * 8)
      await logAudit(db, admin.id, 'admin.login')
      const { passwordHash, passwordSalt, _id, ...safe } = admin
      return json({ admin: safe, token })
    }

    if (route === '/admin/me' && method === 'GET') {
      const admin = await requireAdmin(request, db)
      if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      return json({ admin })
    }

    if (route === '/admin/password' && method === 'PATCH') {
      const admin = await requireAdmin(request, db)
      if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const pe = passwordStrength(body.newPassword); if (pe) return json({ error: pe }, { status: 400 })
      const { salt, hash } = hashPassword(body.newPassword)
      await db.collection('admins').updateOne({ id: admin.id }, { $set: { passwordSalt: salt, passwordHash: hash, mustChangePassword: false, passwordChangedAt: new Date().toISOString() } })
      await logAudit(db, admin.id, 'admin.password_change')
      return json({ ok: true })
    }

    // ============ ADMIN: USERS ============
    if (route === '/admin/users' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const q = sanitizeString(url.searchParams.get('q') || '', 100)
      // Escape regex metacharacters to prevent ReDoS / injection via $regex.
      const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const filter = safeQ ? { $or: [{ email: { $regex: safeQ, $options: 'i' } }, { username: { $regex: safeQ, $options: 'i' } }] } : {}
      const users = await db.collection('users').find(filter, { projection: { passwordHash: 0, passwordSalt: 0 } }).sort({ createdAt: -1 }).limit(200).toArray()
      return json({ users: users.map(({ _id, ...r }) => r) })
    }

    if (route.match(/^\/admin\/users\/[^/]+\/suspend$/) && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const userId = route.split('/')[3]
      const body = await request.json().catch(() => ({}))
      await db.collection('users').updateOne({ id: userId }, { $set: { suspended: !!body.suspended } })
      await logAudit(db, admin.id, body.suspended ? 'user.suspend' : 'user.reactivate', userId)
      return json({ ok: true })
    }

    // ============ ADMIN: YOUTUBE ============
    if (route === '/admin/youtube' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const list = await db.collection('youtube_videos').find({}).sort({ pinned: -1, createdAt: -1 }).toArray()
      return json({ videos: list.map(({ _id, ...r }) => r) })
    }
    if (route === '/admin/youtube' && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const item = {
        id: uuidv4(),
        title: sanitizeString(body.title, 200),
        url: sanitizeUrl(body.url, 500),
        category: sanitizeString(body.category, 50) || 'General',
        branchCode: VALID_BRANCHES.includes(body.branchCode) ? body.branchCode : 'CS',
        featured: !!body.featured,
        pinned: !!body.pinned,
        createdAt: new Date().toISOString(),
      }
      await db.collection('youtube_videos').insertOne(item)
      await logAudit(db, admin.id, 'youtube.create', item.id)
      const { _id, ...clean } = item
      return json({ video: clean })
    }
    if (route.match(/^\/admin\/youtube\/[^/]+$/) && method === 'PATCH') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))
      const upd = {}
      if (body.title !== undefined) upd.title = sanitizeString(body.title, 200)
      if (body.url !== undefined) upd.url = sanitizeUrl(body.url, 500)
      if (body.category !== undefined) upd.category = sanitizeString(body.category, 50)
      if (body.branchCode !== undefined && VALID_BRANCHES.includes(body.branchCode)) upd.branchCode = body.branchCode
      if (body.featured !== undefined) upd.featured = !!body.featured
      if (body.pinned !== undefined) upd.pinned = !!body.pinned
      await db.collection('youtube_videos').updateOne({ id }, { $set: upd })
      await logAudit(db, admin.id, 'youtube.update', id, upd)
      return json({ ok: true })
    }
    if (route.match(/^\/admin\/youtube\/[^/]+$/) && method === 'DELETE') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const id = route.split('/')[3]
      await db.collection('youtube_videos').deleteOne({ id })
      await logAudit(db, admin.id, 'youtube.delete', id)
      return json({ ok: true })
    }

    // ============ ADMIN: QUOTES ============
    if (route === '/admin/quotes' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const list = await db.collection('quotes').find({}).sort({ featured: -1, createdAt: -1 }).toArray()
      return json({ quotes: list.map(({ _id, ...r }) => r) })
    }
    if (route === '/admin/quotes' && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const item = {
        id: uuidv4(),
        text: sanitizeString(body.text, 500),
        author: sanitizeString(body.author, 100) || 'Anonymous',
        featured: !!body.featured,
        active: body.active !== false,
        createdAt: new Date().toISOString(),
      }
      if (!item.text) return json({ error: 'Quote text required' }, { status: 400 })
      await db.collection('quotes').insertOne(item)
      await logAudit(db, admin.id, 'quote.create', item.id)
      const { _id, ...clean } = item
      return json({ quote: clean })
    }
    if (route.match(/^\/admin\/quotes\/[^/]+$/) && method === 'PATCH') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))
      const upd = {}
      if (body.text !== undefined) upd.text = sanitizeString(body.text, 500)
      if (body.author !== undefined) upd.author = sanitizeString(body.author, 100)
      if (body.featured !== undefined) upd.featured = !!body.featured
      if (body.active !== undefined) upd.active = !!body.active
      await db.collection('quotes').updateOne({ id }, { $set: upd })
      await logAudit(db, admin.id, 'quote.update', id)
      return json({ ok: true })
    }
    if (route.match(/^\/admin\/quotes\/[^/]+$/) && method === 'DELETE') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const id = route.split('/')[3]
      await db.collection('quotes').deleteOne({ id })
      await logAudit(db, admin.id, 'quote.delete', id)
      return json({ ok: true })
    }

    // ============ ADMIN: ANNOUNCEMENTS ============
    if (route === '/admin/announcements' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const list = await db.collection('announcements').find({}).sort({ pinned: -1, createdAt: -1 }).toArray()
      return json({ announcements: list.map(({ _id, ...r }) => r) })
    }
    if (route === '/admin/announcements' && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const body = await request.json().catch(() => ({}))
      const item = {
        id: uuidv4(),
        title: sanitizeString(body.title, 200),
        body: sanitizeString(body.body, 2000),
        tone: ['info', 'success', 'warn', 'critical'].includes(body.tone) ? body.tone : 'info',
        active: body.active !== false,
        pinned: !!body.pinned,
        startsAt: body.startsAt || null,
        endsAt: body.endsAt || null,
        createdAt: new Date().toISOString(),
      }
      if (!item.title) return json({ error: 'Title required' }, { status: 400 })
      await db.collection('announcements').insertOne(item)
      await logAudit(db, admin.id, 'announcement.create', item.id)
      const { _id, ...clean } = item
      return json({ announcement: clean })
    }
    if (route.match(/^\/admin\/announcements\/[^/]+$/) && method === 'PATCH') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))
      const upd = {}
      for (const k of ['title', 'body']) if (body[k] !== undefined) upd[k] = sanitizeString(body[k], k === 'title' ? 200 : 2000)
      for (const k of ['active', 'pinned']) if (body[k] !== undefined) upd[k] = !!body[k]
      if (body.tone !== undefined && ['info', 'success', 'warn', 'critical'].includes(body.tone)) upd.tone = body.tone
      for (const k of ['startsAt', 'endsAt']) if (body[k] !== undefined) upd[k] = body[k]
      await db.collection('announcements').updateOne({ id }, { $set: upd })
      await logAudit(db, admin.id, 'announcement.update', id)
      return json({ ok: true })
    }
    if (route.match(/^\/admin\/announcements\/[^/]+$/) && method === 'DELETE') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const id = route.split('/')[3]
      await db.collection('announcements').deleteOne({ id })
      await logAudit(db, admin.id, 'announcement.delete', id)
      return json({ ok: true })
    }

    // ============ ADMIN: ANALYTICS ============
    if (route === '/admin/analytics' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const totalUsers = await db.collection('users').countDocuments()
      const since24 = new Date(Date.now() - 86400000).toISOString()
      const activeUsers = await db.collection('users').countDocuments({ 'branches.lastActiveDate': { $gte: since24 } })
      const totalSessions = await db.collection('study_sessions').countDocuments()
      const totalPosts = await db.collection('community_posts').countDocuments()
      const totalMinutes = await db.collection('study_sessions').aggregate([{ $group: { _id: null, m: { $sum: '$durationMinutes' } } }]).toArray()
      const byBranch = { CS: 0, DA: 0, ECE: 0, EE: 0, ME: 0, CE: 0 }
      const all = await db.collection('users').find({}, { projection: { branches: 1 } }).toArray()
      all.forEach((u) => (u.branches || []).forEach((b) => { if (byBranch[b.branchCode] !== undefined) byBranch[b.branchCode] += 1 }))
      const recentSignups = await db.collection('users').find({}, { projection: { createdAt: 1 } }).sort({ createdAt: -1 }).limit(30).toArray()
      const signupsByDay = {}
      recentSignups.forEach((u) => { const d = (u.createdAt || '').split('T')[0]; signupsByDay[d] = (signupsByDay[d] || 0) + 1 })
      const audit = await db.collection('audit_logs').find({}).sort({ createdAt: -1 }).limit(30).toArray()
      return json({
        totals: { users: totalUsers, activeUsers, sessions: totalSessions, posts: totalPosts, minutes: totalMinutes[0]?.m || 0 },
        byBranch,
        signupsByDay,
        auditLog: audit.map(({ _id, ...r }) => r),
      })
    }

    // ============ PUBLIC CONTENT ============
    if (route === '/content/quote' && method === 'GET') {
      const list = await db.collection('quotes').find({ active: true }).toArray()
      if (!list.length) return json({ quote: null })
      const featured = list.filter((q) => q.featured)
      const pool = featured.length ? featured : list
      const pick = pool[Math.floor(Math.random() * pool.length)]
      const { _id, ...r } = pick
      return json({ quote: r })
    }
    if (route === '/content/announcements' && method === 'GET') {
      const now = new Date().toISOString()
      const list = await db.collection('announcements').find({
        active: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      }).sort({ pinned: -1, createdAt: -1 }).limit(5).toArray()
      return json({ announcements: list.map(({ _id, ...r }) => r) })
    }
    if (route === '/content/youtube' && method === 'GET') {
      const branch = url.searchParams.get('branch')
      const filter = VALID_BRANCHES.includes(branch) ? { branchCode: branch } : {}
      const list = await db.collection('youtube_videos').find(filter).sort({ pinned: -1, featured: -1, createdAt: -1 }).limit(50).toArray()
      return json({ videos: list.map(({ _id, ...r }) => r) })
    }

    // ============ CLOUDINARY UPLOAD SIGNATURE ============
    if (route === '/admin/upload-signature' && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      if (!rateLimit(clientKey(request, 'upload-sig'), 60, 60000)) return json({ error: 'Rate limit' }, { status: 429 })
      const body = await request.json().catch(() => ({}))
      const folder = sanitizeString(body.folder || 'gateplus/general', 80).replace(/[^a-zA-Z0-9/_-]/g, '')
      const resourceType = ['image', 'auto', 'raw'].includes(body.resourceType) ? body.resourceType : 'auto'
      const timestamp = Math.floor(Date.now() / 1000)
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME
      const apiKey = process.env.CLOUDINARY_API_KEY
      const apiSecret = process.env.CLOUDINARY_API_SECRET
      if (!cloudName || !apiKey || !apiSecret) {
        return json({ error: 'Cloudinary not configured' }, { status: 500 })
      }
      const params = { folder, timestamp }
      const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&')
      const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')
      await logAudit(db, admin.id, 'upload.sign', null, { folder, resourceType })
      return json({
        cloudName, apiKey, timestamp, signature, folder, resourceType,
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      })
    }

    // ============ GENERIC CMS COLLECTIONS ============
    const CMS_COLLECTIONS = {
      books: { fields: ['branchCode', 'title', 'author', 'amazonUrl', 'coverUrl'], urlFields: ['amazonUrl', 'coverUrl'] },
      pyqs: { fields: ['branchCode', 'year', 'shift', 'title', 'paperUrl', 'solutionUrl', 'coverUrl'], urlFields: ['paperUrl', 'solutionUrl', 'coverUrl'] },
      revision_sheets: { fields: ['branchCode', 'subjectKey', 'subject', 'topic', 'title', 'pdfUrl', 'coverUrl'], urlFields: ['pdfUrl', 'coverUrl'] },
      short_notes: { fields: ['branchCode', 'subjectKey', 'subject', 'topic', 'title', 'pdfUrl', 'coverUrl'], urlFields: ['pdfUrl', 'coverUrl'] },
      videos: { fields: ['branchCode', 'subjectKey', 'subject', 'topic', 'title', 'youtubeUrl', 'provider', 'featured', 'pinned'], urlFields: ['youtubeUrl'] },
      mock_tests: { fields: ['branchCode', 'title', 'durationMinutes', 'questionCount', 'marks', 'status', 'coverUrl', 'paperUrl'], urlFields: ['coverUrl', 'paperUrl'] },
      settings: { fields: ['key', 'value'], singletonByKey: true, urlFields: [] },
    }

    function buildCmsItem(collKey, body, existing = null) {
      const conf = CMS_COLLECTIONS[collKey]
      const urlFields = conf.urlFields || []
      const item = existing ? { ...existing } : { id: uuidv4(), createdAt: new Date().toISOString() }
      conf.fields.forEach((f) => {
        if (body[f] !== undefined) {
          if (urlFields.includes(f)) item[f] = sanitizeUrl(String(body[f] ?? ''), 2000)
          else if (typeof body[f] === 'string') item[f] = sanitizeString(body[f], 2000)
          else if (typeof body[f] === 'number') item[f] = body[f]
          else if (typeof body[f] === 'boolean') item[f] = !!body[f]
          else item[f] = body[f]
        }
      })
      item.updatedAt = new Date().toISOString()
      return item
    }

    // PUBLIC list (no auth): GET /cms/:coll
    const publicMatch = route.match(/^\/cms\/([a-z_]+)$/)
    if (publicMatch && method === 'GET') {
      const collKey = publicMatch[1]
      if (!CMS_COLLECTIONS[collKey]) return json({ error: 'Unknown collection' }, { status: 404 })
      const filter = {}
      for (const f of ['branchCode', 'subjectKey', 'topic', 'year']) {
        const v = url.searchParams.get(f)
        if (v) filter[f] = (f === 'year' && !isNaN(Number(v))) ? Number(v) : sanitizeString(v, 100)
      }
      const items = await db.collection(`cms_${collKey}`).find(filter).sort({ pinned: -1, featured: -1, createdAt: -1 }).limit(500).toArray()
      return json({ items: items.map(({ _id, ...r }) => r) })
    }

    // ADMIN CRUD: POST/PATCH/DELETE /admin/cms/:coll[/:id]
    const adminMatch = route.match(/^\/admin\/cms\/([a-z_]+)(?:\/([^/]+))?$/)
    if (adminMatch) {
      const collKey = adminMatch[1]
      const itemId = adminMatch[2]
      if (!CMS_COLLECTIONS[collKey]) return json({ error: 'Unknown collection' }, { status: 404 })
      const admin = await requireAdmin(request, db); if (!admin) return json({ error: 'Unauthorized' }, { status: 401 })
      const coll = db.collection(`cms_${collKey}`)
      if (method === 'GET') {
        const items = await coll.find({}).sort({ createdAt: -1 }).limit(1000).toArray()
        return json({ items: items.map(({ _id, ...r }) => r) })
      }
      if (method === 'POST') {
        const body = await request.json().catch(() => ({}))
        const item = buildCmsItem(collKey, body)
        if (CMS_COLLECTIONS[collKey].singletonByKey && item.key) {
          await coll.updateOne({ key: item.key }, { $set: item }, { upsert: true })
          await logAudit(db, admin.id, `cms.${collKey}.upsert`, item.key)
          return json({ item })
        }
        await coll.insertOne(item)
        await logAudit(db, admin.id, `cms.${collKey}.create`, item.id)
        const { _id, ...clean } = item
        return json({ item: clean })
      }
      if (method === 'PATCH' && itemId) {
        const body = await request.json().catch(() => ({}))
        const existing = await coll.findOne({ id: itemId })
        if (!existing) return json({ error: 'Not found' }, { status: 404 })
        const item = buildCmsItem(collKey, body, existing)
        delete item._id
        await coll.updateOne({ id: itemId }, { $set: item })
        await logAudit(db, admin.id, `cms.${collKey}.update`, itemId)
        const { _id, ...clean } = item
        return json({ item: clean })
      }
      if (method === 'DELETE' && itemId) {
        await coll.deleteOne({ id: itemId })
        await logAudit(db, admin.id, `cms.${collKey}.delete`, itemId)
        return json({ ok: true })
      }
    }

    // PUBLIC SETTINGS singleton: GET /cms/settings/:key
    const settingMatch = route.match(/^\/cms\/settings\/([a-zA-Z0-9_-]+)$/)
    if (settingMatch && method === 'GET') {
      const key = settingMatch[1]
      const row = await db.collection('cms_settings').findOne({ key })
      return json({ value: row?.value ?? null })
    }

    return json({ error: `Route ${route} not found` }, { status: 404 })
  } catch (error) {
    console.error('API Error:', error)
    // Do not leak internal error details to clients in production.
    const detail = process.env.NODE_ENV === 'production' ? undefined : error.message
    return applyCORS(NextResponse.json({ error: 'Internal server error', ...(detail ? { detail } : {}) }, { status: 500 }), request)
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
