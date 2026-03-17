'use client'

import { useState, useEffect, useCallback } from 'react'
import { AppData, Student, Class, Room, Enrollment, EnrollmentStatus } from '@/lib/types'
import {
  loadData, createRoom, createStudent, updateStudent,
  createClass, updateClass, createEnrollment, updateEnrollment,
  SESSION_PRICE
} from '@/lib/data'

export function useStore() {
  const [data, setData] = useState<AppData>({ rooms: [], students: [], classes: [], enrollments: [] })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    const d = await loadData()
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

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
    const changes: Partial<Enrollment> = { status }
    if (status === 'paid') changes.total = SESSION_PRICE
    if (status === 'deposit_paid' && enrollment.deposit === 0) changes.deposit = 10
    if (status === 'registered' || status === 'no_show') changes.total = 0
    await updateEnrollment(enrollmentId, changes)
    await reload()
  }

  return {
    data, loading,
    addClass, updateClass: updateClassItem,
    addStudent, updateStudent: updateStudentItem,
    addEnrollment, setEnrollmentStatus,
  }
}
