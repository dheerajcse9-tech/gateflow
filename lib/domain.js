// Pure domain logic (no DB / no framework) — unit-testable and reused by both
// the API route and the client.

// UTC-consistent "today" and day math. Streak state is stored as UTC ISO
// strings, so all comparisons must also be UTC to avoid timezone-dependent
// off-by-one streak breakage (fixes audit L-6).
export function todayISO(date = new Date()) {
  return date.toISOString().split('T')[0]
}

export function daysBetween(d1, d2) {
  const a = Date.parse(`${String(d1).split('T')[0]}T00:00:00Z`)
  const b = Date.parse(`${String(d2).split('T')[0]}T00:00:00Z`)
  return Math.round((b - a) / 86400000)
}

// Study-session duration is untrusted input. Clamp to a sane range so a user
// cannot forge huge study times / XP (fixes audit H-2).
export const MAX_SESSION_MINUTES = 1440 // 24h
export function clampDuration(minutes) {
  const n = Number(minutes)
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(Math.floor(n), MAX_SESSION_MINUTES)
}

export function sessionXp(minutes) {
  return Math.floor(clampDuration(minutes) / 60) * 10
}

export const TOPIC_XP = 20

// Compute the next streak given the last-active date and today.
export function computeStreak({ lastActiveDate, streak = 0, maxStreak = 0 }, today = todayISO()) {
  const last = lastActiveDate ? String(lastActiveDate).split('T')[0] : null
  if (last === today) return { unchanged: true, streak, maxStreak }
  let newStreak = 1
  if (last) {
    const diff = daysBetween(last, today)
    if (diff === 1) newStreak = (streak || 0) + 1
    else if (diff === 0) newStreak = streak || 1
    else newStreak = 1
  }
  return { unchanged: false, streak: newStreak, maxStreak: Math.max(maxStreak || 0, newStreak) }
}

// Dynamic Expected Rank and Score computation (moved from the client so it can
// be shared + tested).
export function calculateGateMetrics(marks) {
  const m = Math.max(0, Math.min(100, marks))
  let rank = 15000
  let score = 320

  if (m >= 85) {
    rank = Math.round(1 + (15 - 1) * ((100 - m) / 15))
    score = Math.round(960 + (1000 - 960) * ((m - 85) / 15))
  } else if (m >= 75) {
    rank = Math.round(16 + (80 - 16) * ((85 - m) / 10))
    score = Math.round(860 + (960 - 860) * ((m - 75) / 10))
  } else if (m >= 65) {
    rank = Math.round(81 + (300 - 81) * ((75 - m) / 10))
    score = Math.round(740 + (860 - 740) * ((m - 65) / 10))
  } else if (m >= 55) {
    rank = Math.round(301 + (1000 - 301) * ((65 - m) / 10))
    score = Math.round(620 + (740 - 620) * ((m - 55) / 10))
  } else if (m >= 45) {
    rank = Math.round(1001 + (3500 - 1001) * ((55 - m) / 10))
    score = Math.round(500 + (620 - 500) * ((m - 45) / 10))
  } else if (m >= 35) {
    rank = Math.round(3501 + (8000 - 3501) * ((45 - m) / 10))
    score = Math.round(380 + (500 - 380) * ((m - 35) / 10))
  } else if (m >= 25) {
    rank = Math.round(8001 + (15000 - 8001) * ((35 - m) / 10))
    score = Math.round(280 + (380 - 280) * ((m - 25) / 10))
  } else {
    rank = Math.round(15001 + (30000 - 15001) * ((25 - m) / 25))
    score = Math.round(100 + (280 - 100) * (m / 25))
  }

  return { rank, score }
}
