export type EnrollmentStatus = 'registered' | 'deposit_paid' | 'paid' | 'no_show'

export interface Room {
  id: string
  name: string
  address: string
}

export interface Class {
  id: string
  name: string
  date: string       // ISO date string YYYY-MM-DD
  time: string       // HH:MM
  roomId: string | null
  capacity: number
  price: number
  roomCost: number
  roomPaid: boolean
  seriesId?: string | null
}

export interface Student {
  id: string
  name: string
  phone: string
  notes: string
}

export interface Enrollment {
  id: string
  classId: string
  studentId: string
  status: EnrollmentStatus
  deposit: number
  total: number
  priceOverride?: number | null
}

export interface ClassSeries {
  id: string
  name: string
  description?: string
  monthlyPrice: number
  userId: string
  createdAt: string
}

export interface Subscription {
  id: string
  studentId: string
  seriesId: string
  month: string // fecha ISO, siempre primer día del mes (ej: "2026-04-01")
  price: number | null // null = usa monthlyPrice de la serie
  status: 'pending' | 'paid'
  userId: string
  createdAt: string
}

export type SubscriptionStatus = 'pending' | 'paid'

export interface AppData {
  rooms: Room[]
  students: Student[]
  classes: Class[]
  enrollments: Enrollment[]
  classSeries: ClassSeries[]
  subscriptions: Subscription[]
}
