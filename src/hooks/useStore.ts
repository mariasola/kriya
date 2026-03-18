'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AppData, Student, Class, Room, EnrollmentStatus } from '@/lib/types'
import {
  loadData, createRoom, updateRoom, createStudent, updateStudent,
  createClass, updateClass, createEnrollment, updateEnrollment,
} from '@/lib/data'
import { computeEnrollmentChanges } from '@/lib/calculations'

export function useStore() {
  const [data, setData] = useState<AppData>({ rooms: [], students: [], classes: [], enrollments: [] })
  const [loading, setLoading] = useState(true)
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
    const r = await createRoom(room)
    await reload()
    return r
  }

  const updateRoomItem = async (id: string, changes: Partial<Room>) => {
    await updateRoom(id, changes)
    await reload()
  }

  const addClass = async (cls: Omit<Class, 'id'>) => {
    await createClass(cls)
    await reload()
  }

  const updateClassItem = async (id: string, changes: Partial<Class>) => {
    await updateClass(id, changes)
    await reload()
  }

  const addStudent = async (student: Omit<Student, 'id'>): Promise<string> => {
    const s = await createStudent(student)
    await reload()
    return s.id
  }

  const updateStudentItem = async (id: string, changes: Partial<Student>) => {
    await updateStudent(id, changes)
    await reload()
  }

  const addEnrollment = async (classId: string, studentId: string) => {
    const exists = data.enrollments.find(e => e.classId === classId && e.studentId === studentId)
    if (exists) return
    await createEnrollment(classId, studentId)
    await reload()
  }

  const setEnrollmentStatus = async (enrollmentId: string, status: EnrollmentStatus) => {
    const enrollment = data.enrollments.find(e => e.id === enrollmentId)
    if (!enrollment) return
    const changes = computeEnrollmentChanges(enrollment, status)
    await updateEnrollment(enrollmentId, changes)
    await reload()
  }

  return {
    data, loading,
    addRoom, updateRoom: updateRoomItem,
    addClass, updateClass: updateClassItem,
    addStudent, updateStudent: updateStudentItem,
    addEnrollment, setEnrollmentStatus,
  }
}
