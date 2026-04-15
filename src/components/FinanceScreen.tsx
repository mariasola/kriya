'use client'
import { useState } from 'react'
import { FinanceScreenStore } from '@/hooks/useStore'
import { getPending, formatEur } from '@/lib/calculations'
import Sheet from './Sheet'
import LoadingScreen from './ui/LoadingScreen'

interface Props { store: FinanceScreenStore; onOpenClass: (id: string) => void }

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function FinanceScreen({ store, onOpenClass }: Props) {
  const { data, loading, updateRoom } = store
  const today = new Date()
  const [sel, setSel] = useState({ month: today.getMonth(), year: today.getFullYear() })
  const { month: selMonth, year: selYear } = sel
  const [pendSheet, setPendSheet] = useState(false)
  const [editRoomId, setEditRoomId] = useState<string | null>(null)
  const [roomEditForm, setRoomEditForm] = useState({ name: '', address: '' })

  if (loading) return <LoadingScreen />

  const currentMonth = today.getMonth()
  const monthOrder = Array.from({ length: 12 }, (_, i) => (currentMonth + i) % 12)

  const classesMes = data.classes.filter(c => {
    const f = new Date(c.date + 'T12:00:00')
    return f.getMonth() === selMonth && f.getFullYear() === selYear
  })

  const selMonthISO = `${selYear}-${String(selMonth + 1).padStart(2, '0')}-01`
  const paidSubsMes = data.subscriptions.filter(s => s.month === selMonthISO && s.status === 'paid')
  const subscriptionRevenue = paidSubsMes.reduce((sum, sub) => {
    const series = data.classSeries.find(cs => cs.id === sub.seriesId)
    return sum + (sub.price ?? series?.monthlyPrice ?? 0)
  }, 0)
  const subscribedBySeriesThisMonth = new Map<string, Set<string>>()
  data.subscriptions.filter(s => s.month === selMonthISO).forEach(s => {
    if (!subscribedBySeriesThisMonth.has(s.seriesId)) subscribedBySeriesThisMonth.set(s.seriesId, new Set())
    subscribedBySeriesThisMonth.get(s.seriesId)!.add(s.studentId)
  })
  const sueltasRevenue = classesMes.reduce((sum, c) => {
    const paid = data.enrollments.filter(e => e.classId === c.id && e.status === 'paid')
    if (!c.seriesId) return sum + paid.reduce((s, e) => s + e.total, 0)
    const subs = subscribedBySeriesThisMonth.get(c.seriesId) || new Set<string>()
    return sum + paid.filter(e => !subs.has(e.studentId)).reduce((s, e) => s + e.total, 0)
  }, 0)
  const ingresos = subscriptionRevenue + sueltasRevenue
  const subsBySeriesId: Record<string, typeof paidSubsMes> = {}
  paidSubsMes.forEach(sub => {
    if (!subsBySeriesId[sub.seriesId]) subsBySeriesId[sub.seriesId] = []
    subsBySeriesId[sub.seriesId].push(sub)
  })
  const classesSueltas = classesMes.filter(c => {
    const paid = data.enrollments.filter(e => e.classId === c.id && e.status === 'paid')
    if (paid.length === 0) return false
    if (!c.seriesId) return true
    const subs = subscribedBySeriesThisMonth.get(c.seriesId) || new Set<string>()
    return paid.some(e => !subs.has(e.studentId))
  })
  const gastos = classesMes.reduce((s, c) => s + (data.rooms.some(r => r.id === c.roomId) ? c.roomCost : 0), 0)
  const balance = ingresos - gastos
  const pendiente = classesMes.reduce((s, c) => s + getPending(c.price, data.enrollments.filter(e => e.classId === c.id)), 0)

  const pendMap: Record<string, number> = {}
  data.enrollments
    .filter(e => {
      const c = classesMes.find(x => x.id === e.classId)
      return c && (e.status === 'registered' || e.status === 'deposit_paid')
    })
    .forEach(e => {
      const c = classesMes.find(x => x.id === e.classId)
      const imp = e.status === 'registered' ? (c?.price ?? 20) : (c?.price ?? 20) - e.deposit
      pendMap[e.studentId] = (pendMap[e.studentId] || 0) + imp
    })
  const nPend = Object.keys(pendMap).length

  const roomsUsed: Record<string, { total: number; n: number }> = {}
  classesMes.forEach(c => {
    if (!c.roomId) return
    if (!data.rooms.some(r => r.id === c.roomId)) return
    if (!roomsUsed[c.roomId]) roomsUsed[c.roomId] = { total: 0, n: 0 }
    roomsUsed[c.roomId].total += c.roomCost
    roomsUsed[c.roomId].n++
  })

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr">
          <div className="hdr-lbl">Resumen</div>
          <div className="hdr-title">Finanzas</div>
          <div className="month-pills">
            {monthOrder.map(m => {
              const yr = m < currentMonth ? selYear + 1 : selYear
              const showYr = yr !== selYear ? ` '${String(yr).slice(2)}` : ''
              return (
                <button key={m} className={`mpill ${m === selMonth && yr === selYear ? 'active' : ''}`} onClick={() => setSel({ month: m, year: yr })}>
                  {MONTHS[m]}{showYr}
                </button>
              )
            })}
          </div>
        </div>

        <div className="scroll">
          <div className="finance-card">
            <div style={{ fontSize: 11, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '.06em' }}>Balance neto · {MONTHS[selMonth]}</div>
            <div className="finance-bal">{balance >= 0 ? '+' : ''}{formatEur(balance)}</div>
            <div className="fgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={{ fontSize: 11, color: '#8a7a6a', marginBottom: 2 }}>Ingresos cobrados</div><div style={{ fontSize: 18, fontWeight: 500, color: '#2a6640' }}>{formatEur(ingresos)}</div></div>
              <div><div style={{ fontSize: 11, color: '#8a7a6a', marginBottom: 2 }}>Gastos de sala</div><div style={{ fontSize: 18, fontWeight: 500, color: '#9a3a1e' }}>{formatEur(gastos)}</div></div>
            </div>
          </div>

          {pendiente > 0 && (
            <div className="sala-ic" style={{ cursor: 'pointer' }} onClick={() => setPendSheet(true)}>
              <div>
                <div className="card-row-lbl">Pendiente de cobrar</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#8a5a10' }}>{formatEur(pendiente)}</div>
              </div>
              <div style={{ fontSize: 12, color: '#8a7a6a' }}>{nPend} alumna{nPend !== 1 ? 's' : ''} →</div>
            </div>
          )}

          {Object.keys(roomsUsed).length > 0 && (
            <>
              <div className="dlbl" style={{ margin: '0 2px 8px' }}>Por sala</div>
              <div className="card">
                {Object.entries(roomsUsed).map(([rid, v]) => {
                  const r = data.rooms.find(x => x.id === rid)
                  return (
                    <div key={rid} className="card-row" style={{ cursor: 'pointer' }} onClick={() => {
                      setEditRoomId(rid)
                      setRoomEditForm({ name: r?.name || '', address: r?.address || '' })
                    }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{r?.name}</div>
                        <div style={{ fontSize: 12, color: '#8a7a6a' }}>{v.n} clase{v.n !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#9a3a1e' }}>{formatEur(v.total)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {Object.keys(subsBySeriesId).length > 0 && (
            <>
              <div className="dlbl" style={{ margin: '0 2px 8px' }}>Suscripciones</div>
              <div className="card">
                {Object.entries(subsBySeriesId).map(([seriesId, subs]) => {
                  const series = data.classSeries.find(cs => cs.id === seriesId)
                  const nClasesSerie = classesMes.filter(c => c.seriesId === seriesId).length
                  const total = subs.reduce((s, sub) => s + (sub.price ?? series?.monthlyPrice ?? 0), 0)
                  return (
                    <div key={seriesId} className="card-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <div style={{ width: 3, height: 32, background: 'var(--green-light)', borderRadius: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{series?.name || '—'}</div>
                          <div style={{ fontSize: 12, color: '#8a7a6a' }}>{subs.length} suscritas · {nClasesSerie} clases</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#2a6640' }}>{formatEur(total)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {classesSueltas.length > 0 && (
            <>
              <div className="dlbl" style={{ margin: '0 2px 8px' }}>Clases sueltas</div>
              <div className="card">
                {classesSueltas.map(c => {
                  const paid = data.enrollments.filter(e => e.classId === c.id && e.status === 'paid')
                  const subs = c.seriesId ? (subscribedBySeriesThisMonth.get(c.seriesId) || new Set<string>()) : new Set<string>()
                  const sueltaPaid = c.seriesId ? paid.filter(e => !subs.has(e.studentId)) : paid
                  const co = sueltaPaid.reduce((s, e) => s + e.total, 0)
                  const nIns = data.enrollments.filter(e => e.classId === c.id).length
                  return (
                    <div key={c.id} className="card-row" style={{ cursor: 'pointer' }} onClick={() => onOpenClass(c.id)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <div style={{ width: 3, height: 32, background: '#e8e4f0', borderRadius: 2, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#8a7a6a' }}>{new Date(c.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {nIns} alumnas</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ fontSize: 15, fontWeight: 500, color: '#2a6640' }}>{formatEur(co)}</div>
                        <span style={{ fontSize: 12, color: '#c8c0b0', marginLeft: 8 }}>›</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {Object.keys(subsBySeriesId).length === 0 && classesSueltas.length === 0 && (
            <div className="empty">Sin ingresos este mes</div>
          )}
        </div>
      </div>

      <Sheet open={!!editRoomId} onClose={() => setEditRoomId(null)} title="Editar sala">
        <label className="field-label">Nombre</label>
        <input className="field-input" value={roomEditForm.name} onChange={e => setRoomEditForm(f => ({ ...f, name: e.target.value }))} />
        <label className="field-label">Dirección</label>
        <input className="field-input" value={roomEditForm.address} onChange={e => setRoomEditForm(f => ({ ...f, address: e.target.value }))} />
        <button className="btn-primary" onClick={async () => {
          if (!roomEditForm.name.trim() || !editRoomId) return
          await updateRoom(editRoomId, roomEditForm)
          setEditRoomId(null)
        }}>Guardar</button>
        <button className="btn-ghost" onClick={() => setEditRoomId(null)}>Cancelar</button>
      </Sheet>

      <Sheet open={pendSheet} onClose={() => setPendSheet(false)} title="Pendiente de cobrar">
        <div className="card">
          {Object.entries(pendMap).map(([sid, imp]) => {
            const s = data.students.find(x => x.id === sid)
            return (
              <div key={sid} className="pend-row">
                <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{s?.name || '—'}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#8a5a10' }}>{formatEur(imp)}</div>
              </div>
            )
          })}
        </div>
        <button className="btn-ghost" onClick={() => setPendSheet(false)}>Cerrar</button>
      </Sheet>
    </>
  )
}
