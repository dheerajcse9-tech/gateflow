import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { BRANCHES, CS_SUBJECTS, getAllCSTopics, TOTAL_CS_TOPICS, TARGET_DATES } from '@/lib/seedData'

let client
let db
let connecting

async function connectToMongo() {
  if (db) return db
  if (!connecting) {
    connecting = (async () => {
      const c = new MongoClient(process.env.MONGO_URL)
      await c.connect()
      client = c
      db = c.db(process.env.DB_NAME || 'gateplus')
      return db
    })()
  }
  return connecting
}

function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex')
  const h = crypto.scryptSync(password, s, 32).toString('hex')
  return { salt: s, hash: h }
}

function verifyPassword(password, salt, hash) {
  const h = crypto.scryptSync(password, salt, 32).toString('hex')
  return h === hash
}

function genUsername(email, branch) {
  const prefix = (email.split('@')[0] || 'user').toLowerCase().replace(/[^a-z0-9]/g, '')
  const num = Math.floor(Math.random() * 900) + 100
  return `${prefix}${branch.toLowerCase()}_${num}`
}

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function daysBetween(d1, d2) {
  const a = new Date(d1).setHours(0, 0, 0, 0)
  const b = new Date(d2).setHours(0, 0, 0, 0)
  return Math.round((b - a) / 86400000)
}

function sanitizeUser(user) {
  if (!user) return null
  const { _id, passwordHash, passwordSalt, ...rest } = user
  return rest
}

// ===== Security helpers =====
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'gp-sunrise-admin-secret-change-me-2026'
const USER_SECRET = process.env.USER_SECRET || 'gp-sunrise-user-secret-change-me-2026'

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}
function b64uDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64').toString()
}
function signToken(payload, secret, ttlSec = 60 * 60 * 8) {
  const body = { ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + ttlSec }
  const enc = base64url(JSON.stringify(body))
  const sig = base64url(crypto.createHmac('sha256', secret).update(enc).digest())
  return `${enc}.${sig}`
}
function verifyToken(token, secret) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [enc, sig] = token.split('.')
  const expected = base64url(crypto.createHmac('sha256', secret).update(enc).digest())
  if (sig !== expected) return null
  try {
    const payload = JSON.parse(b64uDecode(enc))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}
function getBearer(request) {
  const h = request.headers.get('authorization') || ''
  if (h.startsWith('Bearer ')) return h.slice(7)
  return null
}

function sanitizeString(s, maxLen = 2000) {
  if (typeof s !== 'string') return ''
  return s.slice(0, maxLen)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/?(iframe|object|embed|link|meta)[^>]*>/gi, '')
    .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/on\w+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
}
function isValidEmail(e) { return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254 }
function passwordStrength(p) {
  if (typeof p !== 'string' || p.length < 6 || p.length > 200) return 'Password must be 6-200 characters'
  return null
}

// ===== Rate limiting (in-memory, per-process) =====
const rateBuckets = new Map()
function rateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now()
  const arr = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs)
  arr.push(now)
  rateBuckets.set(key, arr)
  // GC occasionally
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
    const { salt, hash } = hashPassword('admin123')
    await db.collection('admins').insertOne({
      id: uuidv4(),
      email: 'admin@gateplus.local',
      name: 'Root Admin',
      role: 'superadmin',
      passwordSalt: salt,
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    })
  }
}

async function requireAdmin(request, db) {
  const token = getBearer(request)
  const payload = verifyToken(token, ADMIN_SECRET)
  if (!payload || !payload.adminId) return null
  const admin = await db.collection('admins').findOne({ id: payload.adminId })
  if (!admin) return null
  const { passwordHash, passwordSalt, _id, ...rest } = admin
  return rest
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

// Update streak based on current activity
async function updateStreak(db, user, branchCode) {
  const today = todayISO()
  const branch = user.branches.find((b) => b.branchCode === branchCode)
  if (!branch) return user

  const last = branch.lastActiveDate ? branch.lastActiveDate.split('T')[0] : null
  if (last === today) {
    return user // already active today
  }

  let newStreak = 1
  if (last) {
    const diff = daysBetween(last, today)
    if (diff === 1) newStreak = (branch.streak || 0) + 1
    else if (diff === 0) newStreak = branch.streak || 1
    else newStreak = 1
  }
  const maxStreak = Math.max(branch.maxStreak || 0, newStreak)

  await db.collection('users').updateOne(
    { id: user.id, 'branches.branchCode': branchCode },
    {
      $set: {
        'branches.$.streak': newStreak,
        'branches.$.maxStreak': maxStreak,
        'branches.$.lastActiveDate': new Date().toISOString(),
      },
      $inc: { totalActiveDays: 1 },
    }
  )
  return await db.collection('users').findOne({ id: user.id })
}

async function handleRoute(request, { params }) {
  const resolvedParams = await params
  const { path = [] } = resolvedParams
  const route = `/${path.join('/')}`
  const method = request.method
  const url = new URL(request.url)

  try {
    const db = await connectToMongo()

    // ============ ROOT ============
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: 'GatePlus API' }))
    }

    // ============ AUTH ============
    if (route === '/auth/signup' && method === 'POST') {
      if (!rateLimit(clientKey(request, 'signup'), 5, 60000)) {
        return handleCORS(NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 }))
      }
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').toLowerCase().trim()
      const password = body.password || ''
      const branchCode = ['CS','DA','ECE','EE','ME','CE'].includes(body.branchCode) ? body.branchCode : 'CS'
      const targetYear = [2026, 2027, 2028].includes(Number(body.targetYear)) ? Number(body.targetYear) : 2027
      if (!isValidEmail(email)) return handleCORS(NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 }))
      const pe = passwordStrength(password); if (pe) return handleCORS(NextResponse.json({ error: pe }, { status: 400 }))
      const existing = await db.collection('users').findOne({ email })
      if (existing) {
        return handleCORS(NextResponse.json({ error: 'An account with this email already exists. Sign In instead.' }, { status: 409 }))
      }
      const { salt, hash } = hashPassword(password)
      const username = genUsername(email, branchCode)
      const user = {
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
      await db.collection('users').insertOne(user)
      const token = signToken({ userId: user.id }, USER_SECRET, 60 * 60 * 24 * 7)
      return handleCORS(NextResponse.json({ user: sanitizeUser(user), token }))
    }

    if (route === '/auth/google' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { credential } = body
      if (!credential) {
        return handleCORS(NextResponse.json({ error: 'Missing credential token.' }, { status: 400 }))
      }
      try {
        const { OAuth2Client } = require('google-auth-library')
        const clientId = process.env.GOOGLE_CLIENT_ID || '148149511115-kgdjutjp7dprqq1cvqlec5l5r45vat2r.apps.googleusercontent.com'
        const client = new OAuth2Client(clientId)
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: clientId,
        })
        const payload = ticket.getPayload()
        if (!payload || !payload.email) {
          return handleCORS(NextResponse.json({ error: 'Invalid token payload.' }, { status: 400 }))
        }
        const email = payload.email.toLowerCase().trim()
        const name = payload.name || email.split('@')[0]
        let user = await db.collection('users').findOne({ email })
        if (!user) {
          const branchCode = 'CS'
          const targetYear = 2027
          const username = name.replace(/\s+/g, '_') + '_' + Math.floor(100 + Math.random() * 900)
          user = {
            id: uuidv4(),
            email,
            username,
            passwordSalt: null,
            passwordHash: null,
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
          await db.collection('users').insertOne(user)
        }
        if (user.suspended) {
          return handleCORS(NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 }))
        }
        const token = signToken({ userId: user.id }, USER_SECRET, 60 * 60 * 24 * 7)
        return handleCORS(NextResponse.json({ user: sanitizeUser(user), token }))
      } catch (err) {
        console.error('Google verification error:', err)
        return handleCORS(NextResponse.json({ error: 'Google authentication failed. Please try again.' }, { status: 401 }))
      }
    }

    if (route === '/auth/login' && method === 'POST') {
      if (!rateLimit(clientKey(request, 'login'), 8, 60000)) {
        return handleCORS(NextResponse.json({ error: 'Too many attempts. Please wait a minute.' }, { status: 429 }))
      }
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').toLowerCase().trim()
      const password = body.password || ''
      if (!isValidEmail(email)) return handleCORS(NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 }))
      const user = await db.collection('users').findOne({ email })
      if (!user) return handleCORS(NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 }))
      if (user.suspended) return handleCORS(NextResponse.json({ error: 'Your account has been suspended. Contact support.' }, { status: 403 }))
      if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
        return handleCORS(NextResponse.json({ error: 'Account temporarily locked due to repeated failures. Try again later.' }, { status: 423 }))
      }
      if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        const attempts = (user.loginAttempts || 0) + 1
        const update = { $set: { loginAttempts: attempts } }
        if (attempts >= 5) {
          update.$set.lockUntil = new Date(Date.now() + 15 * 60000).toISOString()
          update.$set.loginAttempts = 0
        }
        await db.collection('users').updateOne({ id: user.id }, update)
        return handleCORS(NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 }))
      }
      await db.collection('users').updateOne({ id: user.id }, { $set: { loginAttempts: 0, lockUntil: null, lastLogin: new Date().toISOString() } })
      const token = signToken({ userId: user.id }, USER_SECRET, 60 * 60 * 24 * 7)
      return handleCORS(NextResponse.json({ user: sanitizeUser(user), token }))
    }

    // ============ USER ============
    if (route === '/user/me' && method === 'GET') {
      const userId = url.searchParams.get('userId')
      if (!userId) return handleCORS(NextResponse.json({ error: 'userId required' }, { status: 400 }))
      const user = await db.collection('users').findOne({ id: userId })
      if (!user) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      return handleCORS(NextResponse.json({ user: sanitizeUser(user) }))
    }

    if (route === '/user/goal' && method === 'PATCH') {
      const body = await request.json()
      const { userId, dailyGoalMinutes } = body
      await db.collection('users').updateOne({ id: userId }, { $set: { dailyGoalMinutes: Number(dailyGoalMinutes) } })
      const user = await db.collection('users').findOne({ id: userId })
      return handleCORS(NextResponse.json({ user: sanitizeUser(user) }))
    }

    if (route === '/user/branch/add' && method === 'POST') {
      const body = await request.json()
      const { userId, branchCode, targetYear } = body
      const user = await db.collection('users').findOne({ id: userId })
      if (!user) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      if (user.branches.some((b) => b.branchCode === branchCode)) {
        return handleCORS(NextResponse.json({ error: 'Branch already added' }, { status: 400 }))
      }
      const newBranch = {
        branchCode,
        targetYear: Number(targetYear) || 2027,
        xp: 0,
        level: 1,
        streak: 0,
        maxStreak: 0,
        lastActiveDate: null,
        completedTopics: [],
        revisedTopics: [],
        isActive: false,
      }
      await db.collection('users').updateOne({ id: userId }, { $push: { branches: newBranch } })
      const updated = await db.collection('users').findOne({ id: userId })
      return handleCORS(NextResponse.json({ user: sanitizeUser(updated) }))
    }

    if (route === '/user/branch/switch' && method === 'POST') {
      const body = await request.json()
      const { userId, branchCode } = body
      await db.collection('users').updateOne({ id: userId }, { $set: { 'branches.$[].isActive': false } })
      await db.collection('users').updateOne(
        { id: userId, 'branches.branchCode': branchCode },
        { $set: { 'branches.$.isActive': true } }
      )
      const updated = await db.collection('users').findOne({ id: userId })
      return handleCORS(NextResponse.json({ user: sanitizeUser(updated) }))
    }

    // ============ TOPICS ============
    if (route === '/topics' && method === 'GET') {
      const branch = url.searchParams.get('branch') || 'CS'
      if (branch === 'CS') {
        return handleCORS(NextResponse.json({
          subjects: CS_SUBJECTS,
          topics: getAllCSTopics(),
          total: TOTAL_CS_TOPICS,
        }))
      }
      return handleCORS(NextResponse.json({ subjects: [], topics: [], total: 0 }))
    }

    if (route === '/topics/complete' && method === 'POST') {
      const body = await request.json()
      const { userId, topicId, subject, topicName, branchCode = 'CS' } = body
      const user = await db.collection('users').findOne({ id: userId })
      if (!user) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      const branch = user.branches.find((b) => b.branchCode === branchCode)
      if (!branch) return handleCORS(NextResponse.json({ error: 'Branch not found' }, { status: 404 }))
      if (branch.completedTopics.includes(topicId)) {
        return handleCORS(NextResponse.json({ user: sanitizeUser(user), alreadyCompleted: true }))
      }
      await db.collection('users').updateOne(
        { id: userId, 'branches.branchCode': branchCode },
        { $addToSet: { 'branches.$.completedTopics': topicId }, $inc: { 'branches.$.xp': 20 } }
      )
      const updated = await updateStreak(db, await db.collection('users').findOne({ id: userId }), branchCode)
      await emitActivity(db, updated, branchCode, 'completed', subject, topicName, 20)
      return handleCORS(NextResponse.json({ user: sanitizeUser(updated), xpEarned: 20 }))
    }

    if (route === '/topics/complete' && method === 'DELETE') {
      const body = await request.json()
      const { userId, topicId, branchCode = 'CS' } = body
      await db.collection('users').updateOne(
        { id: userId, 'branches.branchCode': branchCode },
        { $pull: { 'branches.$.completedTopics': topicId }, $inc: { 'branches.$.xp': -20 } }
      )
      const updated = await db.collection('users').findOne({ id: userId })
      return handleCORS(NextResponse.json({ user: sanitizeUser(updated) }))
    }

    if (route === '/topics/revise' && method === 'POST') {
      const body = await request.json()
      const { userId, topicId, subject, topicName, branchCode = 'CS' } = body
      const user = await db.collection('users').findOne({ id: userId })
      if (!user) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
      await db.collection('users').updateOne(
        { id: userId, 'branches.branchCode': branchCode },
        { $addToSet: { 'branches.$.revisedTopics': topicId }, $inc: { 'branches.$.xp': 20 } }
      )
      const updated = await updateStreak(db, await db.collection('users').findOne({ id: userId }), branchCode)
      await emitActivity(db, updated, branchCode, 'revised', subject, topicName, 20)
      return handleCORS(NextResponse.json({ user: sanitizeUser(updated), xpEarned: 20 }))
    }

    // ============ SESSIONS ============
    if (route === '/sessions' && method === 'POST') {
      const body = await request.json()
      const { userId, branchCode = 'CS', subject, topic, durationMinutes, type = 'study', source = 'timer', youtubeUrl } = body
      const session = {
        id: uuidv4(),
        userId,
        branchCode,
        subject,
        topic,
        durationMinutes: Number(durationMinutes) || 0,
        type,
        source,
        youtubeUrl: youtubeUrl || null,
        date: todayISO(),
        createdAt: new Date().toISOString(),
      }
      await db.collection('study_sessions').insertOne(session)
      const user = await db.collection('users').findOne({ id: userId })
      if (user) {
        const xp = Math.floor((Number(durationMinutes) || 0) / 60) * 10
        if (xp > 0) {
          await db.collection('users').updateOne(
            { id: userId, 'branches.branchCode': branchCode },
            { $inc: { 'branches.$.xp': xp } }
          )
        }
        const updated = await updateStreak(db, await db.collection('users').findOne({ id: userId }), branchCode)
        await emitActivity(db, updated, branchCode, 'logged', subject, topic, xp)
        return handleCORS(NextResponse.json({ session, user: sanitizeUser(updated) }))
      }
      return handleCORS(NextResponse.json({ session }))
    }

    if (route === '/sessions' && method === 'GET') {
      const userId = url.searchParams.get('userId')
      const range = url.searchParams.get('range') || 'today'
      let query = { userId }
      if (range === 'today') query.date = todayISO()
      else if (range === 'week') {
        const days = []
        for (let i = 0; i < 7; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          days.push(d.toISOString().split('T')[0])
        }
        query.date = { $in: days }
      } else if (range === 'prevweek') {
        const days = []
        for (let i = 7; i < 14; i++) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          days.push(d.toISOString().split('T')[0])
        }
        query.date = { $in: days }
      }
      const sessions = await db.collection('study_sessions').find(query).sort({ createdAt: -1 }).limit(1000).toArray()
      const cleaned = sessions.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json({ sessions: cleaned }))
    }

    // ============ STATS ============
    if (route === '/stats/snapshot' && method === 'GET') {
      const userId = url.searchParams.get('userId')
      const branchCode = url.searchParams.get('branch') || 'CS'
      const today = todayISO()
      const sessions = await db.collection('study_sessions').find({ userId, date: today, branchCode }).toArray()
      const totalMinutes = sessions.reduce((a, s) => a + (s.durationMinutes || 0), 0)
      const subjects = new Set(sessions.map((s) => s.subject)).size
      const user = await db.collection('users').findOne({ id: userId })
      const branch = user?.branches?.find((b) => b.branchCode === branchCode)
      return handleCORS(NextResponse.json({
        totalMinutes,
        sessions: sessions.length,
        subjectsTouched: subjects,
        dailyGoalMinutes: user?.dailyGoalMinutes || 360,
        streak: branch?.streak || 0,
        maxStreak: branch?.maxStreak || 0,
        xp: branch?.xp || 0,
        completedTopics: branch?.completedTopics?.length || 0,
      }))
    }

    if (route === '/stats/heatmap' && method === 'GET') {
      const userId = url.searchParams.get('userId')
      const sessions = await db.collection('study_sessions').find({ userId }).toArray()
      const events = await db.collection('activity_events').find({ userId }).toArray()
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
      return handleCORS(NextResponse.json({ heatmap: map }))
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
      return handleCORS(NextResponse.json({ total: total + 1317, byBranch }))
    }

    if (route === '/stats/roi' && method === 'GET') {
      const userId = url.searchParams.get('userId')
      const branchCode = url.searchParams.get('branch') || 'CS'
      const user = await db.collection('users').findOne({ id: userId })
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
      return handleCORS(NextResponse.json({ roi }))
    }

    // ============ ACTIVITY ============
    if (route === '/activity/recent' && method === 'GET') {
      const events = await db.collection('activity_events').find({}).sort({ createdAt: -1 }).limit(20).toArray()
      const cleaned = events.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json({ events: cleaned }))
    }

    // ============ COMMUNITY (lightweight) ============
    if (route === '/community/posts' && method === 'GET') {
      const posts = await db.collection('community_posts').find({}).sort({ createdAt: -1 }).limit(100).toArray()
      const cleaned = posts.map(({ _id, ...rest }) => rest)
      return handleCORS(NextResponse.json({ posts: cleaned }))
    }

    if (route === '/community/posts' && method === 'POST') {
      const body = await request.json()
      const { userId, username, branchCode = 'CS', type = 'Doubt', title, content, tags = [] } = body
      const post = {
        id: uuidv4(),
        userId,
        username,
        branchCode,
        type,
        title,
        body: content,
        tags,
        upvotes: 0,
        downvotes: 0,
        views: 0,
        replies: [],
        createdAt: new Date().toISOString(),
      }
      await db.collection('community_posts').insertOne(post)
      return handleCORS(NextResponse.json({ post }))
    }

    if (route === '/community/leaderboard' && method === 'GET') {
      const branchCode = url.searchParams.get('branch') || 'CS'
      const users = await db.collection('users').find({ 'branches.branchCode': branchCode }).toArray()
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
      return handleCORS(NextResponse.json({ leaderboard: board.slice(0, 100) }))
    }

    // ============ ADMIN AUTH ============
    if (route === '/admin/login' && method === 'POST') {
      if (!rateLimit(clientKey(request, 'admin-login'), 5, 60000)) {
        return handleCORS(NextResponse.json({ error: 'Too many attempts.' }, { status: 429 }))
      }
      await ensureSeedAdmin(db)
      const body = await request.json().catch(() => ({}))
      const email = (body.email || '').toLowerCase().trim()
      const password = body.password || ''
      const admin = await db.collection('admins').findOne({ email })
      if (!admin || !verifyPassword(password, admin.passwordSalt, admin.passwordHash)) {
        return handleCORS(NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 }))
      }
      await db.collection('admins').updateOne({ id: admin.id }, { $set: { lastLogin: new Date().toISOString() } })
      const token = signToken({ adminId: admin.id, role: admin.role }, ADMIN_SECRET, 60 * 60 * 8)
      await logAudit(db, admin.id, 'admin.login')
      const { passwordHash, passwordSalt, _id, ...safe } = admin
      return handleCORS(NextResponse.json({ admin: safe, token }))
    }

    if (route === '/admin/me' && method === 'GET') {
      const admin = await requireAdmin(request, db)
      if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      return handleCORS(NextResponse.json({ admin }))
    }

    if (route === '/admin/password' && method === 'PATCH') {
      const admin = await requireAdmin(request, db)
      if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const body = await request.json().catch(() => ({}))
      const pe = passwordStrength(body.newPassword); if (pe) return handleCORS(NextResponse.json({ error: pe }, { status: 400 }))
      const { salt, hash } = hashPassword(body.newPassword)
      await db.collection('admins').updateOne({ id: admin.id }, { $set: { passwordSalt: salt, passwordHash: hash, passwordChangedAt: new Date().toISOString() } })
      await logAudit(db, admin.id, 'admin.password_change')
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ============ ADMIN: USERS ============
    if (route === '/admin/users' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const q = url.searchParams.get('q') || ''
      const filter = q ? { $or: [{ email: { $regex: q, $options: 'i' } }, { username: { $regex: q, $options: 'i' } }] } : {}
      const users = await db.collection('users').find(filter, { projection: { passwordHash: 0, passwordSalt: 0 } }).sort({ createdAt: -1 }).limit(200).toArray()
      return handleCORS(NextResponse.json({ users: users.map(({ _id, ...r }) => r) }))
    }

    if (route.match(/^\/admin\/users\/[^/]+\/suspend$/) && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const userId = route.split('/')[3]
      const body = await request.json().catch(() => ({}))
      await db.collection('users').updateOne({ id: userId }, { $set: { suspended: !!body.suspended } })
      await logAudit(db, admin.id, body.suspended ? 'user.suspend' : 'user.reactivate', userId)
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ============ ADMIN: YOUTUBE ============
    if (route === '/admin/youtube' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const list = await db.collection('youtube_videos').find({}).sort({ pinned: -1, createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json({ videos: list.map(({ _id, ...r }) => r) }))
    }
    if (route === '/admin/youtube' && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const body = await request.json().catch(() => ({}))
      const item = {
        id: uuidv4(),
        title: sanitizeString(body.title, 200),
        url: sanitizeString(body.url, 500),
        category: sanitizeString(body.category, 50) || 'General',
        branchCode: sanitizeString(body.branchCode, 4) || 'CS',
        featured: !!body.featured,
        pinned: !!body.pinned,
        createdAt: new Date().toISOString(),
      }
      await db.collection('youtube_videos').insertOne(item)
      await logAudit(db, admin.id, 'youtube.create', item.id)
      return handleCORS(NextResponse.json({ video: item }))
    }
    if (route.match(/^\/admin\/youtube\/[^/]+$/) && method === 'PATCH') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))
      const upd = {}
      if (body.title !== undefined) upd.title = sanitizeString(body.title, 200)
      if (body.url !== undefined) upd.url = sanitizeString(body.url, 500)
      if (body.category !== undefined) upd.category = sanitizeString(body.category, 50)
      if (body.branchCode !== undefined) upd.branchCode = sanitizeString(body.branchCode, 4)
      if (body.featured !== undefined) upd.featured = !!body.featured
      if (body.pinned !== undefined) upd.pinned = !!body.pinned
      await db.collection('youtube_videos').updateOne({ id }, { $set: upd })
      await logAudit(db, admin.id, 'youtube.update', id, upd)
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route.match(/^\/admin\/youtube\/[^/]+$/) && method === 'DELETE') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const id = route.split('/')[3]
      await db.collection('youtube_videos').deleteOne({ id })
      await logAudit(db, admin.id, 'youtube.delete', id)
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ============ ADMIN: QUOTES ============
    if (route === '/admin/quotes' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const list = await db.collection('quotes').find({}).sort({ featured: -1, createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json({ quotes: list.map(({ _id, ...r }) => r) }))
    }
    if (route === '/admin/quotes' && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const body = await request.json().catch(() => ({}))
      const item = {
        id: uuidv4(),
        text: sanitizeString(body.text, 500),
        author: sanitizeString(body.author, 100) || 'Anonymous',
        featured: !!body.featured,
        active: body.active !== false,
        createdAt: new Date().toISOString(),
      }
      if (!item.text) return handleCORS(NextResponse.json({ error: 'Quote text required' }, { status: 400 }))
      await db.collection('quotes').insertOne(item)
      await logAudit(db, admin.id, 'quote.create', item.id)
      return handleCORS(NextResponse.json({ quote: item }))
    }
    if (route.match(/^\/admin\/quotes\/[^/]+$/) && method === 'PATCH') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))
      const upd = {}
      if (body.text !== undefined) upd.text = sanitizeString(body.text, 500)
      if (body.author !== undefined) upd.author = sanitizeString(body.author, 100)
      if (body.featured !== undefined) upd.featured = !!body.featured
      if (body.active !== undefined) upd.active = !!body.active
      await db.collection('quotes').updateOne({ id }, { $set: upd })
      await logAudit(db, admin.id, 'quote.update', id)
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route.match(/^\/admin\/quotes\/[^/]+$/) && method === 'DELETE') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const id = route.split('/')[3]
      await db.collection('quotes').deleteOne({ id })
      await logAudit(db, admin.id, 'quote.delete', id)
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ============ ADMIN: ANNOUNCEMENTS ============
    if (route === '/admin/announcements' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const list = await db.collection('announcements').find({}).sort({ pinned: -1, createdAt: -1 }).toArray()
      return handleCORS(NextResponse.json({ announcements: list.map(({ _id, ...r }) => r) }))
    }
    if (route === '/admin/announcements' && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
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
      if (!item.title) return handleCORS(NextResponse.json({ error: 'Title required' }, { status: 400 }))
      await db.collection('announcements').insertOne(item)
      await logAudit(db, admin.id, 'announcement.create', item.id)
      return handleCORS(NextResponse.json({ announcement: item }))
    }
    if (route.match(/^\/admin\/announcements\/[^/]+$/) && method === 'PATCH') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const id = route.split('/')[3]
      const body = await request.json().catch(() => ({}))
      const upd = {}
      for (const k of ['title', 'body']) if (body[k] !== undefined) upd[k] = sanitizeString(body[k], k === 'title' ? 200 : 2000)
      for (const k of ['active', 'pinned']) if (body[k] !== undefined) upd[k] = !!body[k]
      if (body.tone !== undefined && ['info', 'success', 'warn', 'critical'].includes(body.tone)) upd.tone = body.tone
      for (const k of ['startsAt', 'endsAt']) if (body[k] !== undefined) upd[k] = body[k]
      await db.collection('announcements').updateOne({ id }, { $set: upd })
      await logAudit(db, admin.id, 'announcement.update', id)
      return handleCORS(NextResponse.json({ ok: true }))
    }
    if (route.match(/^\/admin\/announcements\/[^/]+$/) && method === 'DELETE') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const id = route.split('/')[3]
      await db.collection('announcements').deleteOne({ id })
      await logAudit(db, admin.id, 'announcement.delete', id)
      return handleCORS(NextResponse.json({ ok: true }))
    }

    // ============ ADMIN: ANALYTICS ============
    if (route === '/admin/analytics' && method === 'GET') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
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
      return handleCORS(NextResponse.json({
        totals: { users: totalUsers, activeUsers, sessions: totalSessions, posts: totalPosts, minutes: totalMinutes[0]?.m || 0 },
        byBranch,
        signupsByDay,
        auditLog: audit.map(({ _id, ...r }) => r),
      }))
    }

    // ============ PUBLIC CONTENT ============
    if (route === '/content/quote' && method === 'GET') {
      const list = await db.collection('quotes').find({ active: true }).toArray()
      if (!list.length) return handleCORS(NextResponse.json({ quote: null }))
      const featured = list.filter((q) => q.featured)
      const pool = featured.length ? featured : list
      const pick = pool[Math.floor(Math.random() * pool.length)]
      const { _id, ...r } = pick
      return handleCORS(NextResponse.json({ quote: r }))
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
      return handleCORS(NextResponse.json({ announcements: list.map(({ _id, ...r }) => r) }))
    }
    if (route === '/content/youtube' && method === 'GET') {
      const branch = url.searchParams.get('branch')
      const filter = branch ? { branchCode: branch } : {}
      const list = await db.collection('youtube_videos').find(filter).sort({ pinned: -1, featured: -1, createdAt: -1 }).limit(50).toArray()
      return handleCORS(NextResponse.json({ videos: list.map(({ _id, ...r }) => r) }))
    }

    // ============ CLOUDINARY UPLOAD SIGNATURE ============
    if (route === '/admin/upload-signature' && method === 'POST') {
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      if (!rateLimit(clientKey(request, 'upload-sig'), 60, 60000)) return handleCORS(NextResponse.json({ error: 'Rate limit' }, { status: 429 }))
      const body = await request.json().catch(() => ({}))
      const folder = sanitizeString(body.folder || 'gateplus/general', 80).replace(/[^a-zA-Z0-9/_-]/g, '')
      const resourceType = ['image', 'auto', 'raw'].includes(body.resourceType) ? body.resourceType : 'auto'
      const timestamp = Math.floor(Date.now() / 1000)
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME
      const apiKey = process.env.CLOUDINARY_API_KEY
      const apiSecret = process.env.CLOUDINARY_API_SECRET
      if (!cloudName || !apiKey || !apiSecret) {
        return handleCORS(NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 }))
      }
      // Sign: sort params + apiSecret, sha1
      const params = { folder, timestamp }
      const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&')
      const signature = crypto.createHash('sha1').update(toSign + apiSecret).digest('hex')
      await logAudit(db, admin.id, 'upload.sign', null, { folder, resourceType })
      return handleCORS(NextResponse.json({
        cloudName, apiKey, timestamp, signature, folder, resourceType,
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      }))
    }

    // ============ GENERIC CMS COLLECTIONS ============
    // Allowed CMS collections (whitelist for safety)
    const CMS_COLLECTIONS = {
      books: { fields: ['branchCode', 'title', 'author', 'amazonUrl', 'coverUrl'] },
      pyqs: { fields: ['branchCode', 'year', 'shift', 'title', 'paperUrl', 'solutionUrl', 'coverUrl'] },
      revision_sheets: { fields: ['branchCode', 'subjectKey', 'subject', 'topic', 'title', 'pdfUrl', 'coverUrl'] },
      short_notes: { fields: ['branchCode', 'subjectKey', 'subject', 'topic', 'title', 'pdfUrl', 'coverUrl'] },
      videos: { fields: ['branchCode', 'subjectKey', 'subject', 'topic', 'title', 'youtubeUrl', 'provider', 'featured', 'pinned'] },
      mock_tests: { fields: ['branchCode', 'title', 'durationMinutes', 'questionCount', 'marks', 'status', 'coverUrl', 'paperUrl'] },
      settings: { fields: ['key', 'value'], singletonByKey: true },
    }

    function buildCmsItem(collKey, body, existing = null) {
      const conf = CMS_COLLECTIONS[collKey]
      const item = existing ? { ...existing } : { id: uuidv4(), createdAt: new Date().toISOString() }
      conf.fields.forEach((f) => {
        if (body[f] !== undefined) {
          if (typeof body[f] === 'string') item[f] = sanitizeString(body[f], 2000)
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
      if (!CMS_COLLECTIONS[collKey]) return handleCORS(NextResponse.json({ error: 'Unknown collection' }, { status: 404 }))
      const filter = {}
      for (const f of ['branchCode', 'subjectKey', 'topic', 'year']) {
        const v = url.searchParams.get(f)
        if (v) filter[f] = isNaN(Number(v)) || f !== 'year' ? v : Number(v)
      }
      const items = await db.collection(`cms_${collKey}`).find(filter).sort({ pinned: -1, featured: -1, createdAt: -1 }).limit(500).toArray()
      return handleCORS(NextResponse.json({ items: items.map(({ _id, ...r }) => r) }))
    }

    // ADMIN CRUD: POST/PATCH/DELETE /admin/cms/:coll[/:id]
    const adminMatch = route.match(/^\/admin\/cms\/([a-z_]+)(?:\/([^/]+))?$/)
    if (adminMatch) {
      const collKey = adminMatch[1]
      const itemId = adminMatch[2]
      if (!CMS_COLLECTIONS[collKey]) return handleCORS(NextResponse.json({ error: 'Unknown collection' }, { status: 404 }))
      const admin = await requireAdmin(request, db); if (!admin) return handleCORS(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      const coll = db.collection(`cms_${collKey}`)
      if (method === 'GET') {
        const items = await coll.find({}).sort({ createdAt: -1 }).limit(1000).toArray()
        return handleCORS(NextResponse.json({ items: items.map(({ _id, ...r }) => r) }))
      }
      if (method === 'POST') {
        const body = await request.json().catch(() => ({}))
        const item = buildCmsItem(collKey, body)
        // settings singleton by key
        if (CMS_COLLECTIONS[collKey].singletonByKey && item.key) {
          await coll.updateOne({ key: item.key }, { $set: item }, { upsert: true })
          await logAudit(db, admin.id, `cms.${collKey}.upsert`, item.key, item)
          return handleCORS(NextResponse.json({ item }))
        }
        await coll.insertOne(item)
        await logAudit(db, admin.id, `cms.${collKey}.create`, item.id)
        return handleCORS(NextResponse.json({ item }))
      }
      if (method === 'PATCH' && itemId) {
        const body = await request.json().catch(() => ({}))
        const existing = await coll.findOne({ id: itemId })
        if (!existing) return handleCORS(NextResponse.json({ error: 'Not found' }, { status: 404 }))
        const item = buildCmsItem(collKey, body, existing)
        delete item._id
        await coll.updateOne({ id: itemId }, { $set: item })
        await logAudit(db, admin.id, `cms.${collKey}.update`, itemId)
        return handleCORS(NextResponse.json({ item }))
      }
      if (method === 'DELETE' && itemId) {
        await coll.deleteOne({ id: itemId })
        await logAudit(db, admin.id, `cms.${collKey}.delete`, itemId)
        return handleCORS(NextResponse.json({ ok: true }))
      }
    }

    // PUBLIC SETTINGS singleton: GET /cms/settings/:key
    const settingMatch = route.match(/^\/cms\/settings\/([a-zA-Z0-9_-]+)$/)
    if (settingMatch && method === 'GET') {
      const key = settingMatch[1]
      const row = await db.collection('cms_settings').findOne({ key })
      return handleCORS(NextResponse.json({ value: row?.value ?? null }))
    }

    return handleCORS(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (error) {
    console.error('API Error:', error)
    return handleCORS(NextResponse.json({ error: 'Internal server error', detail: error.message }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
