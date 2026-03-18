'use client'
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { getRevenue, getPending, formatEur } from '@/lib/data'
import { Class } from '@/lib/types'
import Sheet from './Sheet'

interface Props { store: ReturnType<typeof useStore>; onOpenClass: (id: string) => void }

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function cap1(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
function toISO(d: Date) { return d.toISOString().split('T')[0] }

export default function HomeScreen({ store, onOpenClass }: Props) {
  const { data, loading, addClass, addRoom } = store
  const today = new Date()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', date: toISO(today), time: '10:00', capacity: '8', roomCost: '', roomId: data.rooms[0]?.id || '' })
  const [showNewRoom, setShowNewRoom] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', address: '' })

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: '#f5f0e8' }}>
      <p style={{ color: '#8a7a6a', fontSize: 14 }}>Cargando...</p>
    </div>
  )

  const ws = new Date(today); ws.setDate(today.getDate() - today.getDay() + 1)
  const we = new Date(ws); we.setDate(ws.getDate() + 6)
  const thisWeek = data.classes.filter(c => { const f = new Date(c.date + 'T12:00:00'); return f >= ws && f <= we })
  const cobrado = thisWeek.reduce((s, c) => s + getRevenue(c.id, data.enrollments), 0)
  const pendiente = thisWeek.reduce((s, c) => s + getPending(c.id, data.enrollments), 0)

  const sorted = [...data.classes].sort((a, b) => a.date.localeCompare(b.date))
  const grouped: Record<string, Class[]> = {}
  sorted.forEach(c => {
    const f = new Date(c.date + 'T12:00:00')
    const k = sameDay(f, today) ? 'Hoy' : sameDay(f, addDays(today, 1)) ? 'Mañana' : cap1(f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))
    if (!grouped[k]) grouped[k] = []
    grouped[k].push(c)
  })
  const keys = Object.keys(grouped).filter(k => new Date(grouped[k][0].date + 'T12:00:00') >= addDays(today, -1))

  async function handleSave() {
    if (!form.name || !form.date) return
    await addClass({ name: form.name, date: form.date, time: form.time, roomId: form.roomId || data.rooms[0]?.id, capacity: parseInt(form.capacity) || 8, roomCost: parseInt(form.roomCost) || 0, roomPaid: false })
    setShowNew(false)
    setForm({ name: '', date: toISO(today), time: '10:00', capacity: '8', roomCost: '', roomId: data.rooms[0]?.id || '' })
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr">
          <div className="hdr-lbl">{cap1(today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
          <div className="hdr-title">Esta semana</div>
          <div className="metrics">
            <div className="metric"><div className="metric-val">{thisWeek.length}</div><div className="metric-lbl">clases</div></div>
            <div className="metric"><div className="metric-val green">{formatEur(cobrado)}</div><div className="metric-lbl">cobrado</div></div>
            <div className="metric"><div className="metric-val amber">{formatEur(pendiente)}</div><div className="metric-lbl">pendiente</div></div>
          </div>
        </div>
        <div className="scroll">
          {keys.length === 0 && <div className="empty">No hay clases próximas.<br />Pulsa + para añadir una.</div>}
          {keys.map(k => (
            <div key={k} style={{ marginBottom: '1rem' }}>
              <div className="dlbl">{k}</div>
              {grouped[k].map(c => {
                const room = data.rooms.find(s => s.id === c.roomId)
                const ins = data.enrollments.filter(i => i.classId === c.id)
                const f = new Date(c.date + 'T12:00:00')
                return (
                  <div key={c.id} className={`ccard ${sameDay(f, today) ? 'today' : ''}`} onClick={() => onOpenClass(c.id)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span className="ccard-name">{c.name}</span>
                        <span className="time-badge">{c.time}</span>
                      </div>
                      <div className="ccard-sub">
                        {room?.name}
                        {c.roomPaid ? <span className="dot-g" /> : <span className="dot-r" />}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 500, color: '#2a2a2a' }}>{ins.length}/{c.capacity}</div>
                      <div style={{ fontSize: 10, color: '#8a7a6a', marginTop: 2 }}>alumnas</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          <div className="legend">
            <div className="legend-item"><span className="dot-g" />Sala pagada</div>
            <div className="legend-item"><span className="dot-r" />Sin pagar</div>
          </div>
        </div>
      </div>

      <button className="fab" onClick={() => setShowNew(true)}>
        <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="Nueva clase">
        <label className="field-label">Nombre</label>
        <input className="field-input" placeholder="Ej. Hatha mañana" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Fecha</label><input className="field-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><label className="field-label">Hora</label><input className="field-input" type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Capacidad</label><input className="field-input" type="number" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><label className="field-label">Coste sala (€)</label><input className="field-input" type="number" value={form.roomCost} onChange={e => setForm(f => ({ ...f, roomCost: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <label className="field-label">Sala</label>
        <select className="field-input" value={form.roomId} onChange={e => {
          if (e.target.value === '__new__') { setShowNewRoom(true); return }
          setForm(f => ({ ...f, roomId: e.target.value }))
        }}>
          <option value="__new__">+ Nueva sala</option>
          {data.rooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn-primary" onClick={handleSave}>Guardar clase</button>
        <button className="btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
      </Sheet>

      <Sheet open={showNewRoom} onClose={() => { setShowNewRoom(false); setRoomForm({ name: '', address: '' }) }} title="Nueva sala">
        <label className="field-label">Nombre</label>
        <input className="field-input" placeholder="Ej. Espai Cos" value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} />
        <label className="field-label">Dirección</label>
        <input className="field-input" placeholder="Ej. Carrer Llull 42" value={roomForm.address} onChange={e => setRoomForm(f => ({ ...f, address: e.target.value }))} />
        <button className="btn-primary" onClick={async () => {
          if (!roomForm.name.trim()) return
          const r = await addRoom(roomForm)
          setForm(f => ({ ...f, roomId: r.id }))
          setShowNewRoom(false)
          setRoomForm({ name: '', address: '' })
        }}>Guardar sala</button>
        <button className="btn-secondary" onClick={() => { setShowNewRoom(false); setRoomForm({ name: '', address: '' }) }}>Cancelar</button>
      </Sheet>
    </>
  )
}
