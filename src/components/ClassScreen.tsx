'use client'
import { useState } from 'react'
import { ClassScreenStore } from '@/hooks/useStore'
import { getRevenue, getPending, getInitials, formatEur } from '@/lib/calculations'
import { EnrollmentStatus, Enrollment, Subscription, Class } from '@/lib/types'
import Sheet from './Sheet'
import LoadingScreen from './ui/LoadingScreen'
import StatusBadge from './ui/StatusBadge'
import InlineRoomForm from './ui/InlineRoomForm'

function classifyEnrollments(
  enrollments: Enrollment[],
  subscriptions: Subscription[],
  allEnrollments: Enrollment[],
  allClasses: Class[],
  classSeriesId: string,
  classDate: string,
  classMonth: string
): { subscribed: Enrollment[]; occasional: Enrollment[]; newStudents: Enrollment[] } {
  const priorSeriesClassIds = new Set(
    allClasses.filter(c => c.seriesId === classSeriesId && c.date < classDate).map(c => c.id)
  )
  const subscribed: Enrollment[] = []
  const occasional: Enrollment[] = []
  const newStudents: Enrollment[] = []
  for (const e of enrollments) {
    const hasSub = subscriptions.some(s => s.studentId === e.studentId && s.seriesId === classSeriesId && s.month === classMonth)
    if (hasSub) {
      subscribed.push(e)
    } else {
      const hasPrior = allEnrollments.some(ae => ae.studentId === e.studentId && priorSeriesClassIds.has(ae.classId))
      if (hasPrior) occasional.push(e)
      else newStudents.push(e)
    }
  }
  return { subscribed, occasional, newStudents }
}

interface Props { store: ClassScreenStore; classId: string; onBack: () => void }

const STATUS_OPTS: { v: EnrollmentStatus; l: string; c: string }[] = [
  { v: 'registered', l: 'Apuntada', c: 'badge-apuntada' },
  { v: 'deposit_paid', l: 'Reserva pagada', c: 'badge-reserva' },
  { v: 'paid', l: 'Pagada completo', c: 'badge-paid' },
  { v: 'no_show', l: 'No vino', c: 'badge-novino' },
]

export default function ClassScreen({ store, classId, onBack }: Props) {
  const { data, loading, updateClass, deleteClass, addEnrollment, setEnrollmentStatus, addStudent, addRoom } = store
  const cls = data.classes.find(c => c.id === classId)!
  const room = data.rooms.find(r => r.id === cls?.roomId)
  const ins = data.enrollments.filter(e => e.classId === classId)
  const cobrado = getRevenue(cls?.price ?? 20, ins)
  const pendiente = getPending(cls?.price ?? 20, ins)

  const [editSheet, setEditSheet] = useState(false)
  const [addSheet, setAddSheet] = useState(false)
  const [statusSheet, setStatusSheet] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addInput, setAddInput] = useState('')
  const [selStudent, setSelStudent] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: cls?.name || '', date: cls?.date || '', time: cls?.time || '', capacity: String(cls?.capacity || 8), price: String(cls?.price || 20), roomCost: String(cls?.roomCost || 0), roomId: cls?.roomId || '', seriesId: cls?.seriesId || '' })
  const [showInlineRoom, setShowInlineRoom] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [savingAdd, setSavingAdd] = useState(false)

  if (loading || !cls) return <LoadingScreen />

  const existingIds = ins.map(e => e.studentId)
  const suggestions = data.students.filter(s => s.name.toLowerCase().includes(addInput.toLowerCase()) && !existingIds.includes(s.id))

  async function handleSaveEdit() {
    if (savingEdit) return
    setSavingEdit(true)
    try {
      const hasGroup = !!editForm.seriesId
      await updateClass(classId, {
        name: editForm.name,
        date: editForm.date,
        time: editForm.time,
        capacity: parseInt(editForm.capacity) || 8,
        price: hasGroup ? 0 : (parseInt(editForm.price) || 20),
        roomCost: parseInt(editForm.roomCost) || 0,
        roomId: editForm.roomId || null,
        seriesId: hasGroup ? editForm.seriesId : null
      })
      setEditSheet(false)
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleAddStudent() {
    const val = addInput.trim()
    if (!val) return
    if (savingAdd) return
    setSavingAdd(true)
    try {
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
    } finally {
      setSavingAdd(false)
    }
  }

  const curEnrollment = statusSheet ? data.enrollments.find(e => e.id === statusSheet) : null
  const curStudent = curEnrollment ? data.students.find(s => s.id === curEnrollment.studentId) : null

  const classMonth = cls.date.slice(0, 7) + '-01'
  const hasSeries = !!cls.seriesId
  const { subscribed, occasional, newStudents } = hasSeries
    ? classifyEnrollments(ins, data.subscriptions, data.enrollments, data.classes, cls.seriesId!, cls.date, classMonth)
    : { subscribed: [], occasional: [], newStudents: [] }

  // Sub-pantalla sin tab propio → header crema. Regla: verde (--olive) = pantalla principal con tab; crema (--cream) = subpantalla sin tab.
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr hdr-sub">
          <button className="back-btn" onClick={onBack}>← Volver</button>
          <div style={{ position: 'relative' }}>
            <div className="hdr-lbl">{new Date(cls.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} · {cls.time}</div>
            <div className="hdr-title">{cls.name}{room && <small>{room.name} · {room.address}</small>}</div>
            <button className="edit-btn" onClick={() => { setEditForm({ name: cls.name, date: cls.date, time: cls.time, capacity: String(cls.capacity), price: String(cls.price), roomCost: String(cls.roomCost), roomId: cls.roomId || '', seriesId: cls.seriesId || '' }); setShowInlineRoom(false); setEditSheet(true) }}>
              <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        </div>
        <div className="scroll">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 500, color: 'var(--text)' }}>{ins.length}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>alumnas</div>
            </div>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 500, color: 'var(--green-text)' }}>{formatEur(cobrado)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>cobrado</div>
            </div>
            <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 10, padding: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 19, fontWeight: 500, color: 'var(--amber-text)' }}>{formatEur(pendiente)}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>pendiente</div>
            </div>
          </div>
          <div className="sala-ic">
            <div><div className="card-row-lbl">Alquiler sala</div><div className="card-row-val">{formatEur(cls.roomCost)}</div></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={cls.roomPaid}
                onChange={() => updateClass(classId, { roomPaid: !cls.roomPaid })}
                style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
              />
              <span className={`cb-label${cls.roomPaid ? ' checked' : ''}`}>Sala pagada</span>
              <span className={`cb-box${cls.roomPaid ? ' checked' : ''}`} aria-hidden="true" />
            </label>
          </div>
          <div className="dlbl" style={{ marginBottom: 8 }}>Alumnas</div>
          {ins.length === 0 && (
            <div className="card">
              <div className="card-row"><span style={{ fontSize: 13, color: '#8a7a6a' }}>Sin alumnas apuntadas aún</span></div>
            </div>
          )}
          {ins.length > 0 && !hasSeries && (
            <div className="card">
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
                    <StatusBadge status={e.status} deposit={e.deposit} />
                  </div>
                )
              })}
            </div>
          )}
          {ins.length > 0 && hasSeries && (
            <>
              {subscribed.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, marginLeft: 2 }}>Suscritas</div>
                  <div className="card">
                    {subscribed.map(e => {
                      const s = data.students.find(x => x.id === e.studentId)
                      if (!s) return null
                      const sub = data.subscriptions.find(sb => sb.studentId === e.studentId && sb.seriesId === cls.seriesId! && sb.month === classMonth)
                      const isPaid = sub?.status === 'paid'
                      return (
                        <div key={e.id} className="arow" onClick={() => setStatusSheet(e.id)}>
                          <div className="avatar" style={{ background: '#c8d9a0', color: '#3d4a2e' }}>{getInitials(s.name)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{s.phone || '—'}</div>
                          </div>
                          {isPaid
                            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#52582e" strokeWidth="1.2"/><path d="M4.5 7l1.8 1.8 3-3.6" stroke="#52582e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#b85c38" strokeWidth="1.2"/></svg>
                          }
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {occasional.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, marginLeft: 2 }}>Puntuales</div>
                  <div className="card">
                    {occasional.map(e => {
                      const s = data.students.find(x => x.id === e.studentId)
                      if (!s) return null
                      const isPaid = e.status === 'paid'
                      return (
                        <div key={e.id} className="arow" onClick={() => setStatusSheet(e.id)}>
                          <div className="avatar" style={{ background: '#e8e4f0', color: '#57467b' }}>{getInitials(s.name)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{s.phone || '—'}</div>
                          </div>
                          {isPaid
                            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#52582e" strokeWidth="1.2"/><path d="M4.5 7l1.8 1.8 3-3.6" stroke="#52582e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#b85c38" strokeWidth="1.2"/></svg>
                          }
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {newStudents.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, marginLeft: 2 }}>Nuevas</div>
                  <div className="card">
                    {newStudents.map(e => {
                      const s = data.students.find(x => x.id === e.studentId)
                      if (!s) return null
                      const isPaid = e.status === 'paid'
                      return (
                        <div key={e.id} className="arow" onClick={() => setStatusSheet(e.id)}>
                          <div className="avatar" style={{ background: '#dde6ee', color: '#355070' }}>{getInitials(s.name)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{s.name}</div>
                            <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 2 }}>{s.phone || '—'}</div>
                          </div>
                          {isPaid
                            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#52582e" strokeWidth="1.2"/><path d="M4.5 7l1.8 1.8 3-3.6" stroke="#52582e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#b85c38" strokeWidth="1.2"/></svg>
                          }
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
          <button className="btn-secondary" onClick={() => setAddSheet(true)}>+ Añadir alumna</button>
        </div>
      </div>

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
        {data.rooms.length > 0 && !showInlineRoom && (
          <>
            <select className="field-input" value={editForm.roomId} onChange={e => setEditForm(f => ({ ...f, roomId: e.target.value }))}>
              <option value="">Sin sala</option>
              {data.rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <span onClick={() => setShowInlineRoom(true)} style={{ display: 'inline-block', marginTop: 6, marginBottom: 4, fontSize: 13, color: '#3d4a2e', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              + Añadir sala
            </span>
          </>
        )}
        {(data.rooms.length === 0 || showInlineRoom) && (
          <InlineRoomForm
            hasExistingRooms={data.rooms.length > 0}
            addRoom={addRoom}
            onSaved={room => { setEditForm(f => ({ ...f, roomId: room.id })); setShowInlineRoom(false) }}
            onCancel={() => setShowInlineRoom(false)}
          />
        )}
        {data.classSeries.length > 0 && (
          <>
            <div style={{ height: 12 }} />
            <label className="field-label">Grupo (opcional)</label>
            <select className="field-input" value={editForm.seriesId} onChange={e => setEditForm(f => ({ ...f, seriesId: e.target.value }))}>
              <option value="">Sin grupo</option>
              {data.classSeries.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </>
        )}
        <div style={{ height: 12 }} />
        {editForm.seriesId ? (
          <>
            <label className="field-label">Precio clase</label>
            <div style={{ padding: '11px 14px', background: '#f5f0e8', borderRadius: 10, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 12 }}>
              El precio se calcula automáticamente desde el grupo
            </div>
          </>
        ) : (
          <>
            <label className="field-label">Precio clase (€)</label>
            <input className="field-input" type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} />
          </>
        )}
        <button className="btn-primary" onClick={handleSaveEdit} disabled={savingEdit} style={{ opacity: savingEdit ? 0.6 : 1 }}>{savingEdit ? 'Guardando...' : 'Guardar'}</button>
        <button className="btn-ghost" onClick={() => setEditSheet(false)}>Cancelar</button>
        <div style={{ marginTop: 16, borderTop: '.5px solid #e8e0d0', paddingTop: 16 }}>
          <button className="btn-destructive" onClick={() => { setEditSheet(false); setConfirmDelete(true) }}>Eliminar clase</button>
        </div>
      </Sheet>

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar clase">
        <p style={{ fontSize: 14, color: '#5a4a3a', marginBottom: 16, lineHeight: 1.5 }}>¿Eliminar <strong>{cls.name}</strong>? Esta acción no se puede deshacer.</p>
        <button className="btn-destructive" onClick={async () => {
          await deleteClass(classId)
          setConfirmDelete(false)
          onBack()
        }}>Sí, eliminar</button>
        <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
      </Sheet>

      <Sheet open={addSheet} onClose={() => { setAddSheet(false); setAddInput(''); setSelStudent(null) }} title="Añadir alumna">
        <input className="field-input" placeholder="Nombre de la alumna..." value={addInput}
          onChange={e => { setAddInput(e.target.value); setSelStudent(null) }} />
        {addInput.length > 0 && suggestions.map(s => (
          <div key={s.id} onClick={() => { setSelStudent(s.id); setAddInput(s.name) }}
            style={{ padding: '9px 12px', borderRadius: 8, cursor: 'pointer', background: '#faf8f4', marginBottom: 4, border: '.5px solid #e8e0d0' }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{s.name}</div>
            {s.phone && <div style={{ fontSize: 12, color: '#8a7a6a', marginTop: 1 }}>{s.phone}</div>}
          </div>
        ))}
        {addInput.length > 2 && suggestions.length === 0 && (
          <div style={{ padding: '9px 12px', borderRadius: 8, background: '#f5f0e8', marginBottom: 4, border: '.5px solid #e8e0d0' }}>
            <div style={{ fontSize: 11, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Crear alumna</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{addInput}</div>
          </div>
        )}
        <div style={{ height: 8 }} />
        <button className="btn-primary" onClick={handleAddStudent} disabled={savingAdd} style={{ opacity: savingAdd ? 0.6 : 1 }}>{savingAdd ? 'Añadiendo...' : 'Añadir'}</button>
        <button className="btn-ghost" onClick={() => { setAddSheet(false); setAddInput(''); setSelStudent(null) }}>Cancelar</button>
      </Sheet>

      {curEnrollment && curStudent && (
        <Sheet open={!!statusSheet} onClose={() => setStatusSheet(null)} title={curStudent.name}>
          {STATUS_OPTS.map(o => (
            <div key={o.v} className={`state-option ${o.c} ${curEnrollment.status === o.v ? 'selected' : ''}`}
              onClick={() => { setEnrollmentStatus(curEnrollment.id, o.v); setStatusSheet(null) }}>
              {o.l}
            </div>
          ))}
          <button className="btn-ghost" onClick={() => setStatusSheet(null)}>Cancelar</button>
        </Sheet>
      )}
    </>
  )
}
