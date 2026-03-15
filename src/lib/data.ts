import { AppData, Alumna, Clase, Sala, Inscripcion } from './types'

const STORAGE_KEY = 'kriya_data'
const PRECIO_CLASE = 20

function today() { return new Date() }
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r
}
function toISO(d: Date): string { return d.toISOString().split('T')[0] }

const SEED_DATA: AppData = {
  salas: [
    { id: 's1', nombre: 'Espai Cos', direccion: 'Carrer Llull 42' },
    { id: 's2', nombre: 'Sala Mandala', direccion: 'Av. Meridiana 8' },
  ],
  alumnas: [
    { id: 'a1', nombre: 'María García', tel: '+34 612 345 678', notas: 'Lesión en rodilla derecha. Nivel medio.' },
    { id: 'a2', nombre: 'Laura Puig', tel: '+34 698 012 345', notas: '' },
    { id: 'a3', nombre: 'Sílvia Roca', tel: '+34 634 567 890', notas: 'Alergia al látex. Principiante.' },
    { id: 'a4', nombre: 'Anna Mas', tel: '+34 677 890 123', notas: '' },
    { id: 'a5', nombre: 'Marta Vidal', tel: '+34 655 432 109', notas: 'Embarazada 4 meses.' },
  ],
  clases: [
    { id: 'c1', nombre: 'Hatha mañana', fecha: toISO(today()), hora: '18:00', salaId: 's1', capacidad: 8, costeSala: 35, salaPagada: false },
    { id: 'c2', nombre: 'Yin yoga', fecha: toISO(addDays(today(), 1)), hora: '10:30', salaId: 's2', capacidad: 6, costeSala: 30, salaPagada: false },
    { id: 'c3', nombre: 'Vinyasa flow', fecha: toISO(addDays(today(), 3)), hora: '11:00', salaId: 's1', capacidad: 8, costeSala: 35, salaPagada: true },
    { id: 'c4', nombre: 'Hatha tarde', fecha: toISO(addDays(today(), -7)), hora: '19:00', salaId: 's2', capacidad: 8, costeSala: 30, salaPagada: true },
    { id: 'c5', nombre: 'Yin restaurativo', fecha: toISO(addDays(today(), -14)), hora: '10:00', salaId: 's1', capacidad: 6, costeSala: 35, salaPagada: true },
  ],
  inscripciones: [
    { id: 'i1', claseId: 'c1', alumnaId: 'a1', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i2', claseId: 'c1', alumnaId: 'a2', estado: 'reserva_pagada', reserva: 10, total: 0 },
    { id: 'i3', claseId: 'c1', alumnaId: 'a3', estado: 'apuntada', reserva: 0, total: 0 },
    { id: 'i4', claseId: 'c1', alumnaId: 'a4', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i5', claseId: 'c1', alumnaId: 'a5', estado: 'apuntada', reserva: 0, total: 0 },
    { id: 'i6', claseId: 'c2', alumnaId: 'a1', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i7', claseId: 'c2', alumnaId: 'a3', estado: 'reserva_pagada', reserva: 5, total: 0 },
    { id: 'i8', claseId: 'c2', alumnaId: 'a5', estado: 'apuntada', reserva: 0, total: 0 },
    { id: 'i9', claseId: 'c3', alumnaId: 'a2', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i10', claseId: 'c3', alumnaId: 'a4', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i11', claseId: 'c4', alumnaId: 'a1', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i12', claseId: 'c4', alumnaId: 'a2', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i13', claseId: 'c4', alumnaId: 'a3', estado: 'no_vino', reserva: 0, total: 0 },
    { id: 'i14', claseId: 'c5', alumnaId: 'a4', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i15', claseId: 'c5', alumnaId: 'a5', estado: 'pagada', reserva: 0, total: 20 },
    { id: 'i16', claseId: 'c5', alumnaId: 'a1', estado: 'pagada', reserva: 0, total: 20 },
  ]
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return SEED_DATA
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      saveData(SEED_DATA)
      return SEED_DATA
    }
    return JSON.parse(raw) as AppData
  } catch {
    return SEED_DATA
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// ── Helpers de cálculo ──────────────────────────────────────────────────────

export const PRECIO_SESION = PRECIO_CLASE

export function getCobrado(claseId: string, inscripciones: Inscripcion[]): number {
  return inscripciones
    .filter(i => i.claseId === claseId)
    .reduce((s, i) => s + (i.estado === 'pagada' ? i.total : i.estado === 'reserva_pagada' ? i.reserva : 0), 0)
}

export function getPendiente(claseId: string, inscripciones: Inscripcion[]): number {
  return inscripciones
    .filter(i => i.claseId === claseId)
    .reduce((s, i) => {
      if (i.estado === 'apuntada') return s + PRECIO_CLASE
      if (i.estado === 'reserva_pagada') return s + (PRECIO_CLASE - i.reserva)
      return s
    }, 0)
}

export function getInitials(nombre: string): string {
  return nombre.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase()
}

export function formatEur(n: number): string { return `${n}€` }

export function uid(): string { return Date.now().toString(36) + Math.random().toString(36).slice(2) }
