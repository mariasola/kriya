import { describe, it, expect, vi } from 'vitest'

type Step = { table: string; op: 'update' | 'delete'; payload?: any; filters: Array<{ key: string; value: any }> }

const { recordedSteps, authGetUser, fromMock } = vi.hoisted(() => {
  return {
    recordedSteps: [] as Step[],
    authGetUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })),
    fromMock: vi.fn(),
  }
})

function makeQuery(table: string) {
  const step: Step = { table, op: 'delete', filters: [] }
  return {
    update(payload: any) {
      step.op = 'update'
      step.payload = payload
      return this
    },
    delete(payload?: any) {
      step.op = 'delete'
      step.payload = payload
      return this
    },
    eq(key: string, value: any) {
      step.filters.push({ key, value })
      if (step.filters.length >= 2) {
        recordedSteps.push(step)
        return { error: null, count: step.table === 'students' || step.table === 'rooms' ? 1 : null }
      }
      return this
    },
  }
}

vi.mock('./supabase', () => ({
  supabase: {
    auth: { getUser: authGetUser },
    from: fromMock.mockImplementation((table: string) => makeQuery(table)),
  },
}))

import { mapRoom, mapStudent, mapClass, mapEnrollment, ensureDeleteAffectedRows, deleteRoom, deleteStudent, deleteClassSeries } from './data'

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

describe('delete cascades', () => {
  it('deleteRoom detaches classes for current user before deleting room', async () => {
    recordedSteps.length = 0
    await deleteRoom('r1')
    expect(recordedSteps[0]).toEqual({
      table: 'classes',
      op: 'update',
      payload: { room_id: null },
      filters: [{ key: 'room_id', value: 'r1' }, { key: 'user_id', value: 'u1' }],
    })
    expect(recordedSteps[1].table).toBe('rooms')
    expect(recordedSteps[1].op).toBe('delete')
  })

  it('deleteStudent removes enrollments and subscriptions before deleting student', async () => {
    recordedSteps.length = 0
    await deleteStudent('s1')
    expect(recordedSteps[0].table).toBe('enrollments')
    expect(recordedSteps[0].filters).toEqual([{ key: 'student_id', value: 's1' }, { key: 'user_id', value: 'u1' }])
    expect(recordedSteps[1].table).toBe('subscriptions')
    expect(recordedSteps[1].filters).toEqual([{ key: 'student_id', value: 's1' }, { key: 'user_id', value: 'u1' }])
    expect(recordedSteps[2].table).toBe('students')
  })

  it('deleteClassSeries removes subscriptions and detaches classes before deleting series', async () => {
    recordedSteps.length = 0
    await deleteClassSeries('cs1')
    expect(recordedSteps[0].table).toBe('subscriptions')
    expect(recordedSteps[0].filters).toEqual([{ key: 'series_id', value: 'cs1' }, { key: 'user_id', value: 'u1' }])
    expect(recordedSteps[1]).toEqual({
      table: 'classes',
      op: 'update',
      payload: { series_id: null },
      filters: [{ key: 'series_id', value: 'cs1' }, { key: 'user_id', value: 'u1' }],
    })
    expect(recordedSteps[2].table).toBe('class_series')
  })
})
