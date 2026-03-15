'use client'
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { getCobrado, getPendiente, getInitials, formatEur } from '@/lib/data'
import { EstadoInscripcion } from '@/lib/types'
import Sheet from './Sheet'

interface Props { store: ReturnType<typeof useStore>; claseId: string; onBack: () => void }

const ESTADO_OPTS: { v: EstadoInscripcion; l: string; c: string }[] = [
  { v: 'apuntada', l: 'Apuntada', c: 'badge-apuntada' },
  { v: 'reserva_pagada', l: 'Reserva pagada', c: 'badge-reserva' },
  { v: 'pagada', l: 'Pagada completo', c: 'badge-paid' },
  { v: 'no_vino', l: 'No vino', c: 'badge-novino' },
]

function estadoBadge(e: EstadoInscripcion, r: number) {
  const map = { pagada: 'badge-paid', reserva_pagada: 'badge-reserva', apuntada: 'badge-apuntada', no_vino: 'badge-novino' }
  const label = e === 'pagada' ? 'Pagada' : e === 'reserva_pagada' ? `Reserva ${r}€` : e === 'apuntada' ? 'Apuntada' : 'No vino'
  return <span className={`badge ${map[e]}`}>{label}</span>
}

export default function ClaseScreen({ store, claseId, onBack }: Props) {
  const { data, updateClass, addInscripcion, setEstado, addAlumna } = store
  const clase = data.clases.find(c => c.id === claseId)!
  const sala = data.salas.find(s => s.id === clase.salaId)
  const ins = data.inscripciones.filter(i => i.claseId === claseId)
  const cobrado = getCobrado(claseId, data.inscripciones)
  const pendiente = getPendiente(claseId, data.inscripciones)

  const [editSheet, setEditSheet] = useState(false)
  const [addSheet, setAddSheet] = useState(false)
  const [estadoSheet, setEstadoSheet] = useState<string | null>(null)
  const [addInput, setAddInput] = useState('')
  const [selAlumna, setSelAlumna] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ nombre: clase.nombre, fecha: clase.fecha, hora: clase.hora, capacidad: String(clase.capacidad), costeSala: String(clase.costeSala), salaId: clase.salaId })

  const existingIds = ins.map(i => i.alumnaId)
  const suggestions = data.alumnas.filter(a => a.nombre.toLowerCase().includes(addInput.toLowerCase()) && !existingIds.includes(a.id))

  function handleSaveEdit() {
    updateClass(claseId, { nombre: editForm.nombre, fecha: editForm.fecha, hora: editForm.hora, capacidad: parseInt(editForm.capacidad) || 8, costeSala: parseInt(editForm.costeSala) || 0, salaId: editForm.salaId })
    setEditSheet(false)
  }

  function handleAddAlumna() {
    const val = addInput.trim()
    if (!val) return
    let aid = selAlumna
    if (!aid) {
      const ex = data.alumnas.find(a => a.nombre.toLowerCase() === val.toLowerCase())
      if (ex) aid = ex.id
      else aid = addAlumna({ nombre: val, tel: '', notas: '' })
    }
    addInscripcion(claseId, aid)
    setAddSheet(false)
    setAddInput('')
    setSelAlumna(null)
  }

  const curIns = estadoSheet ? data.inscripciones.find(i => i.id === estadoSheet) : null
  const curAlumna = curIns ? data.alumnas.find(a => a.id === curIns.alumnaId) : null

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr">
          <button className="back-btn" onClick={onBack}>← Volver</button>
          <div style={{ position: 'relative' }}>
            <div className="hdr-lbl">{new Date(clase.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {clase.hora}</div>
            <div className="hdr-title">{clase.nombre}{sala && <small>{sala.nombre} · {sala.direccion}</small>}</div>
            <button className="edit-btn" onClick={() => { setEditForm({ nombre: clase.nombre, fecha: clase.fecha, hora: clase.hora, capacidad: String(clase.capacidad), costeSala: String(clase.costeSala), salaId: clase.salaId }); setEditSheet(true) }}>
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <div className="metrics">
            <div className="metric"><div className="metric-val">{ins.length}</div><div className="metric-lbl">alumnas</div></div>
            <div className="metric"><div className="metric-val green">{formatEur(cobrado)}</div><div className="metric-lbl">cobrado</div></div>
            <div className="metric"><div className="metric-val amber">{formatEur(pendiente)}</div><div className="metric-lbl">pendiente</div></div>
          </div>
        </div>
        <div className="scroll">
          <div className="sala-ic">
            <div><div className="card-row-lbl">Alquiler sala</div><div className="card-row-val">{formatEur(clase.costeSala)}</div></div>
            <button className={`badge ${clase.salaPagada ? 'badge-paid' : 'badge-unpaid'}`} onClick={() => updateClass(claseId, { salaPagada: !clase.salaPagada })}>
              {clase.salaPagada ? 'Pagada' : 'Sin pagar'}
            </button>
          </div>
          <div className="dlbl" style={{ marginBottom: 8 }}>Alumnas</div>
          <div className="card">
            {ins.length === 0 && <div className="card-row"><span style={{ fontSize: 13, color: '#8a7a6a' }}>Sin alumnas apuntadas aún</span></div>}
            {ins.map(i => {
              const a = data.alumnas.find(x => x.id === i.alumnaId)
              if (!a) return null
              return (
                <div key={i.id} className="arow" onClick={() => setEstadoSheet(i.id)}>
                  <div className="avatar">{getInitials(a.nombre)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{a.nombre}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{a.tel || '—'}</div>
                  </div>
                  {estadoBadge(i.estado, i.reserva)}
                </div>
              )
            })}
          </div>
          <button className="btn-primary" onClick={() => setAddSheet(true)}>+ Añadir alumna</button>
        </div>
      </div>

      {/* Sheet: editar clase */}
      <Sheet open={editSheet} onClose={() => setEditSheet(false)} title="Editar clase">
        <label className="field-label">Nombre</label>
        <input className="field-input" value={editForm.nombre} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Fecha</label><input className="field-input" type="date" value={editForm.fecha} onChange={e => setEditForm(f => ({ ...f, fecha: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><label className="field-label">Hora</label><input className="field-input" type="time" value={editForm.hora} onChange={e => setEditForm(f => ({ ...f, hora: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Capacidad</label><input className="field-input" type="number" value={editForm.capacidad} onChange={e => setEditForm(f => ({ ...f, capacidad: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><label className="field-label">Coste sala (€)</label><input className="field-input" type="number" value={editForm.costeSala} onChange={e => setEditForm(f => ({ ...f, costeSala: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <label className="field-label">Sala</label>
        <select className="field-input" value={editForm.salaId} onChange={e => setEditForm(f => ({ ...f, salaId: e.target.value }))}>
          {data.salas.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <button className="btn-primary" onClick={handleSaveEdit}>Guardar</button>
        <button className="btn-secondary" onClick={() => setEditSheet(false)}>Cancelar</button>
      </Sheet>

      {/* Sheet: añadir alumna */}
      <Sheet open={addSheet} onClose={() => { setAddSheet(false); setAddInput(''); setSelAlumna(null) }} title="Añadir alumna">
        <input className="field-input" placeholder="Nombre de la alumna..." value={addInput}
          onChange={e => { setAddInput(e.target.value); setSelAlumna(null) }} />
        {addInput.length > 0 && suggestions.map(a => (
          <div key={a.id} onClick={() => { setSelAlumna(a.id); setAddInput(a.nombre) }}
            style={{ padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#2a2a2a', background: '#faf8f4', marginBottom: 4, border: '.5px solid #e8e0d0' }}>
            {a.nombre}
          </div>
        ))}
        {addInput.length > 2 && suggestions.length === 0 && (
          <div style={{ padding: '9px 12px', fontSize: 13, color: '#8a7a6a' }}>Crear nueva: <strong>{addInput}</strong></div>
        )}
        <div style={{ height: 8 }} />
        <button className="btn-primary" onClick={handleAddAlumna}>Añadir</button>
        <button className="btn-secondary" onClick={() => { setAddSheet(false); setAddInput(''); setSelAlumna(null) }}>Cancelar</button>
      </Sheet>

      {/* Sheet: cambiar estado */}
      {curIns && curAlumna && (
        <Sheet open={!!estadoSheet} onClose={() => setEstadoSheet(null)} title={curAlumna.nombre}>
          {ESTADO_OPTS.map(o => (
            <div key={o.v} className={`state-option ${o.c} ${curIns.estado === o.v ? 'selected' : ''}`}
              onClick={() => { setEstado(curIns.id, o.v); setEstadoSheet(null) }}>
              {o.l}
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setEstadoSheet(null)}>Cancelar</button>
        </Sheet>
      )}
    </>
  )
}
