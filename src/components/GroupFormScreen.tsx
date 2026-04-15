'use client'
import { useState } from 'react'
import { ClassSeries } from '@/lib/types'
import Sheet from './Sheet'

interface Props {
  series?: ClassSeries
  onBack: () => void
  onSave: (data: Omit<ClassSeries, 'id' | 'userId' | 'createdAt'>) => Promise<void>
  onDelete?: () => void
}

export default function GroupFormScreen({ series, onBack, onSave, onDelete }: Props) {
  const [form, setForm] = useState({
    name: series?.name || '',
    description: series?.description || '',
    monthlyPrice: series?.monthlyPrice ? String(series.monthlyPrice) : '',
  })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSave() {
    if (!form.name.trim() || !form.monthlyPrice) return
    if (saving) return
    setSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        monthlyPrice: parseInt(form.monthlyPrice) || 0,
      })
      onBack()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div className="hdr hdr-sub">
        <button className="back-btn" onClick={onBack}>← Volver</button>
        <div className="hdr-title">{series ? 'Editar grupo' : 'Nuevo grupo'}</div>
      </div>
      <div className="scroll">
        <label className="field-label">Nombre</label>
        <input className="field-input" placeholder="Ej: Hatha semanal" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <label className="field-label">Descripción (opcional)</label>
        <input className="field-input" placeholder="Ej: Viernes 17:00 · Tada Espacio" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        <label className="field-label">Precio mensual</label>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <input
            className="field-input"
            type="number"
            placeholder="60"
            value={form.monthlyPrice}
            onChange={e => setForm(f => ({ ...f, monthlyPrice: e.target.value }))}
            style={{ paddingRight: 32, marginBottom: 0 }}
          />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>€</span>
        </div>
        <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.6 : 1, marginTop: 8 }}>
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button className="btn-ghost" onClick={onBack}>Cancelar</button>
        {series && onDelete && (
          <div style={{ marginTop: 16, borderTop: '.5px solid #e8e0d0', paddingTop: 16 }}>
            <button className="btn-destructive" onClick={() => setConfirmDelete(true)}>Eliminar grupo</button>
          </div>
        )}
      </div>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar grupo">
        <p style={{ fontSize: 14, color: '#5a4a3a', marginBottom: 16, lineHeight: 1.5 }}>
          ¿Eliminar <strong>{series?.name}</strong>? Se eliminarán las suscripciones asociadas. Esta acción no se puede deshacer.
        </p>
        <button className="btn-destructive" onClick={() => { setConfirmDelete(false); onDelete?.() }}>Sí, eliminar</button>
        <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
      </Sheet>
    </div>
  )
}
