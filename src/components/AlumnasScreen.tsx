'use client'
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { getInitials } from '@/lib/data'
import Sheet from './Sheet'

interface Props { store: ReturnType<typeof useStore>; onOpenAlumna: (id: string) => void }

export default function AlumnasScreen({ store, onOpenAlumna }: Props) {
  const { data, addAlumna } = store
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ nombre: '', tel: '', notas: '' })

  function handleSave() {
    if (!form.nombre.trim()) return
    addAlumna(form)
    setShowNew(false)
    setForm({ nombre: '', tel: '', notas: '' })
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr">
          <div className="hdr-lbl">Directorio</div>
          <div className="hdr-title">Alumnas</div>
        </div>
        <div className="scroll">
          <div className="card">
            {data.alumnas.length === 0 && <div className="card-row"><span style={{ fontSize: 13, color: '#8a7a6a' }}>Sin alumnas aún</span></div>}
            {data.alumnas.map(a => {
              const nClases = data.inscripciones.filter(i => i.alumnaId === a.id && i.estado !== 'no_vino').length
              return (
                <div key={a.id} className="arow" onClick={() => onOpenAlumna(a.id)}>
                  <div className="avatar">{getInitials(a.nombre)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{a.nombre}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{a.tel || 'Sin teléfono'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{nClases}</div>
                    <div style={{ fontSize: 10, color: '#8a7a6a' }}>clases</div>
                  </div>
                </div>
              )
            })}
          </div>
          <button className="btn-primary" onClick={() => setShowNew(true)}>+ Nueva alumna</button>
        </div>
      </div>

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="Nueva alumna">
        <label className="field-label">Nombre completo</label>
        <input className="field-input" placeholder="Nombre completo" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
        <label className="field-label">Teléfono</label>
        <input className="field-input" placeholder="+34 600 000 000" value={form.tel} onChange={e => setForm(f => ({ ...f, tel: e.target.value }))} />
        <label className="field-label">Notas (dolencias, nivel, alergias…)</label>
        <textarea className="field-input" rows={3} placeholder="Ej. Lesión en rodilla, principiante..." value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
        <button className="btn-primary" onClick={handleSave}>Guardar</button>
        <button className="btn-secondary" onClick={() => setShowNew(false)}>Cancelar</button>
      </Sheet>
    </>
  )
}
