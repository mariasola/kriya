'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppData, Student, Class, Room, EnrollmentStatus, ClassSeries, Subscription, SubscriptionStatus } from '@/lib/types'
import {
  loadData, createRoom, updateRoom, createStudent, updateStudent,
  createClass, updateClass, deleteClass, createEnrollment, updateEnrollment,
  createClassSeries, updateClassSeries, createSubscription, updateSubscriptionStatus,
} from '@/lib/data'
import { computeEnrollmentChanges } from '@/lib/calculations'

// ── Per-screen store interfaces ─────────────────────────────────────────────

export interface HomeScreenStore {
  data: AppData
  loading: boolean
  addClass: (cls: Omit<Class, 'id'>) => Promise<void>
  addRoom: (room: Omit<Room, 'id'>) => Promise<Room>
}

export interface ClassScreenStore {
  data: AppData
  loading: boolean
  updateClass: (id: string, changes: Partial<Class>) => Promise<void>
  deleteClass: (id: string) => Promise<void>
  addEnrollment: (classId: string, studentId: string) => Promise<void>
  setEnrollmentStatus: (enrollmentId: string, status: EnrollmentStatus) => Promise<void>
  addStudent: (student: Omit<Student, 'id'>) => Promise<string>
  addRoom: (room: Omit<Room, 'id'>) => Promise<Room>
}

export interface StudentsScreenStore {
  data: AppData
  loading: boolean
  addStudent: (student: Omit<Student, 'id'>) => Promise<string>
}

export interface StudentDetailStore {
  data: AppData
  loading: boolean
  updateStudent: (id: string, changes: Partial<Student>) => Promise<void>
}

export interface FinanceScreenStore {
  data: AppData
  loading: boolean
  updateRoom: (id: string, changes: Partial<Room>) => Promise<void>
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useStore() {
  const [data, setData] = useState<AppData>({ rooms: [], students: [], classes: [], enrollments: [], classSeries: [], subscriptions: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoaded = useRef(false)

  const reload = useCallback(async () => {
    if (!hasLoaded.current) setLoading(true)
    const d = await loadData()
    setData(d)
    setLoading(false)
    hasLoaded.current = true
  }, [])

  useEffect(() => { reload() }, [reload])

  const addRoom = async (room: Omit<Room, 'id'>) => {
    try {
      const r = await createRoom(room)
      await reload()
      return r
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar sala')
      throw e
    }
  }

  const updateRoomItem = async (id: string, changes: Partial<Room>) => {
    try {
      await updateRoom(id, changes)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar sala')
      throw e
    }
  }

  const addClass = async (cls: Omit<Class, 'id'>) => {
    try {
      await createClass(cls)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar clase')
      throw e
    }
  }

  const updateClassItem = async (id: string, changes: Partial<Class>) => {
    try {
      await updateClass(id, changes)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar clase')
      throw e
    }
  }

  const deleteClassItem = async (id: string) => {
    try {
      await deleteClass(id)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar clase')
      throw e
    }
  }

  const addStudent = async (student: Omit<Student, 'id'>): Promise<string> => {
    try {
      const s = await createStudent(student)
      await reload()
      return s.id
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar alumna')
      throw e
    }
  }

  const updateStudentItem = async (id: string, changes: Partial<Student>) => {
    try {
      await updateStudent(id, changes)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar alumna')
      throw e
    }
  }

  const addEnrollment = async (classId: string, studentId: string) => {
    const exists = data.enrollments.find(e => e.classId === classId && e.studentId === studentId)
    if (exists) return
    try {
      await createEnrollment(classId, studentId)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al apuntar alumna')
      throw e
    }
  }

  const setEnrollmentStatus = async (enrollmentId: string, status: EnrollmentStatus) => {
    const enrollment = data.enrollments.find(e => e.id === enrollmentId)
    if (!enrollment) return
    const cls = data.classes.find(c => c.id === enrollment.classId)
    try {
      const changes = computeEnrollmentChanges(enrollment, status, cls?.price ?? 20)
      await updateEnrollment(enrollmentId, changes)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar estado')
      throw e
    }
  }

  const addClassSeries = async (series: Omit<ClassSeries, 'id' | 'userId' | 'createdAt'>) => {
    try {
      const s = await createClassSeries(series)
      await reload()
      return s
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar serie')
      throw e
    }
  }

  const updateClassSeriesItem = async (id: string, changes: Partial<Pick<ClassSeries, 'name' | 'description' | 'monthlyPrice'>>) => {
    try {
      await updateClassSeries(id, changes)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar serie')
      throw e
    }
  }

  const addSubscription = async (sub: Omit<Subscription, 'id' | 'userId' | 'createdAt'>) => {
    try {
      const s = await createSubscription(sub)
      await reload()
      return s
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar suscripción')
      throw e
    }
  }

  const setSubscriptionStatus = async (id: string, status: SubscriptionStatus) => {
    try {
      await updateSubscriptionStatus(id, status)
      await reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar suscripción')
      throw e
    }
  }

  const dismissError = () => setError(null)

  return {
    data, loading, error, dismissError,
    addRoom, updateRoom: updateRoomItem,
    addClass, updateClass: updateClassItem, deleteClass: deleteClassItem,
    addStudent, updateStudent: updateStudentItem,
    addEnrollment, setEnrollmentStatus,
    addClassSeries, updateClassSeries: updateClassSeriesItem,
    addSubscription, setSubscriptionStatus,
  }
}
