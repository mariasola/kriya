'use client'
import { useState } from 'react'
import { Room } from '@/lib/types'
import Sheet from './Sheet'

interface Props {
  rooms: Room[]
  value: string
  onChange: (roomId: string) => void
  addRoom: (room: Omit<Room, 'id'>) => Promise<Room>
}

export default function RoomSelector({ rooms, value, onChange, addRoom }: Props) {
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', address: '' })

  async function handleSave() {
    if (!form.name.trim()) return
    const r = await addRoom(form)
    onChange(r.id)
    setShowNew(false)
    setForm({ name: '', address: '' })
  }

  return (
    <>
      <label className="field-label">Sala</label>
      <select
        className="field-input"
        value={value || '__new__'}
        onChange={e => {
          if (e.target.value === '__new__') { setShowNew(true); return }
          onChange(e.target.value)
        }}
      >
        <option value="__new__">+ Nueva sala</option>
        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>

      <Sheet open={showNew} onClose={() => { setShowNew(false); setForm({ name: '', address: '' }) }} title="Nueva sala">
        <label className="field-label">Nombre</label>
        <input className="field-input" placeholder="Ej. Espai Cos" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <label className="field-label">Dirección</label>
        <input className="field-input" placeholder="Ej. Carrer Llull 42" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        <button className="btn-primary" onClick={handleSave}>Guardar sala</button>
        <button className="btn-secondary" onClick={() => { setShowNew(false); setForm({ name: '', address: '' }) }}>Cancelar</button>
      </Sheet>
    </>
  )
}
