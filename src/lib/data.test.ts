import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import { mapRoom, mapStudent, mapClass, mapEnrollment, ensureDeleteAffectedRows } from './data'

// ── mapRoom ────────────────────────────────────────────────────────────────

describe('mapRoom', () => {
  it('maps all fields', () => {
    const row = { id: 'r1', name: 'Estudio Norte', address: 'Calle Mayor 1' }
    expect(mapRoom(row)).toEqual({ id: 'r1', name: 'Estudio Norte', address: 'Calle Mayor 1' })
  })

  it('defaults address to empty string when null', () => {
    const row = { id: 'r1', name: 'Estudio Norte', address: null }
    expect(mapRoom(row).address).toBe('')
  })

  it('defaults address to empty string when undefined', () => {
    const row = { id: 'r1', name: 'Estudio Norte' }
    expect(mapRoom(row).address).toBe('')
  })
})

// ── mapStudent ─────────────────────────────────────────────────────────────

describe('mapStudent', () => {
  it('maps all fields', () => {
    const row = { id: 's1', name: 'Ana García', phone: '+34600000000', notes: 'Lesión rodilla' }
    expect(mapStudent(row)).toEqual({ id: 's1', name: 'Ana García', phone: '+34600000000', notes: 'Lesión rodilla' })
  })

  it('defaults phone to empty string when null', () => {
    const row = { id: 's1', name: 'Ana García', phone: null, notes: null }
    expect(mapStudent(row).phone).toBe('')
  })

  it('defaults notes to empty string when null', () => {
    const row = { id: 's1', name: 'Ana García', phone: null, notes: null }
    expect(mapStudent(row).notes).toBe('')
  })
})

// ── mapClass ───────────────────────────────────────────────────────────────

describe('mapClass', () => {
  it('maps snake_case fields to camelCase', () => {
    const row = { id: 'c1', name: 'Hatha mañana', date: '2026-04-01', time: '10:00', room_id: 'r1', capacity: 8, price: 20, room_cost: 30, room_paid: false }
    const result = mapClass(row)
    expect(result.roomId).toBe('r1')
    expect(result.roomCost).toBe(30)
    expect(result.roomPaid).toBe(false)
  })

  it('defaults price to 20 when null', () => {
    const row = { id: 'c1', name: 'Hatha', date: '2026-04-01', time: '10:00', room_id: null, capacity: 8, price: null, room_cost: 0, room_paid: false }
    expect(mapClass(row).price).toBe(20)
  })

  it('defaults price to 20 when undefined', () => {
    const row = { id: 'c1', name: 'Hatha', date: '2026-04-01', time: '10:00', room_id: null, capacity: 8, room_cost: 0, room_paid: false }
    expect(mapClass(row).price).toBe(20)
  })

  it('uses actual price when set', () => {
    const row = { id: 'c1', name: 'Hatha', date: '2026-04-01', time: '10:00', room_id: null, capacity: 8, price: 25, room_cost: 0, room_paid: false }
    expect(mapClass(row).price).toBe(25)
  })

  it('sets roomId to null when room_id is null', () => {
    const row = { id: 'c1', name: 'Hatha', date: '2026-04-01', time: '10:00', room_id: null, capacity: 8, price: 20, room_cost: 0, room_paid: false }
    expect(mapClass(row).roomId).toBeNull()
  })

  it('maps roomPaid correctly', () => {
    const paid = { id: 'c1', name: 'x', date: '2026-04-01', time: '10:00', room_id: 'r1', capacity: 8, price: 20, room_cost: 30, room_paid: true }
    expect(mapClass(paid).roomPaid).toBe(true)
  })
})

// ── mapEnrollment ──────────────────────────────────────────────────────────

describe('mapEnrollment', () => {
  it('maps snake_case fields to camelCase', () => {
    const row = { id: 'e1', class_id: 'c1', student_id: 's1', status: 'paid', deposit: 0, total: 20 }
    const result = mapEnrollment(row)
    expect(result.classId).toBe('c1')
    expect(result.studentId).toBe('s1')
    expect(result.status).toBe('paid')
    expect(result.deposit).toBe(0)
    expect(result.total).toBe(20)
  })

  it('maps all enrollment statuses', () => {
    const statuses = ['registered', 'deposit_paid', 'paid', 'no_show'] as const
    statuses.forEach(status => {
      const row = { id: 'e1', class_id: 'c1', student_id: 's1', status, deposit: 0, total: 0 }
      expect(mapEnrollment(row).status).toBe(status)
    })
  })

  it('preserves deposit and total values', () => {
    const row = { id: 'e1', class_id: 'c1', student_id: 's1', status: 'deposit_paid', deposit: 10, total: 0 }
    const result = mapEnrollment(row)
    expect(result.deposit).toBe(10)
    expect(result.total).toBe(0)
  })
})

// ── ensureDeleteAffectedRows ───────────────────────────────────────────────

describe('ensureDeleteAffectedRows', () => {
  it('does not throw when one row is deleted', () => {
    expect(() => ensureDeleteAffectedRows('Room', 1)).not.toThrow()
  })

  it('throws when zero rows are deleted', () => {
    expect(() => ensureDeleteAffectedRows('Room', 0)).toThrow('Room not found or you do not have permission to delete it')
  })

  it('throws when count is null', () => {
    expect(() => ensureDeleteAffectedRows('Student', null)).toThrow('Student not found or you do not have permission to delete it')
  })
})
