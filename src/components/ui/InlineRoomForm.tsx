'use client'
import { useState } from 'react'
import { Room } from '@/lib/types'

interface Props {
  hasExistingRooms: boolean
  addRoom: (room: Omit<Room, 'id'>) => Promise<Room>
  onSaved: (room: Room) => void
  onCancel: () => void
}

export default function InlineRoomForm({ hasExistingRooms, addRoom, onSaved, onCancel }: Props) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const room = await addRoom({ name: name.trim(), address: address.trim() })
      onSaved(room)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ background: '#f5f0e8', borderRadius: 10, padding: '12px', border: '.5px solid #d8d0c0', marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: '#8a7a6a', marginBottom: 8 }}>Nueva sala</div>
      <input className="field-input" placeholder="Nombre de la sala" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 8 }} />
      <input className="field-input" placeholder="Dirección (opcional)" value={address} onChange={e => setAddress(e.target.value)} style={{ marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-secondary" style={{ flex: 1, padding: '.65rem', fontSize: 13, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={handleSave}>
          {saving ? 'Guardando...' : 'Guardar sala'}
        </button>
        {hasExistingRooms && (
          <button className="btn-ghost" style={{ flex: 1, padding: '.65rem', fontSize: 13 }} onClick={onCancel}>Cancelar</button>
        )}
      </div>
    </div>
  )
}
