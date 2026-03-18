import { describe, it, expect } from 'vitest'
import {
  SESSION_PRICE,
  getRevenue,
  getPending,
  computeEnrollmentChanges,
  getInitials,
  formatEur,
} from './calculations'
import { Enrollment } from './types'

// ── Fixtures ───────────────────────────────────────────────────────────────

function enrollment(overrides: Partial<Enrollment>): Enrollment {
  return {
    id: 'e1', classId: 'c1', studentId: 's1',
    status: 'registered', deposit: 0, total: 0,
    ...overrides,
  }
}

// ── getRevenue ─────────────────────────────────────────────────────────────

describe('getRevenue', () => {
  it('returns 0 for empty enrollments', () => {
    expect(getRevenue('c1', [])).toBe(0)
  })

  it('counts paid enrollment by total', () => {
    const e = enrollment({ status: 'paid', total: 20 })
    expect(getRevenue('c1', [e])).toBe(20)
  })

  it('counts deposit_paid enrollment by deposit only', () => {
    const e = enrollment({ status: 'deposit_paid', deposit: 10, total: 0 })
    expect(getRevenue('c1', [e])).toBe(10)
  })

  it('ignores registered enrollment', () => {
    const e = enrollment({ status: 'registered' })
    expect(getRevenue('c1', [e])).toBe(0)
  })

  it('ignores no_show enrollment', () => {
    const e = enrollment({ status: 'no_show', total: 0 })
    expect(getRevenue('c1', [e])).toBe(0)
  })

  it('only counts enrollments for the given classId', () => {
    const e1 = enrollment({ classId: 'c1', status: 'paid', total: 20 })
    const e2 = enrollment({ id: 'e2', classId: 'c2', status: 'paid', total: 20 })
    expect(getRevenue('c1', [e1, e2])).toBe(20)
  })

  it('sums mixed statuses correctly', () => {
    const paid = enrollment({ id: 'e1', status: 'paid', total: 20 })
    const dep = enrollment({ id: 'e2', status: 'deposit_paid', deposit: 10 })
    const reg = enrollment({ id: 'e3', status: 'registered' })
    expect(getRevenue('c1', [paid, dep, reg])).toBe(30)
  })
})

// ── getPending ─────────────────────────────────────────────────────────────

describe('getPending', () => {
  it('returns 0 for empty enrollments', () => {
    expect(getPending('c1', [])).toBe(0)
  })

  it('counts registered as full SESSION_PRICE', () => {
    const e = enrollment({ status: 'registered' })
    expect(getPending('c1', [e])).toBe(SESSION_PRICE)
  })

  it('counts deposit_paid as SESSION_PRICE minus deposit', () => {
    const e = enrollment({ status: 'deposit_paid', deposit: 10 })
    expect(getPending('c1', [e])).toBe(SESSION_PRICE - 10)
  })

  it('returns 0 for paid enrollment', () => {
    const e = enrollment({ status: 'paid', total: 20 })
    expect(getPending('c1', [e])).toBe(0)
  })

  it('returns 0 for no_show enrollment', () => {
    const e = enrollment({ status: 'no_show' })
    expect(getPending('c1', [e])).toBe(0)
  })

  it('only counts enrollments for the given classId', () => {
    const e1 = enrollment({ classId: 'c1', status: 'registered' })
    const e2 = enrollment({ id: 'e2', classId: 'c2', status: 'registered' })
    expect(getPending('c1', [e1, e2])).toBe(SESSION_PRICE)
  })
})

// ── computeEnrollmentChanges ───────────────────────────────────────────────

describe('computeEnrollmentChanges', () => {
  it('paid: sets total to SESSION_PRICE', () => {
    const e = enrollment({ status: 'registered' })
    const changes = computeEnrollmentChanges(e, 'paid')
    expect(changes.status).toBe('paid')
    expect(changes.total).toBe(SESSION_PRICE)
  })

  it('deposit_paid with no prior deposit: sets deposit to 10', () => {
    const e = enrollment({ status: 'registered', deposit: 0 })
    const changes = computeEnrollmentChanges(e, 'deposit_paid')
    expect(changes.deposit).toBe(10)
  })

  it('deposit_paid with existing deposit: keeps existing deposit', () => {
    const e = enrollment({ status: 'deposit_paid', deposit: 15 })
    const changes = computeEnrollmentChanges(e, 'deposit_paid')
    expect(changes.deposit).toBeUndefined()
  })

  it('registered: sets total to 0', () => {
    const e = enrollment({ status: 'paid', total: 20 })
    const changes = computeEnrollmentChanges(e, 'registered')
    expect(changes.total).toBe(0)
  })

  it('no_show: sets total to 0', () => {
    const e = enrollment({ status: 'paid', total: 20 })
    const changes = computeEnrollmentChanges(e, 'no_show')
    expect(changes.total).toBe(0)
  })
})

// ── getInitials ────────────────────────────────────────────────────────────

describe('getInitials', () => {
  it('returns two initials for two-word name', () => {
    expect(getInitials('María García')).toBe('MG')
  })

  it('returns one initial for single-word name', () => {
    expect(getInitials('María')).toBe('M')
  })

  it('only uses first two words for longer names', () => {
    expect(getInitials('María García López')).toBe('MG')
  })
})

// ── formatEur ─────────────────────────────────────────────────────────────

describe('formatEur', () => {
  it('formats positive number', () => {
    expect(formatEur(20)).toBe('20€')
  })

  it('formats zero', () => {
    expect(formatEur(0)).toBe('0€')
  })

  it('formats negative number (balance negativo)', () => {
    expect(formatEur(-5)).toBe('-5€')
  })
})
