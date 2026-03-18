import { Enrollment, EnrollmentStatus } from './types'

export function getRevenue(classPrice: number, enrollments: Enrollment[]): number {
  return enrollments
    .reduce((s, e) => s + (e.status === 'paid' ? e.total : e.status === 'deposit_paid' ? e.deposit : 0), 0)
}

export function getPending(classPrice: number, enrollments: Enrollment[]): number {
  return enrollments
    .reduce((s, e) => {
      if (e.status === 'registered') return s + classPrice
      if (e.status === 'deposit_paid') return s + (classPrice - e.deposit)
      return s
    }, 0)
}

export function computeEnrollmentChanges(
  enrollment: Enrollment,
  newStatus: EnrollmentStatus,
  classPrice: number
): Partial<Enrollment> {
  const changes: Partial<Enrollment> = { status: newStatus }
  if (newStatus === 'paid') changes.total = classPrice
  if (newStatus === 'deposit_paid' && enrollment.deposit === 0) changes.deposit = 10
  if (newStatus === 'registered' || newStatus === 'no_show') changes.total = 0
  return changes
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
}

export function formatEur(n: number): string { return `${n}€` }
