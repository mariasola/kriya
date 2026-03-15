export type EstadoInscripcion = 'apuntada' | 'reserva_pagada' | 'pagada' | 'no_vino'

export interface Sala {
  id: string
  nombre: string
  direccion: string
}

export interface Clase {
  id: string
  nombre: string
  fecha: string // ISO date string YYYY-MM-DD
  hora: string  // HH:MM
  salaId: string
  capacidad: number
  costeSala: number
  salaPagada: boolean
}

export interface Alumna {
  id: string
  nombre: string
  tel: string
  notas: string
}

export interface Inscripcion {
  id: string
  claseId: string
  alumnaId: string
  estado: EstadoInscripcion
  reserva: number
  total: number
}

export interface AppData {
  salas: Sala[]
  alumnas: Alumna[]
  clases: Clase[]
  inscripciones: Inscripcion[]
}
