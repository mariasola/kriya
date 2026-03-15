'use client'
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { getInitials } from '@/lib/data'
import { EstadoInscripcion } from '@/lib/types'
import Sheet from './Sheet'

interface Props { store: ReturnType<typeof useStore>; alumnaId: string; onBack: () => void }

function estadoBadge(e: EstadoInscripcion, r: number) {
  const map = { pagada: 'badge-paid', reserva_pagada: 'badge-reserva', apuntada: 'badge-apuntada', no_vino: 'badge-novino' }
  const label = e === 'pagada' ? 'Pagada' : e === 'reserva_pagada' ? `Reserva ${r}€` : e === 'apuntada' ? 'Apuntada' : 'No vino'
  return <span className={`badge ${map[e]}`}>{label}</span>
}

export default function AlumnaDetalle({ store, alumnaId, onBack }: Props) {
  const { data, updateAlumna } = store
  const alumna = data.alumnas.find(a => a.id === alumnaId)!
  const ins = data.inscripciones.filter(i => i.alumnaId === alumnaId)
  const [editSheet, setEditSheet] = useState(false)
  const [form, setForm] = useState({ nombre: alumna.nombre, tel: alumna.tel, notas: alumna.notas })

  function handleSave() {
    if (!form.nombre.trim()) return
    updateAlumna(alumnaId, form)
    setEditSheet(false)
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr">
          <button className="back-btn" onClick={onBack}>← Volver</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: 15, background: '#c8d9a0', color: '#2a3a10', flexShrink: 0 }}>
              {getInitials(alumna.nombre)}
            </div>
            <div style={{ flex: 1, paddingRight: 28 }}>
              <div className="hdr-title" style={{ marginBottom: 0 }}>{alumna.nombre}</div>
              <div style={{ fontSize: 13, color: '#a8b89a' }}>{alumna.tel || 'Sin teléfono'}</div>
            </div>
            <button className="edit-btn" onClick={() => { setForm({ nombre: alumna.nombre, tel: alumna.tel, notas: alumna.notas }); setEditSheet(true) }}>
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
        <div className="scroll">
          {alumna.notas && (
            <div className="notas-card">
              <div style={{ fontSize: 11, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Notas</div>
              <div style={{ fontSize: 14, color: '#5a4a30', lineHeight: 1.5 }}>{alumna.notas}</div>
            </div>
          )}
          <div className="dlbl" style={{ marginBottom: 8 }}>Historial de clases</div>
          <div className="card">
            {ins.length === 0 && <div className="card-row"><span style={{ fontSize: 13, color: '#8a7a6a' }}>Sin historial</span></div>}
            {ins.map(i => {
              const clase = data.clases.find(c => c.id === i.claseId)
              if (!clase) return null
              return (
                <div key={i.id} className="card-row">
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{clase.nombre}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a' }}>{new Date(clase.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} · {clase.hora}</div>
                  </div>
                  {estadoBadge(i.estado, i.reserva)}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Sheet open={editSheet} onClose={() => setEditSheet(false)} title="Editar alumna">
        <label className="field-label">Nombre completo</label>
        <input className="field-input" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
        <label className="field-label">Teléfono</label>
        <input className="field-input" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} />
        <label className="field-label">Notas (dolencias, nivel, alergias…)</label>
        <textarea className="field-input" rows={3} value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
        <button className="btn-primary" onClick={handleSave}>Guardar</button>
        <button className="btn-secondary" onClick={() => setEditSheet(false)}>Cancelar</button>
      </Sheet>
    </>
  )
}
