import { supabase } from './supabase'
import { AppData, Room, Class, Student, Enrollment } from './types'

export const SESSION_PRICE = 20

// ── Mappers (snake_case DB → camelCase frontend) ───────────────────────────

function mapRoom(r: any): Room {
  return { id: r.id, name: r.name, address: r.address || '' }
}

function mapStudent(s: any): Student {
  return { id: s.id, name: s.name, phone: s.phone || '', notes: s.notes || '' }
}

function mapClass(c: any): Class {
  return {
    id: c.id, name: c.name, date: c.date, time: c.time,
    roomId: c.room_id || '', capacity: c.capacity,
    roomCost: c.room_cost, roomPaid: c.room_paid
  }
}

function mapEnrollment(e: any): Enrollment {
  return {
    id: e.id, classId: e.class_id, studentId: e.student_id,
    status: e.status, deposit: e.deposit, total: e.total
  }
}

// ── Loaders ────────────────────────────────────────────────────────────────

export async function loadData(): Promise<AppData> {
  const [rooms, students, classes, enrollments] = await Promise.all([
    supabase.from('rooms').select('*').order('created_at'),
    supabase.from('students').select('*').order('name'),
    supabase.from('classes').select('*').order('date'),
    supabase.from('enrollments').select('*'),
  ])
  return {
    rooms: (rooms.data || []).map(mapRoom),
    students: (students.data || []).map(mapStudent),
    classes: (classes.data || []).map(mapClass),
    enrollments: (enrollments.data || []).map(mapEnrollment),
  }
}

// ── Rooms ──────────────────────────────────────────────────────────────────

export async function createRoom(data: Omit<Room, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: row } = await supabase.from('rooms')
    .insert({ name: data.name, address: data.address, user_id: user!.id })
    .select().single()
  return mapRoom(row)
}

// ── Students ───────────────────────────────────────────────────────────────

export async function createStudent(data: Omit<Student, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: row } = await supabase.from('students')
    .insert({ name: data.name, phone: data.phone, notes: data.notes, user_id: user!.id })
    .select().single()
  return mapStudent(row)
}

export async function updateStudent(id: string, changes: Partial<Student>) {
  const { data: row } = await supabase.from('students')
    .update({ name: changes.name, phone: changes.phone, notes: changes.notes })
    .eq('id', id).select().single()
  return mapStudent(row)
}

// ── Classes ────────────────────────────────────────────────────────────────

export async function createClass(data: Omit<Class, 'id'>) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: row } = await supabase.from('classes')
    .insert({
      name: data.name, date: data.date, time: data.time,
      room_id: data.roomId, capacity: data.capacity,
      room_cost: data.roomCost, room_paid: data.roomPaid,
      user_id: user!.id
    }).select().single()
  return mapClass(row)
}

export async function updateClass(id: string, changes: Partial<Class>) {
  const update: any = {}
  if (changes.name !== undefined) update.name = changes.name
  if (changes.date !== undefined) update.date = changes.date
  if (changes.time !== undefined) update.time = changes.time
  if (changes.roomId !== undefined) update.room_id = changes.roomId
  if (changes.capacity !== undefined) update.capacity = changes.capacity
  if (changes.roomCost !== undefined) update.room_cost = changes.roomCost
  if (changes.roomPaid !== undefined) update.room_paid = changes.roomPaid
  const { data: row } = await supabase.from('classes')
    .update(update).eq('id', id).select().single()
  return mapClass(row)
}

// ── Enrollments ────────────────────────────────────────────────────────────

export async function createEnrollment(classId: string, studentId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  const { data: row } = await supabase.from('enrollments')
    .insert({ class_id: classId, student_id: studentId, user_id: user!.id })
    .select().single()
  return mapEnrollment(row)
}

export async function updateEnrollment(id: string, changes: Partial<Enrollment>) {
  const update: any = {}
  if (changes.status !== undefined) update.status = changes.status
  if (changes.deposit !== undefined) update.deposit = changes.deposit
  if (changes.total !== undefined) update.total = changes.total
  const { data: row } = await supabase.from('enrollments')
    .update(update).eq('id', id).select().single()
  return mapEnrollment(row)
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function getRevenue(classId: string, enrollments: Enrollment[]): number {
  return enrollments
    .filter(e => e.classId === classId)
    .reduce((s, e) => s + (e.status === 'paid' ? e.total : e.status === 'deposit_paid' ? e.deposit : 0), 0)
}

export function getPending(classId: string, enrollments: Enrollment[]): number {
  return enrollments
    .filter(e => e.classId === classId)
    .reduce((s, e) => {
      if (e.status === 'registered') return s + SESSION_PRICE
      if (e.status === 'deposit_paid') return s + (SESSION_PRICE - e.deposit)
      return s
    }, 0)
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
}

export function formatEur(n: number): string { return `${n}€` }
