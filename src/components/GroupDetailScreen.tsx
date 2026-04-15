'use client'
import { useState } from 'react'
import { ClassSeries, Subscription, Student, Class } from '@/lib/types'
import { getInitials } from '@/lib/calculations'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${MONTHS[parseInt(m) - 1]} '${y.slice(2)}`
}

interface Props {
  series: ClassSeries
  classes: Class[]
  subscriptions: Subscription[]
  students: Student[]
  onBack: () => void
  onEdit: () => void
  onSelectClass: (classId: string) => void
  onToggleSubscriptionStatus: (subscriptionId: string) => void
  onAddSubscription: (month: string) => void
}

export default function GroupDetailScreen({ series, classes, subscriptions, students, onBack, onEdit, onSelectClass, onToggleSubscriptionStatus, onAddSubscription }: Props) {
  const seriesClasses = classes.filter(c => c.seriesId === series.id)
  const seriesMonths = Array.from(new Set(seriesClasses.map(c => c.date.slice(0, 7)))).sort()

  const now = new Date()
  const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const initialMonth = seriesMonths.includes(nowYM) ? nowYM : (seriesMonths[seriesMonths.length - 1] || nowYM)
  const [selectedMonth, setSelectedMonth] = useState(initialMonth)

  const classesInMonth = seriesClasses.filter(c => c.date.startsWith(selectedMonth)).sort((a, b) => a.date.localeCompare(b.date))
  const subsInMonth = subscriptions.filter(s => s.seriesId === series.id && s.month === selectedMonth + '-01')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div className="hdr hdr-sub">
        <button className="back-btn" onClick={onBack}>← Grupos</button>
        <div style={{ position: 'relative' }}>
          <div className="hdr-title" style={{ marginBottom: 2 }}>{series.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: '.9rem' }}>
            {series.monthlyPrice}€/mes{series.description ? ` · ${series.description}` : ''}
          </div>
          <button
            onClick={onEdit}
            style={{ position: 'absolute', right: 0, top: 0, width: 24, height: 24, borderRadius: '50%', background: 'var(--cream-dark)', border: '1px solid var(--border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)', padding: 0 }}
          >✎</button>
        </div>
      </div>

      {seriesMonths.length > 0 && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 6, overflowX: 'auto' }}>
          {seriesMonths.map(ym => (
            <button
              key={ym}
              onClick={() => setSelectedMonth(ym)}
              style={{ background: selectedMonth === ym ? 'var(--olive)' : 'var(--cream-dark)', color: selectedMonth === ym ? 'white' : 'var(--text-muted)', border: 'none', borderRadius: 20, padding: '5px 13px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: "'DM Sans', sans-serif" }}
            >
              {monthLabel(ym)}
            </button>
          ))}
        </div>
      )}

      <div className="scroll">
        <div className="dlbl" style={{ marginBottom: 8 }}>Clases en {monthLabel(selectedMonth)}</div>
        <div className="card" style={{ marginBottom: 10 }}>
          {classesInMonth.length === 0 && (
            <div className="card-row"><span style={{ fontSize: 13, color: '#8a7a6a' }}>Sin clases este mes</span></div>
          )}
          {classesInMonth.map(c => (
            <div key={c.id} className="card-row" style={{ cursor: 'pointer' }} onClick={() => onSelectClass(c.id)}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>
                {new Date(c.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
              <span style={{ fontSize: 12, color: '#c8c0b0' }}>›</span>
            </div>
          ))}
        </div>

        <div className="dlbl" style={{ marginBottom: 8 }}>Suscritas en {monthLabel(selectedMonth)}</div>
        <div className="card">
          {subsInMonth.map(sub => {
            const student = students.find(s => s.id === sub.studentId)
            const isPaid = sub.status === 'paid'
            return (
              <div key={sub.id} className="arow" style={{ cursor: 'pointer' }} onClick={() => onToggleSubscriptionStatus(sub.id)}>
                <div className="avatar" style={{ background: 'var(--green-light)', color: 'var(--olive-dark)' }}>
                  {student ? getInitials(student.name) : '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{student?.name || '—'}</div>
                </div>
                {isPaid
                  ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#52582e" strokeWidth="1.2"/><path d="M4.5 7l1.8 1.8 3-3.6" stroke="#52582e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#b85c38" strokeWidth="1.2"/></svg>
                }
              </div>
            )
          })}
          <div className="arow" style={{ cursor: 'pointer' }} onClick={() => onAddSubscription(selectedMonth + '-01')}>
            <div style={{ flex: 1, fontSize: 14, color: 'var(--olive)', fontWeight: 500 }}>+ Añadir suscripción</div>
          </div>
        </div>
      </div>
    </div>
  )
}
