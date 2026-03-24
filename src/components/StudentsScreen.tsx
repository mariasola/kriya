'use client'
import { useState } from 'react'
import { StudentsScreenStore } from '@/hooks/useStore'
import { getInitials } from '@/lib/data'
import Sheet from './Sheet'

interface Props { store: StudentsScreenStore; onOpenStudent: (id: string) => void }

function isValidSpanishPhone(phone: string): boolean {
  if (!phone) return true
  const stripped = phone.replace(/[\s\-().]/g, '')
  return /^(\+34|0034|34)?[6-9]\d{8}$/.test(stripped)
}

export default function StudentsScreen({ store, onOpenStudent }: Props) {
  const { data, loading, addStudent } = store
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', notes: '' })
  const [phoneError, setPhoneError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: '#f5f0e8' }}>
      <p style={{ color: '#8a7a6a', fontSize: 14 }}>Cargando...</p>
    </div>
  )

  async function handleSave() {
    if (!form.name.trim()) return
    if (saving) return
    setSaving(true)
    try {
      await addStudent(form)
      setShowNew(false)
      setForm({ name: '', phone: '', notes: '' })
      setPhoneError('')
    } finally {
      setSaving(false)
    }
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
            {data.students.length === 0 && <div className="card-row"><span style={{ fontSize: 13, color: '#8a7a6a' }}>Sin alumnas aún</span></div>}
            {data.students.map(s => {
              const nClases = data.enrollments.filter(e => e.studentId === s.id && e.status !== 'no_show').length
              return (
                <div key={s.id} className="arow" onClick={() => onOpenStudent(s.id)}>
                  <div className="avatar">{getInitials(s.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{s.phone || 'Sin teléfono'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{nClases}</div>
                    <div style={{ fontSize: 10, color: '#8a7a6a' }}>clases</div>
                  </div>
                </div>
              )
            })}
          </div>
          <button className="btn-secondary" onClick={() => setShowNew(true)}>+ Nueva alumna</button>
        </div>
      </div>

      <Sheet open={showNew} onClose={() => setShowNew(false)} title="Nueva alumna">
        <label className="field-label">Nombre completo</label>
        <input className="field-input" placeholder="Nombre completo" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <label className="field-label">Teléfono</label>
        <input className="field-input" placeholder="+34 600 000 000" value={form.phone}
          onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setPhoneError('') }}
          onBlur={e => { if (!isValidSpanishPhone(e.target.value)) setPhoneError('Teléfono no válido') }} />
        {phoneError && <div style={{ fontSize: 12, color: '#9a3a1e', marginTop: -8, marginBottom: 8 }}>{phoneError}</div>}
        <label className="field-label">Notas (dolencias, nivel, alergias…)</label>
        <textarea className="field-input" rows={3} placeholder="Ej. Lesión en rodilla, principiante..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
        <button className="btn-ghost" onClick={() => setShowNew(false)}>Cancelar</button>
      </Sheet>
    </>
  )
}
