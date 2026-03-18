import { Enrollment, EnrollmentStatus } from './types'

export const SESSION_PRICE = 20

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

export function computeEnrollmentChanges(
  enrollment: Enrollment,
  newStatus: EnrollmentStatus
): Partial<Enrollment> {
  const changes: Partial<Enrollment> = { status: newStatus }
  if (newStatus === 'paid') changes.total = SESSION_PRICE
  if (newStatus === 'deposit_paid' && enrollment.deposit === 0) changes.deposit = 10
  if (newStatus === 'registered' || newStatus === 'no_show') changes.total = 0
  return changes
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
}

export function formatEur(n: number): string { return `${n}€` }
