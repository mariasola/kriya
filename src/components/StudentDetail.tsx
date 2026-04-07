'use client'
import { useState } from 'react'
import { StudentDetailStore } from '@/hooks/useStore'
import { getInitials } from '@/lib/calculations'
import Sheet from './Sheet'
import LoadingScreen from './ui/LoadingScreen'
import StatusBadge from './ui/StatusBadge'

interface Props { store: StudentDetailStore; studentId: string; onBack: () => void }

import { isValidSpanishPhone } from '@/lib/utils'

export default function StudentDetail({ store, studentId, onBack }: Props) {
  const { data, loading, updateStudent } = store
  const student = data.students.find(s => s.id === studentId)!
  const ins = data.enrollments.filter(e => e.studentId === studentId)
  const [editSheet, setEditSheet] = useState(false)
  const [form, setForm] = useState({ name: student?.name || '', phone: student?.phone || '', notes: student?.notes || '' })
  const [phoneError, setPhoneError] = useState('')
  const [saving, setSaving] = useState(false)

  if (loading || !student) return <LoadingScreen />

  async function handleSave() {
    if (!form.name.trim()) return
    if (saving) return
    setSaving(true)
    try {
      await updateStudent(studentId, form)
      setEditSheet(false)
      setPhoneError('')
    } finally {
      setSaving(false)
    }
  }

  // Sub-pantalla sin tab propio → header crema. Regla: verde (--olive) = pantalla principal con tab; crema (--cream) = subpantalla sin tab.
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr hdr-sub">
          <button className="back-btn" onClick={onBack}>← Volver</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
            <div className="avatar" style={{ width: 48, height: 48, fontSize: 15, background: '#c8d9a0', color: '#2a3a10', flexShrink: 0 }}>
              {getInitials(student.name)}
            </div>
            <div style={{ flex: 1, paddingRight: 28 }}>
              <div className="hdr-title" style={{ marginBottom: 0 }}>{student.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{student.phone || 'Sin teléfono'}</div>
            </div>
            <button className="edit-btn" style={{ background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={() => { setForm({ name: student.name, phone: student.phone, notes: student.notes }); setEditSheet(true) }}>
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16, stroke: 'var(--olive)', fill: 'none', strokeWidth: 1.8 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
        <div className="scroll">
          {student.notes && (
            <div className="notas-card">
              <div style={{ fontSize: 11, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Notas</div>
              <div style={{ fontSize: 14, color: '#5a4a30', lineHeight: 1.5 }}>{student.notes}</div>
            </div>
          )}
          <div className="dlbl" style={{ marginBottom: 8 }}>Historial de clases</div>
          <div className="card">
            {ins.length === 0 && <div className="card-row"><span style={{ fontSize: 13, color: '#8a7a6a' }}>Sin historial</span></div>}
            {ins.map(e => {
              const cls = data.classes.find(c => c.id === e.classId)
              if (!cls) return null
              return (
                <div key={e.id} className="card-row">
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{cls.name}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a' }}>{new Date(cls.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} · {cls.time}</div>
                  </div>
                  <StatusBadge status={e.status} deposit={e.deposit} />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <Sheet open={editSheet} onClose={() => setEditSheet(false)} title="Editar alumna">
        <label className="field-label">Nombre completo</label>
        <input className="field-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <label className="field-label">Teléfono</label>
        <input className="field-input" value={form.phone}
          onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setPhoneError('') }}
          onBlur={e => { if (!isValidSpanishPhone(e.target.value)) setPhoneError('Teléfono no válido') }} />
        {phoneError && <div style={{ fontSize: 12, color: '#9a3a1e', marginTop: -8, marginBottom: 8 }}>{phoneError}</div>}
        <label className="field-label">Notas (dolencias, nivel, alergias…)</label>
        <textarea className="field-input" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? 'Guardando...' : 'Guardar'}</button>
        <button className="btn-ghost" onClick={() => setEditSheet(false)}>Cancelar</button>
      </Sheet>
    </>
  )
}
