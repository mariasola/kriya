'use client'
import { useState, useEffect } from 'react'
import { HomeScreenStore } from '@/hooks/useStore'
import { getRevenue, getPending, formatEur } from '@/lib/data'
import { Class } from '@/lib/types'
import Sheet from './Sheet'

interface Props { store: HomeScreenStore; onOpenClass: (id: string) => void; isActiveTab: boolean }

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function cap1(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
function toISO(d: Date) { return d.toISOString().split('T')[0] }

export default function HomeScreen({ store, onOpenClass, isActiveTab }: Props) {
  const { data, loading, addClass, addRoom } = store
  const today = new Date()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', date: toISO(today), time: '10:00', capacity: '8', price: '20', roomCost: '', roomId: '' })
  const [showInlineRoom, setShowInlineRoom] = useState(false)
  const [inlineRoomName, setInlineRoomName] = useState('')
  const [inlineRoomAddress, setInlineRoomAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingRoom, setSavingRoom] = useState(false)

  useEffect(() => {
    setForm(f => (!f.roomId && data.rooms.length > 0 ? { ...f, roomId: data.rooms[0].id } : f))
  }, [data.rooms])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: '#f5f0e8' }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: '#8a7a6a', fontStyle: 'italic' }}>Cargando...</p>
    </div>
  )

  const ws = new Date(today); ws.setDate(today.getDate() - today.getDay() + 1)
  const we = new Date(ws); we.setDate(ws.getDate() + 6)
  const thisWeek = data.classes.filter(c => { const f = new Date(c.date + 'T12:00:00'); return f >= ws && f <= we })
  const cobrado = thisWeek.reduce((s, c) => s + getRevenue(c.price, data.enrollments.filter(e => e.classId === c.id)), 0)
  const pendiente = thisWeek.reduce((s, c) => s + getPending(c.price, data.enrollments.filter(e => e.classId === c.id)), 0)

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
    if (!form.name || !form.date || !form.roomId) return
    if (saving) return
    setSaving(true)
    try {
      await addClass({ name: form.name, date: form.date, time: form.time, roomId: form.roomId, capacity: parseInt(form.capacity) || 8, price: parseInt(form.price) || 20, roomCost: parseInt(form.roomCost) || 0, roomPaid: false })
      setShowNew(false)
      setForm({ name: '', date: toISO(today), time: '10:00', capacity: '8', price: '20', roomCost: '', roomId: data.rooms[0]?.id || '' })
    } finally {
      setSaving(false)
    }
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
          {keys.length > 0 && <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 10 }}>Próximas clases</div>}
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

      {isActiveTab && (
        <button className="fab" onClick={() => setShowNew(true)}>
          <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      )}

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
          <div><label className="field-label">Precio clase (€)</label><input className="field-input" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Coste sala (€)</label><input className="field-input" type="number" value={form.roomCost} onChange={e => setForm(f => ({ ...f, roomCost: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div />
        </div>
        <div style={{ height: 12 }} />
        <label className="field-label">Sala</label>
        {data.rooms.length > 0 && !showInlineRoom && (
          <>
            <select className="field-input" value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}>
              {data.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <span onClick={() => setShowInlineRoom(true)} style={{ display: 'inline-block', marginTop: 6, marginBottom: 4, fontSize: 13, color: '#3d4a2e', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              + Añadir sala
            </span>
          </>
        )}
        {(data.rooms.length === 0 || showInlineRoom) && (
          <div style={{ background: '#f5f0e8', borderRadius: 10, padding: '12px', border: '.5px solid #d8d0c0', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: '#8a7a6a', marginBottom: 8 }}>Nueva sala</div>
            <input className="field-input" placeholder="Nombre de la sala" value={inlineRoomName} onChange={e => setInlineRoomName(e.target.value)} style={{ marginBottom: 8 }} />
            <input className="field-input" placeholder="Dirección (opcional)" value={inlineRoomAddress} onChange={e => setInlineRoomAddress(e.target.value)} style={{ marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-secondary" style={{ flex: 1, padding: '.65rem', fontSize: 13, opacity: savingRoom ? 0.6 : 1 }} disabled={savingRoom} onClick={async () => {
                if (!inlineRoomName.trim()) return
                if (savingRoom) return
                setSavingRoom(true)
                try {
                  const newRoom = await addRoom({ name: inlineRoomName.trim(), address: inlineRoomAddress.trim() })
                  setForm(f => ({ ...f, roomId: newRoom.id }))
                  setInlineRoomName('')
                  setInlineRoomAddress('')
                  setShowInlineRoom(false)
                } finally {
                  setSavingRoom(false)
                }
              }}>{savingRoom ? 'Guardando...' : 'Guardar sala'}</button>
              {data.rooms.length > 0 && (
                <button className="btn-ghost" style={{ flex: 1, padding: '.65rem', fontSize: 13 }} onClick={() => { setShowInlineRoom(false); setInlineRoomName(''); setInlineRoomAddress('') }}>Cancelar</button>
              )}
            </div>
          </div>
        )}
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar clase'}</button>
        <button className="btn-ghost" onClick={() => setShowNew(false)}>Cancelar</button>
      </Sheet>
    </>
  )
}
