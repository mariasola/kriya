'use client'
import { useState, useEffect } from 'react'
import { HomeScreenStore } from '@/hooks/useStore'
import { getRevenue, getPending, formatEur } from '@/lib/calculations'
import { Class } from '@/lib/types'
import Sheet from './Sheet'
import LoadingScreen from './ui/LoadingScreen'
import InlineRoomForm from './ui/InlineRoomForm'

interface Props { store: HomeScreenStore; onOpenClass: (id: string) => void; isActiveTab: boolean; onOpenGroups: () => void }

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function cap1(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
function toISO(d: Date) { return d.toISOString().split('T')[0] }

export default function HomeScreen({ store, onOpenClass, isActiveTab, onOpenGroups }: Props) {
  const { data, loading, addClass, addRoom } = store
  const today = new Date()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', date: toISO(today), time: '10:00', capacity: '8', price: '20', roomCost: '', roomId: '' })
  const [showInlineRoom, setShowInlineRoom] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setForm(f => (!f.roomId && data.rooms.length > 0 ? { ...f, roomId: data.rooms[0].id } : f))
  }, [data.rooms])

  if (loading) return <LoadingScreen />

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="hdr-title">Esta semana</div>
            <button onClick={onOpenGroups} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px', fontSize: 9, color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", flexShrink: 0, marginBottom: '.9rem' }}>Grupos ›</button>
          </div>
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
                  <div key={c.id} style={{ display: 'flex', background: 'var(--white)', border: sameDay(f, today) ? '1px solid var(--olive-light)' : '.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 8, cursor: 'pointer', transition: 'transform .1s' }} onClick={() => onOpenClass(c.id)}>
                    <div style={{ width: 3, flexShrink: 0, background: c.seriesId ? 'var(--green-light)' : 'transparent' }} />
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '.85rem 1rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <span className="ccard-name">{c.name}</span>
                          <span className="time-badge">{c.time}</span>
                        </div>
                        <div className="ccard-sub">
                          {room?.name}
                          {c.roomPaid
                            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#52582e" strokeWidth="1.2"/><path d="M4.5 7l1.8 1.8 3-3.6" stroke="#52582e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#b85c38" strokeWidth="1.2"/></svg>
                          }
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 500, color: '#2a2a2a' }}>{ins.length}/{c.capacity}</div>
                        <div style={{ fontSize: 10, color: '#8a7a6a', marginTop: 2 }}>alumnas</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
          {keys.length > 0 && (
            <div className="legend">
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 3, height: 12, background: 'var(--green-light)', borderRadius: 2 }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Clase recurrente</span>
              </div>
            </div>
          )}
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
          <InlineRoomForm
            hasExistingRooms={data.rooms.length > 0}
            addRoom={addRoom}
            onSaved={room => { setForm(f => ({ ...f, roomId: room.id })); setShowInlineRoom(false) }}
            onCancel={() => setShowInlineRoom(false)}
          />
        )}
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar clase'}</button>
        <button className="btn-ghost" onClick={() => setShowNew(false)}>Cancelar</button>
      </Sheet>
    </>
  )
}
