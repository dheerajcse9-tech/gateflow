import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  todayISO, daysBetween, clampDuration, sessionXp, computeStreak,
  calculateGateMetrics, MAX_SESSION_MINUTES,
} from '../lib/domain.js'

test('todayISO returns a YYYY-MM-DD string', () => {
  assert.match(todayISO(new Date('2026-02-07T10:00:00Z')), /^2026-02-07$/)
})

test('daysBetween is UTC-consistent and order-sensitive', () => {
  assert.equal(daysBetween('2026-01-01', '2026-01-02'), 1)
  assert.equal(daysBetween('2026-01-02', '2026-01-01'), -1)
  assert.equal(daysBetween('2026-01-01T23:59:00Z', '2026-01-02T00:01:00Z'), 1)
})

test('clampDuration bounds untrusted input', () => {
  assert.equal(clampDuration(60), 60)
  assert.equal(clampDuration(-5), 0)
  assert.equal(clampDuration('abc'), 0)
  assert.equal(clampDuration(9_999_999), MAX_SESSION_MINUTES)
  assert.equal(clampDuration(90.9), 90)
})

test('sessionXp awards 10 XP per full hour, clamped', () => {
  assert.equal(sessionXp(0), 0)
  assert.equal(sessionXp(59), 0)
  assert.equal(sessionXp(60), 10)
  assert.equal(sessionXp(125), 20)
  assert.equal(sessionXp(9_999_999), Math.floor(MAX_SESSION_MINUTES / 60) * 10)
})

test('computeStreak: same day is unchanged', () => {
  const r = computeStreak({ lastActiveDate: '2026-02-07', streak: 3, maxStreak: 5 }, '2026-02-07')
  assert.equal(r.unchanged, true)
  assert.equal(r.streak, 3)
})

test('computeStreak: consecutive day increments and tracks max', () => {
  const r = computeStreak({ lastActiveDate: '2026-02-06', streak: 3, maxStreak: 3 }, '2026-02-07')
  assert.equal(r.unchanged, false)
  assert.equal(r.streak, 4)
  assert.equal(r.maxStreak, 4)
})

test('computeStreak: gap resets to 1', () => {
  const r = computeStreak({ lastActiveDate: '2026-02-01', streak: 9, maxStreak: 9 }, '2026-02-07')
  assert.equal(r.streak, 1)
  assert.equal(r.maxStreak, 9)
})

test('computeStreak: first ever activity starts at 1', () => {
  const r = computeStreak({ lastActiveDate: null, streak: 0, maxStreak: 0 }, '2026-02-07')
  assert.equal(r.streak, 1)
})

test('calculateGateMetrics: monotonic — more marks never means worse rank', () => {
  let prev = Infinity
  for (let m = 0; m <= 100; m += 5) {
    const { rank, score } = calculateGateMetrics(m)
    assert.ok(rank >= 1)
    assert.ok(score >= 0 && score <= 1000)
    assert.ok(rank <= prev + 1, `rank should not increase as marks rise (m=${m})`)
    prev = rank
  }
})

test('calculateGateMetrics clamps out-of-range marks', () => {
  assert.deepEqual(calculateGateMetrics(150), calculateGateMetrics(100))
  assert.deepEqual(calculateGateMetrics(-20), calculateGateMetrics(0))
})
