'use client'
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { getRevenue, getPending, getInitials, formatEur } from '@/lib/data'
import { EnrollmentStatus } from '@/lib/types'
import Sheet from './Sheet'

interface Props { store: ReturnType<typeof useStore>; classId: string; onBack: () => void }

const STATUS_OPTS: { v: EnrollmentStatus; l: string; c: string }[] = [
  { v: 'registered', l: 'Apuntada', c: 'badge-apuntada' },
  { v: 'deposit_paid', l: 'Reserva pagada', c: 'badge-reserva' },
  { v: 'paid', l: 'Pagada completo', c: 'badge-paid' },
  { v: 'no_show', l: 'No vino', c: 'badge-novino' },
]

function statusBadge(s: EnrollmentStatus, deposit: number) {
  const map = { paid: 'badge-paid', deposit_paid: 'badge-reserva', registered: 'badge-apuntada', no_show: 'badge-novino' }
  const label = s === 'paid' ? 'Pagada' : s === 'deposit_paid' ? `Reserva ${deposit}€` : s === 'registered' ? 'Apuntada' : 'No vino'
  return <span className={`badge ${map[s]}`}>{label}</span>
}

export default function ClassScreen({ store, classId, onBack }: Props) {
  const { data, loading, updateClass, addEnrollment, setEnrollmentStatus, addStudent, addRoom } = store
  const cls = data.classes.find(c => c.id === classId)!
  const room = data.rooms.find(r => r.id === cls?.roomId)
  const ins = data.enrollments.filter(e => e.classId === classId)
  const cobrado = getRevenue(classId, data.enrollments)
  const pendiente = getPending(classId, data.enrollments)

  const [editSheet, setEditSheet] = useState(false)
  const [addSheet, setAddSheet] = useState(false)
  const [statusSheet, setStatusSheet] = useState<string | null>(null)
  const [showNewRoom, setShowNewRoom] = useState(false)
  const [roomForm, setRoomForm] = useState({ name: '', address: '' })
  const [addInput, setAddInput] = useState('')
  const [selStudent, setSelStudent] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: cls?.name || '', date: cls?.date || '', time: cls?.time || '', capacity: String(cls?.capacity || 8), roomCost: String(cls?.roomCost || 0), roomId: cls?.roomId || '' })

  if (loading || !cls) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, background: '#f5f0e8' }}>
      <p style={{ color: '#8a7a6a', fontSize: 14 }}>Cargando...</p>
    </div>
  )

  const existingIds = ins.map(e => e.studentId)
  const suggestions = data.students.filter(s => s.name.toLowerCase().includes(addInput.toLowerCase()) && !existingIds.includes(s.id))

  async function handleSaveEdit() {
    await updateClass(classId, { name: editForm.name, date: editForm.date, time: editForm.time, capacity: parseInt(editForm.capacity) || 8, roomCost: parseInt(editForm.roomCost) || 0, roomId: editForm.roomId })
    setEditSheet(false)
  }

  async function handleAddStudent() {
    const val = addInput.trim()
    if (!val) return
    let sid = selStudent
    if (!sid) {
      const ex = data.students.find(s => s.name.toLowerCase() === val.toLowerCase())
      if (ex) sid = ex.id
      else sid = await addStudent({ name: val, phone: '', notes: '' })
    }
    await addEnrollment(classId, sid)
    setAddSheet(false)
    setAddInput('')
    setSelStudent(null)
  }

  const curEnrollment = statusSheet ? data.enrollments.find(e => e.id === statusSheet) : null
  const curStudent = curEnrollment ? data.students.find(s => s.id === curEnrollment.studentId) : null

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr">
          <button className="back-btn" onClick={onBack}>← Volver</button>
          <div style={{ position: 'relative' }}>
            <div className="hdr-lbl">{new Date(cls.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {cls.time}</div>
            <div className="hdr-title">{cls.name}{room && <small>{room.name} · {room.address}</small>}</div>
            <button className="edit-btn" onClick={() => { setEditForm({ name: cls.name, date: cls.date, time: cls.time, capacity: String(cls.capacity), roomCost: String(cls.roomCost), roomId: cls.roomId }); setEditSheet(true) }}>
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
            <div><div className="card-row-lbl">Alquiler sala</div><div className="card-row-val">{formatEur(cls.roomCost)}</div></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#5a4a3a' }}>Sala pagada</span>
              <button
                onClick={() => updateClass(classId, { roomPaid: !cls.roomPaid })}
                style={{ width: 44, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', background: cls.roomPaid ? '#4a8a5a' : '#d0c8b8', position: 'relative', transition: 'background .2s', flexShrink: 0, padding: 0 }}
              >
                <span style={{ position: 'absolute', top: 3, left: cls.roomPaid ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', display: 'block', boxShadow: '0 1px 3px rgba(0,0,0,.2)' }} />
              </button>
            </div>
          </div>
          <div className="dlbl" style={{ marginBottom: 8 }}>Alumnas</div>
          <div className="card">
            {ins.length === 0 && <div className="card-row"><span style={{ fontSize: 13, color: '#8a7a6a' }}>Sin alumnas apuntadas aún</span></div>}
            {ins.map(e => {
              const s = data.students.find(x => x.id === e.studentId)
              if (!s) return null
              return (
                <div key={e.id} className="arow" onClick={() => setStatusSheet(e.id)}>
                  <div className="avatar">{getInitials(s.name)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{s.phone || '—'}</div>
                  </div>
                  {statusBadge(e.status, e.deposit)}
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
        <input className="field-input" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Fecha</label><input className="field-input" type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><label className="field-label">Hora</label><input className="field-input" type="time" value={editForm.time} onChange={e => setEditForm(f => ({ ...f, time: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div><label className="field-label">Capacidad</label><input className="field-input" type="number" value={editForm.capacity} onChange={e => setEditForm(f => ({ ...f, capacity: e.target.value }))} style={{ marginBottom: 0 }} /></div>
          <div><label className="field-label">Coste sala (€)</label><input className="field-input" type="number" value={editForm.roomCost} onChange={e => setEditForm(f => ({ ...f, roomCost: e.target.value }))} style={{ marginBottom: 0 }} /></div>
        </div>
        <div style={{ height: 12 }} />
        <label className="field-label">Sala</label>
        <select className="field-input" value={editForm.roomId} onChange={e => {
          if (e.target.value === '__new__') { setShowNewRoom(true); return }
          setEditForm(f => ({ ...f, roomId: e.target.value }))
        }}>
          <option value="__new__">+ Nueva sala</option>
          {data.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button className="btn-primary" onClick={handleSaveEdit}>Guardar</button>
        <button className="btn-secondary" onClick={() => setEditSheet(false)}>Cancelar</button>
      </Sheet>

      {/* Sheet: nueva sala */}
      <Sheet open={showNewRoom} onClose={() => { setShowNewRoom(false); setRoomForm({ name: '', address: '' }) }} title="Nueva sala">
        <label className="field-label">Nombre</label>
        <input className="field-input" placeholder="Ej. Espai Cos" value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} />
        <label className="field-label">Dirección</label>
        <input className="field-input" placeholder="Ej. Carrer Llull 42" value={roomForm.address} onChange={e => setRoomForm(f => ({ ...f, address: e.target.value }))} />
        <button className="btn-primary" onClick={async () => {
          if (!roomForm.name.trim()) return
          const r = await addRoom(roomForm)
          setEditForm(f => ({ ...f, roomId: r.id }))
          setShowNewRoom(false)
          setRoomForm({ name: '', address: '' })
        }}>Guardar sala</button>
        <button className="btn-secondary" onClick={() => { setShowNewRoom(false); setRoomForm({ name: '', address: '' }) }}>Cancelar</button>
      </Sheet>

      {/* Sheet: añadir alumna */}
      <Sheet open={addSheet} onClose={() => { setAddSheet(false); setAddInput(''); setSelStudent(null) }} title="Añadir alumna">
        <input className="field-input" placeholder="Nombre de la alumna..." value={addInput}
          onChange={e => { setAddInput(e.target.value); setSelStudent(null) }} />
        {addInput.length > 0 && suggestions.map(s => (
          <div key={s.id} onClick={() => { setSelStudent(s.id); setAddInput(s.name) }}
            style={{ padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 14, color: '#2a2a2a', background: '#faf8f4', marginBottom: 4, border: '.5px solid #e8e0d0' }}>
            {s.name}
          </div>
        ))}
        {addInput.length > 2 && suggestions.length === 0 && (
          <div style={{ padding: '9px 12px', fontSize: 13, color: '#8a7a6a' }}>Crear nueva: <strong>{addInput}</strong></div>
        )}
        <div style={{ height: 8 }} />
        <button className="btn-primary" onClick={handleAddStudent}>Añadir</button>
        <button className="btn-secondary" onClick={() => { setAddSheet(false); setAddInput(''); setSelStudent(null) }}>Cancelar</button>
      </Sheet>

      {/* Sheet: cambiar estado */}
      {curEnrollment && curStudent && (
        <Sheet open={!!statusSheet} onClose={() => setStatusSheet(null)} title={curStudent.name}>
          {STATUS_OPTS.map(o => (
            <div key={o.v} className={`state-option ${o.c} ${curEnrollment.status === o.v ? 'selected' : ''}`}
              onClick={() => { setEnrollmentStatus(curEnrollment.id, o.v); setStatusSheet(null) }}>
              {o.l}
            </div>
          ))}
          <button className="btn-secondary" onClick={() => setStatusSheet(null)}>Cancelar</button>
        </Sheet>
      )}
    </>
  )
}
