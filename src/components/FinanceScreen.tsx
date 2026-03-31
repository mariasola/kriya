'use client'
import { useState } from 'react'
import { FinanceScreenStore } from '@/hooks/useStore'
import { getRevenue, getPending, formatEur } from '@/lib/data'
import Sheet from './Sheet'

interface Props { store: FinanceScreenStore; onOpenClass: (id: string) => void }

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function FinanceScreen({ store, onOpenClass }: Props) {
  const { data, loading, updateRoom } = store
  const today = new Date()
  const [selMonth, setSelMonth] = useState(today.getMonth())
  const selYear = today.getFullYear()
  const [pendSheet, setPendSheet] = useState(false)
  const [editRoomId, setEditRoomId] = useState<string | null>(null)
  const [roomEditForm, setRoomEditForm] = useState({ name: '', address: '' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: '#f5f0e8' }}>
      <p style={{ color: '#8a7a6a', fontSize: 14 }}>Cargando...</p>
    </div>
  )

  const currentMonth = today.getMonth()
  const monthOrder = Array.from({ length: 12 }, (_, i) => (currentMonth + i) % 12)

  const classesMes = data.classes.filter(c => {
    const f = new Date(c.date + 'T12:00:00')
    return f.getMonth() === selMonth && f.getFullYear() === selYear
  })

  const ingresos = classesMes.reduce((s, c) => s + getRevenue(c.price, data.enrollments.filter(e => e.classId === c.id)), 0)
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
                <button key={m} className={`mpill ${m === selMonth ? 'active' : ''}`} onClick={() => setSelMonth(m)}>
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

          {classesMes.length > 0 ? (
            <>
              <div className="dlbl" style={{ margin: '0 2px 8px' }}>Clases del mes</div>
              <div className="card">
                {classesMes.map(c => {
                  const co = getRevenue(c.price, data.enrollments.filter(e => e.classId === c.id))
                  const pe = getPending(c.price, data.enrollments.filter(e => e.classId === c.id))
                  const nIns = data.enrollments.filter(e => e.classId === c.id).length
                  return (
                    <div key={c.id} className="card-row" onClick={() => onOpenClass(c.id)} style={{ cursor: 'pointer' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: '#8a7a6a' }}>{new Date(c.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {nIns} alumnas</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ textAlign: 'right' }}>
                          {co > 0 && <div style={{ fontSize: 14, fontWeight: 500, color: '#2a6640' }}>{formatEur(co)} cobrado</div>}
                          {pe > 0 && <div style={{ fontSize: 13, color: '#8a5a10', marginTop: 2 }}>{formatEur(pe)} pendiente</div>}
                          {co === 0 && pe === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>Sin ingresos</div>}
                        </div>
                        <span style={{ fontSize: 12, color: '#c8c0b0', marginLeft: 8 }}>›</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="empty">Sin clases este mes</div>
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
