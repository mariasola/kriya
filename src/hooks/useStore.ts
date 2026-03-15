'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppData, Alumna, Clase, Sala, Inscripcion, EstadoInscripcion } from '@/lib/types'
import { loadData, saveData, uid } from '@/lib/data'

export function useStore() {
  const [data, setData] = useState<AppData>({ salas: [], alumnas: [], clases: [], inscripciones: [] })

  useEffect(() => {
    setData(loadData())
  }, [])

  const update = useCallback((next: AppData) => {
    setData(next)
    saveData(next)
  }, [])

  // ── Clases ────────────────────────────────────────────────────────────────
  const addClass = (clase: Omit<Clase, 'id'>) => {
    update({ ...data, clases: [...data.clases, { ...clase, id: uid() }] })
  }

  const updateClass = (id: string, changes: Partial<Clase>) => {
    update({ ...data, clases: data.clases.map(c => c.id === id ? { ...c, ...changes } : c) })
  }

  // ── Alumnas ───────────────────────────────────────────────────────────────
  const addAlumna = (alumna: Omit<Alumna, 'id'>): string => {
    const id = uid()
    update({ ...data, alumnas: [...data.alumnas, { ...alumna, id }] })
    return id
  }

  const updateAlumna = (id: string, changes: Partial<Alumna>) => {
    update({ ...data, alumnas: data.alumnas.map(a => a.id === id ? { ...a, ...changes } : a) })
  }

  // ── Inscripciones ─────────────────────────────────────────────────────────
  const addInscripcion = (claseId: string, alumnaId: string): void => {
    const already = data.inscripciones.find(i => i.claseId === claseId && i.alumnaId === alumnaId)
    if (already) return
    update({
      ...data,
      inscripciones: [...data.inscripciones, { id: uid(), claseId, alumnaId, estado: 'apuntada', reserva: 0, total: 0 }]
    })
  }

  const updateInscripcion = (id: string, changes: Partial<Inscripcion>) => {
    update({ ...data, inscripciones: data.inscripciones.map(i => i.id === id ? { ...i, ...changes } : i) })
  }

  const setEstado = (inscripcionId: string, estado: EstadoInscripcion) => {
    const ins = data.inscripciones.find(i => i.id === inscripcionId)
    if (!ins) return
    const changes: Partial<Inscripcion> = { estado }
    if (estado === 'pagada') changes.total = 20
    if (estado === 'reserva_pagada' && ins.reserva === 0) changes.reserva = 10
    if (estado === 'apuntada' || estado === 'no_vino') { changes.total = 0 }
    updateInscripcion(inscripcionId, changes)
  }

  // ── Salas ─────────────────────────────────────────────────────────────────
  const addSala = (sala: Omit<Sala, 'id'>) => {
    update({ ...data, salas: [...data.salas, { ...sala, id: uid() }] })
  }

  return {
    data,
    addClass, updateClass,
    addAlumna, updateAlumna,
    addInscripcion, updateInscripcion, setEstado,
    addSala,
  }
}
