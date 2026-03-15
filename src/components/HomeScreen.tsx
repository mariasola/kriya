'use client'
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { getCobrado, getPendiente, formatEur, uid } from '@/lib/data'
import { Clase } from '@/lib/types'
import Sheet from './Sheet'

interface Props { store: ReturnType<typeof useStore>; onOpenClase: (id: string) => void }

function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }
function sameDay(a: Date, b: Date) { return a.toDateString() === b.toDateString() }
function cap1(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }
function toISO(d: Date) { return d.toISOString().split('T')[0] }

export default function HomeScreen({ store, onOpenClase }: Props) {
  const { data, addClass } = store
  const today = new Date()
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ nombre: '', fecha: toISO(today), hora: '10:00', capacidad: '8', costeSala: '', salaId: data.salas[0]?.id || '' })

  const ws = new Date(today); ws.setDate(today.getDate() - today.getDay() + 1)
  const we = new Date(ws); we.setDate(ws.getDate() + 6)
  const thisWeek = data.clases.filter(c => { const f = new Date(c.fecha + 'T12:00:00'); return f >= ws && f <= we })
  const cobrado = thisWeek.reduce((s, c) => s + getCobrado(c.id, data.inscripciones), 0)
  const pendiente = thisWeek.reduce((s, c) => s + getPendiente(c.id, data.inscripciones), 0)

  const sorted = [...data.clases].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const grouped: Record<string, Clase[]> = {}
  sorted.forEach(c => {
    const f = new Date(c.fecha + 'T12:00:00')
    const k = sameDay(f, today) ? 'Hoy' : sameDay(f, addDays(today, 1)) ? 'Mañana' : cap1(f.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }))
    if (!grouped[k]) grouped[k] = []
    grouped[k].push(c)
  })
  const keys = Object.keys(grouped).filter(k => new Date(grouped[k][0].fecha + 'T12:00:00') >= addDays(today, -1))

  function handleSave() {
    if (!form.nombre || !form.fecha) return
    addClass({ nombre: form.nombre, fecha: form.fecha, hora: form.hora, salaId: form.salaId || data.salas[0]?.id, capacidad: parseInt(form.capacidad) || 8, costeSala: parseInt(form.costeSala) || 0, salaPagada: false })
    setShowNew(false)
    setForm({ nombre: '', fecha: toISO(today), hora: '10:00', capacidad: '8', costeSala: '', salaId: data.salas[0]?.id || '' })
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
                const sala = data.salas.find(s => s.id === c.salaId)
                const ins = data.inscripciones.filter(i => i.claseId === c.id)
                const f = new Date(c.fecha + 'T12:00:00')
                return (
                  <div key={c.id} className={`ccard ${sameDay(f, today) ? 'today' : ''}`} onClick={() => onOpenClase(c.id)}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span className="ccard-name">{c.nombre}</span>
                        <span className="time-badge">{c.hora}</span>
                      </div>
                      <div className="ccard-sub">
                        {sala?.nombre}
                        {c.salaPagada ? <span className="dot-g" /> : <span className="dot-r" />}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 16, fontWeight: 500, color: '#2a2a2a' }}>{ins.length}/{c.capacidad}</div>
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
        <input className="field-input" placeholder="Ej. Hatha mañana" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Fecha</label><input className="field-input" type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><label className="field-label">Hora</label><input className="field-input" type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Capacidad</label><input className="field-input" type="number" value={form.capacidad} onChange={e => setForm(f => ({ ...f, capacidad: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><label className="field-label">Coste sala (€)</label><input className="field-input" type="number" value={form.costeSala} onChange={e => setForm(f => ({ ...f, costeSala: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <label className="field-label">Sala</label>
        <select className="field-input" value={form.salaId} onChange={e => setForm(f => ({ ...f, salaId: e.target.value }))}>
          {data.salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <button className="btn-primary" onClick={handleSave}>Guardar clase</button>
        <button className="btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
      </Sheet>
    </>
  )
}
