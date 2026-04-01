import { EnrollmentStatus } from '@/lib/types'

const CLASS_MAP: Record<EnrollmentStatus, string> = {
  paid: 'badge-paid',
  deposit_paid: 'badge-reserva',
  registered: 'badge-apuntada',
  no_show: 'badge-novino',
}

interface Props { status: EnrollmentStatus; deposit: number }

export default function StatusBadge({ status, deposit }: Props) {
  const label =
    status === 'paid' ? 'Pagada' :
    status === 'deposit_paid' ? `Reserva ${deposit}€` :
    status === 'registered' ? 'Apuntada' : 'No vino'
  return <span className={`badge ${CLASS_MAP[status]}`}>{label}</span>
}
