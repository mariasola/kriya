'use client'
import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import { getCobrado, getPendiente, formatEur, PRECIO_SESION } from '@/lib/data'
import Sheet from './Sheet'

interface Props { store: ReturnType<typeof useStore> }

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export default function FinanzasScreen({ store }: Props) {
  const { data } = store
  const today = new Date()
  const [selMonth, setSelMonth] = useState(today.getMonth())
  const selYear = today.getFullYear()
  const [pendSheet, setPendSheet] = useState(false)

  const monthOrder = Array.from({ length: 12 }, (_, i) => (selMonth + i) % 12)

  const clasesMes = data.clases.filter(c => {
    const f = new Date(c.fecha + 'T12:00:00')
    return f.getMonth() === selMonth && f.getFullYear() === selYear
  })

  const ingresos = clasesMes.reduce((s, c) => s + getCobrado(c.id, data.inscripciones), 0)
  const gastos = clasesMes.reduce((s, c) => s + c.costeSala, 0)
  const balance = ingresos - gastos
  const pendiente = clasesMes.reduce((s, c) => s + getPendiente(c.id, data.inscripciones), 0)

  const pendMap: Record<string, number> = {}
  data.inscripciones
    .filter(i => {
      const c = clasesMes.find(x => x.id === i.claseId)
      return c && (i.estado === 'apuntada' || i.estado === 'reserva_pagada')
    })
    .forEach(i => {
      const imp = i.estado === 'apuntada' ? PRECIO_SESION : PRECIO_SESION - i.reserva
      pendMap[i.alumnaId] = (pendMap[i.alumnaId] || 0) + imp
    })
  const nPend = Object.keys(pendMap).length

  const salasUsadas: Record<string, { total: number; n: number }> = {}
  clasesMes.forEach(c => {
    if (!salasUsadas[c.salaId]) salasUsadas[c.salaId] = { total: 0, n: 0 }
    salasUsadas[c.salaId].total += c.costeSala
    salasUsadas[c.salaId].n++
  })

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
        <div className="hdr">
          <div className="hdr-lbl">Resumen</div>
          <div className="hdr-title">Finanzas</div>
          <div className="month-pills">
            {monthOrder.map(m => {
              const yr = m < selMonth ? selYear + 1 : selYear
              const showYr = yr !== selYear ? ` '${String(yr).slice(2)}` : ''
              return (
                <button key={m} className={`mpill ${m === selMonth ? 'active' : ''}`} onClick={() => setSelMonth(m)}>
                  {MONTHS[m]}{showYr}
                </button>
              )
            })}
          </div>
        </div>

        <div className="scroll">
          <div className="finance-card">
            <div style={{ fontSize: 11, color: '#8a7a6a', textTransform: 'uppercase', letterSpacing: '.06em' }}>Balance neto · {MONTHS[selMonth]}</div>
            <div className="finance-bal">{balance >= 0 ? '+' : ''}{formatEur(balance)}</div>
            <div className="fgrid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><div style={{ fontSize: 11, color: '#8a7a6a', marginBottom: 2 }}>Ingresos cobrados</div><div style={{ fontSize: 18, fontWeight: 500, color: '#2a6640' }}>{formatEur(ingresos)}</div></div>
              <div><div style={{ fontSize: 11, color: '#8a7a6a', marginBottom: 2 }}>Gastos de sala</div><div style={{ fontSize: 18, fontWeight: 500, color: '#9a3a1e' }}>{formatEur(gastos)}</div></div>
            </div>
          </div>

          {pendiente > 0 && (
            <div className="sala-ic" style={{ cursor: 'pointer' }} onClick={() => setPendSheet(true)}>
              <div>
                <div className="card-row-lbl">Pendiente de cobrar</div>
                <div style={{ fontSize: 18, fontWeight: 500, color: '#8a5a10' }}>{formatEur(pendiente)}</div>
              </div>
              <div style={{ fontSize: 12, color: '#8a7a6a' }}>{nPend} alumna{nPend !== 1 ? 's' : ''} →</div>
            </div>
          )}

          {Object.keys(salasUsadas).length > 0 && (
            <>
              <div className="dlbl" style={{ margin: '0 2px 8px' }}>Por sala</div>
              <div className="card">
                {Object.entries(salasUsadas).map(([sid, v]) => {
                  const s = data.salas.find(x => x.id === sid)
                  return (
                    <div key={sid} className="card-row">
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{s?.nombre || 'Sala'}</div>
                        <div style={{ fontSize: 12, color: '#8a7a6a' }}>{v.n} clase{v.n !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 500, color: '#9a3a1e' }}>{formatEur(v.total)}</div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {clasesMes.length > 0 ? (
            <>
              <div className="dlbl" style={{ margin: '0 2px 8px' }}>Clases del mes</div>
              <div className="card">
                {clasesMes.map(c => {
                  const co = getCobrado(c.id, data.inscripciones)
                  const pe = getPendiente(c.id, data.inscripciones)
                  const nIns = data.inscripciones.filter(i => i.claseId === c.id).length
                  return (
                    <div key={c.id} className="card-row">
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{c.nombre}</div>
                        <div style={{ fontSize: 12, color: '#8a7a6a' }}>{new Date(c.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · {nIns} alumnas</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {co > 0 && <div style={{ fontSize: 14, fontWeight: 500, color: '#2a6640' }}>{formatEur(co)} cobrado</div>}
                        {pe > 0 && <div style={{ fontSize: 13, color: '#8a5a10', marginTop: 2 }}>{formatEur(pe)} pendiente</div>}
                        {co === 0 && pe === 0 && <div style={{ fontSize: 13, color: '#aaa' }}>Sin ingresos</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="empty">Sin clases este mes</div>
          )}
        </div>
      </div>

      <Sheet open={pendSheet} onClose={() => setPendSheet(false)} title="Pendiente de cobrar">
        <div className="card">
          {Object.entries(pendMap).map(([aid, imp]) => {
            const a = data.alumnas.find(x => x.id === aid)
            return (
              <div key={aid} className="pend-row">
                <div style={{ fontSize: 14, fontWeight: 500, color: '#2a2a2a' }}>{a?.nombre || '—'}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#8a5a10' }}>{formatEur(imp)}</div>
              </div>
            )
          })}
        </div>
        <button className="btn-secondary" onClick={() => setPendSheet(false)}>Cerrar</button>
      </Sheet>
    </>
  )
}
