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
}

export interface AppData {
  rooms: Room[]
  students: Student[]
  classes: Class[]
  enrollments: Enrollment[]
}
