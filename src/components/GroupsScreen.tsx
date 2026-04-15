'use client'
import { ClassSeries, Subscription, Class } from '@/lib/types'

interface Props {
  classSeries: ClassSeries[]
  subscriptions: Subscription[]
  classes: Class[]
  onBack: () => void
  onSelectSeries: (series: ClassSeries) => void
  onNewSeries: () => void
}

export default function GroupsScreen({ classSeries, subscriptions, classes, onBack, onSelectSeries, onNewSeries }: Props) {
  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div className="hdr hdr-sub">
        <button className="back-btn" onClick={onBack}>← Volver</button>
        <div className="hdr-title">Mis grupos</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: '.5rem' }}>Clases recurrentes por suscripción</div>
      </div>
      <div className="scroll">
        {classSeries.length === 0 && (
          <div className="empty">No hay grupos aún.<br />Crea tu primer grupo recurrente.</div>
        )}
        {classSeries.map(series => {
          const nSuscritas = new Set(subscriptions.filter(s => s.seriesId === series.id).map(s => s.studentId)).size
          const nClasesMes = classes.filter(c => c.seriesId === series.id && c.date.startsWith(currentYM)).length
          return (
            <div
              key={series.id}
              style={{ display: 'flex', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 8, background: 'white', cursor: 'pointer' }}
              onClick={() => onSelectSeries(series)}
            >
              <div style={{ width: 3, flexShrink: 0, background: 'var(--green-light)' }} />
              <div style={{ flex: 1, padding: '.8rem 1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#2a2a2a' }}>{series.name}</div>
                  {series.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{series.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, background: '#eef2e6', color: '#4a5e2a', borderRadius: 20, padding: '2px 8px' }}>{nSuscritas} suscritas</span>
                    <span style={{ fontSize: 10, background: '#f5f0e8', color: 'var(--text-muted)', borderRadius: 20, padding: '2px 8px' }}>{nClasesMes} clases/mes</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ fontWeight: 600, color: 'var(--olive-dark)', fontSize: 15 }}>{series.monthlyPrice}€</div>
                  <span style={{ fontSize: 12, color: '#c8c0b0' }}>›</span>
                </div>
              </div>
            </div>
          )
        })}
        <button
          onClick={onNewSeries}
          style={{ width: '100%', background: 'var(--cream-dark)', borderRadius: 10, border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: 14, padding: '1rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 4 }}
        >
          + Nuevo grupo
        </button>
      </div>
    </div>
  )
}
