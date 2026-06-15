import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { BRANCHES, CS_SUBJECTS, getAllCSTopics, TOTAL_CS_TOPICS, TARGET_DATES } from '@/lib/seedData'

let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME || 'gateplus')
  }
  return db
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
      const body = await request.json()
      const { email, password, branchCode = 'CS', targetYear = 2027 } = body
      if (!email || !password) {
        return handleCORS(NextResponse.json({ error: 'Email and password required' }, { status: 400 }))
      }
      const existing = await db.collection('users').findOne({ email: email.toLowerCase() })
      if (existing) {
        return handleCORS(NextResponse.json({ error: 'An account with this email already exists. Sign In instead.' }, { status: 409 }))
      }
      const { salt, hash } = hashPassword(password)
      const username = genUsername(email, branchCode)
      const user = {
        id: uuidv4(),
        email: email.toLowerCase(),
        username,
        passwordSalt: salt,
        passwordHash: hash,
        createdAt: new Date().toISOString(),
        dailyGoalMinutes: 360,
        totalActiveDays: 0,
        branches: [
          {
            branchCode,
            targetYear: Number(targetYear),
            xp: 0,
            level: 1,
            streak: 0,
            maxStreak: 0,
            lastActiveDate: null,
            completedTopics: [],
            revisedTopics: [],
            isActive: true,
          },
        ],
      }
      await db.collection('users').insertOne(user)
      return handleCORS(NextResponse.json({ user: sanitizeUser(user) }))
    }

    if (route === '/auth/login' && method === 'POST') {
      const body = await request.json()
      const { email, password } = body
      const user = await db.collection('users').findOne({ email: (email || '').toLowerCase() })
      if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        return handleCORS(NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 }))
      }
      return handleCORS(NextResponse.json({ user: sanitizeUser(user) }))
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
      const sessions = await db.collection('study_sessions').find(query).sort({ createdAt: -1 }).limit(500).toArray()
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
