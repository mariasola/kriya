import { describe, it, expect } from 'vitest'
import {
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
    expect(getRevenue(20, [])).toBe(0)
  })

  it('counts paid enrollment by classPrice', () => {
    const e = enrollment({ status: 'paid' })
    expect(getRevenue(20, [e])).toBe(20)
  })

  it('uses classPrice for paid, not stored total', () => {
    const e = enrollment({ status: 'paid', total: 20 })
    expect(getRevenue(25, [e])).toBe(25)
  })

  it('counts deposit_paid enrollment by deposit only', () => {
    const e = enrollment({ status: 'deposit_paid', deposit: 10, total: 0 })
    expect(getRevenue(20, [e])).toBe(10)
  })

  it('ignores registered enrollment', () => {
    const e = enrollment({ status: 'registered' })
    expect(getRevenue(20, [e])).toBe(0)
  })

  it('ignores no_show enrollment', () => {
    const e = enrollment({ status: 'no_show', total: 0 })
    expect(getRevenue(20, [e])).toBe(0)
  })

  it('sums mixed statuses correctly', () => {
    const paid = enrollment({ id: 'e1', status: 'paid', total: 20 })
    const dep = enrollment({ id: 'e2', status: 'deposit_paid', deposit: 10 })
    const reg = enrollment({ id: 'e3', status: 'registered' })
    expect(getRevenue(20, [paid, dep, reg])).toBe(30)
  })
})

// ── getPending ─────────────────────────────────────────────────────────────

describe('getPending', () => {
  it('returns 0 for empty enrollments', () => {
    expect(getPending(20, [])).toBe(0)
  })

  it('counts registered as full class price', () => {
    const e = enrollment({ status: 'registered' })
    expect(getPending(20, [e])).toBe(20)
  })

  it('counts deposit_paid as price minus deposit', () => {
    const e = enrollment({ status: 'deposit_paid', deposit: 10 })
    expect(getPending(20, [e])).toBe(10)
  })

  it('returns 0 for paid enrollment', () => {
    const e = enrollment({ status: 'paid', total: 20 })
    expect(getPending(20, [e])).toBe(0)
  })

  it('returns 0 for no_show enrollment', () => {
    const e = enrollment({ status: 'no_show' })
    expect(getPending(20, [e])).toBe(0)
  })

  it('uses classPrice correctly for non-standard price', () => {
    const e = enrollment({ status: 'registered' })
    expect(getPending(25, [e])).toBe(25)
  })
})

// ── computeEnrollmentChanges ───────────────────────────────────────────────

describe('computeEnrollmentChanges', () => {
  it('paid: sets total to classPrice', () => {
    const e = enrollment({ status: 'registered' })
    const changes = computeEnrollmentChanges(e, 'paid', 20)
    expect(changes.status).toBe('paid')
    expect(changes.total).toBe(20)
  })

  it('deposit_paid with no prior deposit: sets deposit to 10', () => {
    const e = enrollment({ status: 'registered', deposit: 0 })
    const changes = computeEnrollmentChanges(e, 'deposit_paid', 20)
    expect(changes.deposit).toBe(10)
  })

  it('deposit_paid with existing deposit: keeps existing deposit', () => {
    const e = enrollment({ status: 'deposit_paid', deposit: 15 })
    const changes = computeEnrollmentChanges(e, 'deposit_paid', 20)
    expect(changes.deposit).toBeUndefined()
  })

  it('registered: sets total to 0', () => {
    const e = enrollment({ status: 'paid', total: 20 })
    const changes = computeEnrollmentChanges(e, 'registered', 20)
    expect(changes.total).toBe(0)
  })

  it('no_show: sets total to 0', () => {
    const e = enrollment({ status: 'paid', total: 20 })
    const changes = computeEnrollmentChanges(e, 'no_show', 20)
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
