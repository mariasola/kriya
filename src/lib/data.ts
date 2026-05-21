import { supabase } from './supabase'
import { AppData, Room, Class, Student, Enrollment, ClassSeries, Subscription, SubscriptionStatus } from './types'


// ── Mappers (snake_case DB → camelCase frontend) ───────────────────────────

export function mapRoom(r: any): Room {
  return { id: r.id, name: r.name, address: r.address || '' }
}

export function mapStudent(s: any): Student {
  return { id: s.id, name: s.name, phone: s.phone || '', notes: s.notes || '' }
}

export function mapClass(c: any): Class {
  return {
    id: c.id, name: c.name, date: c.date, time: c.time,
    roomId: c.room_id || null, capacity: c.capacity,
    price: c.price ?? 20,
    roomCost: c.room_cost, roomPaid: c.room_paid,
    seriesId: c.series_id ?? null,
  }
}

export function mapEnrollment(e: any): Enrollment {
  return {
    id: e.id, classId: e.class_id, studentId: e.student_id,
    status: e.status, deposit: e.deposit, total: e.total,
    priceOverride: e.price_override ?? null,
  }
}

export function mapClassSeries(s: any): ClassSeries {
  return {
    id: s.id, name: s.name, description: s.description || undefined,
    monthlyPrice: s.monthly_price, userId: s.user_id, createdAt: s.created_at,
  }
}

export function mapSubscription(s: any): Subscription {
  return {
    id: s.id, studentId: s.student_id, seriesId: s.series_id,
    month: s.month, price: s.price ?? null, status: s.status,
    userId: s.user_id, createdAt: s.created_at,
  }
}

// ── Price helper ───────────────────────────────────────────────────────────

export function calculateClassPrice(monthlyPrice: number, classesInMonth: number): number {
  if (classesInMonth === 0) return 0
  return monthlyPrice / classesInMonth
}

// ── Auth helper ────────────────────────────────────────────────────────────

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

// ── DB result helper ───────────────────────────────────────────────────────

function unwrap<T>(result: { data: T | null; error: any }): T {
  if (result.error) throw new Error(result.error.message)
  if (result.data === null) throw new Error('No data returned from database')
  return result.data
}

export function ensureDeleteAffectedRows(entity: string, count: number | null): void {
  if (!count) throw new Error(`${entity} not found or you do not have permission to delete it`)
}

// ── Loaders ────────────────────────────────────────────────────────────────

export async function loadData(): Promise<AppData> {
  const userId = await getUserId()
  // Load subscriptions for last 6 months to support Finance month navigation
  const now = new Date()
  const monthsToLoad: string[] = []
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthsToLoad.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`)
  }
  const [rooms, students, classes, enrollments, classSeries, subscriptions] = await Promise.all([
    supabase.from('rooms').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('students').select('*').eq('user_id', userId).order('name'),
    supabase.from('classes').select('*').eq('user_id', userId).order('date'),
    supabase.from('enrollments').select('*').eq('user_id', userId),
    supabase.from('class_series').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('*').eq('user_id', userId).in('month', monthsToLoad),
  ])
  return {
    rooms: (rooms.data || []).map(mapRoom),
    students: (students.data || []).map(mapStudent),
    classes: (classes.data || []).map(mapClass),
    enrollments: (enrollments.data || []).map(mapEnrollment),
    classSeries: (classSeries.data || []).map(mapClassSeries),
    subscriptions: (subscriptions.data || []).map(mapSubscription),
  }
}

// ── Rooms ──────────────────────────────────────────────────────────────────

export async function createRoom(data: Omit<Room, 'id'>): Promise<Room> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('rooms')
    .insert({ name: data.name, address: data.address, user_id: userId })
    .select().single())
  return mapRoom(row)
}

export async function updateRoom(id: string, changes: Partial<Room>): Promise<Room> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('rooms')
    .update({ name: changes.name, address: changes.address })
    .eq('id', id).eq('user_id', userId).select().single())
  return mapRoom(row)
}

export async function deleteRoom(id: string): Promise<void> {
  const userId = await getUserId()
  const { error, count } = await supabase.from('rooms').delete({ count: 'exact' }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  ensureDeleteAffectedRows('Room', count)
}

// ── Students ───────────────────────────────────────────────────────────────

export async function createStudent(data: Omit<Student, 'id'>): Promise<Student> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('students')
    .insert({ name: data.name, phone: data.phone, notes: data.notes, user_id: userId })
    .select().single())
  return mapStudent(row)
}

export async function updateStudent(id: string, changes: Partial<Student>): Promise<Student> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('students')
    .update({ name: changes.name, phone: changes.phone, notes: changes.notes })
    .eq('id', id).eq('user_id', userId).select().single())
  return mapStudent(row)
}

export async function deleteStudent(id: string): Promise<void> {
  const userId = await getUserId()
  const { error, count } = await supabase.from('students').delete({ count: 'exact' }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  ensureDeleteAffectedRows('Student', count)
}

// ── Classes ────────────────────────────────────────────────────────────────

export async function createClass(data: Omit<Class, 'id'>): Promise<Class> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('classes')
    .insert({
      name: data.name, date: data.date, time: data.time,
      room_id: data.roomId, capacity: data.capacity,
      price: data.price,
      room_cost: data.roomCost, room_paid: data.roomPaid,
      series_id: data.seriesId ?? null,
      user_id: userId,
    }).select().single())
  return mapClass(row)
}

export async function updateClass(id: string, changes: Partial<Class>): Promise<Class> {
  const userId = await getUserId()
  const update: any = {}
  if (changes.name !== undefined) update.name = changes.name
  if (changes.date !== undefined) update.date = changes.date
  if (changes.time !== undefined) update.time = changes.time
  if (changes.roomId !== undefined) update.room_id = changes.roomId
  if (changes.capacity !== undefined) update.capacity = changes.capacity
  if (changes.price !== undefined) update.price = changes.price
  if (changes.roomCost !== undefined) update.room_cost = changes.roomCost
  if (changes.roomPaid !== undefined) update.room_paid = changes.roomPaid
  if (changes.seriesId !== undefined) update.series_id = changes.seriesId
  const row = unwrap(await supabase.from('classes')
    .update(update).eq('id', id).eq('user_id', userId).select().single())
  return mapClass(row)
}

export async function deleteClass(id: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from('classes').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

// ── Enrollments ────────────────────────────────────────────────────────────

export async function createEnrollment(classId: string, studentId: string): Promise<Enrollment> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('enrollments')
    .insert({ class_id: classId, student_id: studentId, user_id: userId })
    .select().single())
  return mapEnrollment(row)
}

export async function updateEnrollment(id: string, changes: Partial<Enrollment>): Promise<Enrollment> {
  const userId = await getUserId()
  const update: any = {}
  if (changes.status !== undefined) update.status = changes.status
  if (changes.deposit !== undefined) update.deposit = changes.deposit
  if (changes.total !== undefined) update.total = changes.total
  if (changes.priceOverride !== undefined) update.price_override = changes.priceOverride
  const row = unwrap(await supabase.from('enrollments')
    .update(update).eq('id', id).eq('user_id', userId).select().single())
  return mapEnrollment(row)
}

export async function deleteEnrollment(id: string): Promise<void> {
  const userId = await getUserId()
  const { error, count } = await supabase.from('enrollments').delete({ count: 'exact' }).eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
  ensureDeleteAffectedRows('Enrollment', count)
}

// ── ClassSeries ────────────────────────────────────────────────────────────

export async function getClassSeries(): Promise<ClassSeries[]> {
  const userId = await getUserId()
  const { data } = await supabase.from('class_series').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  return (data || []).map(mapClassSeries)
}

export async function createClassSeries(data: Omit<ClassSeries, 'id' | 'userId' | 'createdAt'>): Promise<ClassSeries> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('class_series')
    .insert({ name: data.name, description: data.description ?? null, monthly_price: data.monthlyPrice, user_id: userId })
    .select().single())
  return mapClassSeries(row)
}

export async function updateClassSeries(id: string, changes: Partial<Pick<ClassSeries, 'name' | 'description' | 'monthlyPrice'>>): Promise<ClassSeries> {
  const userId = await getUserId()
  const update: any = {}
  if (changes.name !== undefined) update.name = changes.name
  if (changes.description !== undefined) update.description = changes.description
  if (changes.monthlyPrice !== undefined) update.monthly_price = changes.monthlyPrice
  const row = unwrap(await supabase.from('class_series')
    .update(update).eq('id', id).eq('user_id', userId).select().single())
  return mapClassSeries(row)
}

export async function deleteClassSeries(id: string): Promise<void> {
  const userId = await getUserId()
  const { error } = await supabase.from('class_series').delete().eq('id', id).eq('user_id', userId)
  if (error) throw new Error(error.message)
}

// ── Subscriptions ──────────────────────────────────────────────────────────

export async function getSubscriptionsBySeriesAndMonth(seriesId: string, month: string): Promise<Subscription[]> {
  const userId = await getUserId()
  const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).eq('series_id', seriesId).eq('month', month)
  return (data || []).map(mapSubscription)
}

export async function getSubscriptionsByStudent(studentId: string): Promise<Subscription[]> {
  const userId = await getUserId()
  const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).eq('student_id', studentId).order('month', { ascending: false })
  return (data || []).map(mapSubscription)
}

export async function getSubscriptionsByMonth(month: string): Promise<Subscription[]> {
  const userId = await getUserId()
  const { data } = await supabase.from('subscriptions').select('*').eq('user_id', userId).eq('month', month)
  return (data || []).map(mapSubscription)
}

export async function createSubscription(data: Omit<Subscription, 'id' | 'userId' | 'createdAt'>): Promise<Subscription> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('subscriptions')
    .insert({ student_id: data.studentId, series_id: data.seriesId, month: data.month, price: data.price ?? null, status: data.status, user_id: userId })
    .select().single())
  return mapSubscription(row)
}

export async function updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<Subscription> {
  const userId = await getUserId()
  const row = unwrap(await supabase.from('subscriptions')
    .update({ status }).eq('id', id).eq('user_id', userId).select().single())
  return mapSubscription(row)
}
