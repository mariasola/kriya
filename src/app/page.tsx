'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useStore } from '@/hooks/useStore'
import AuthScreen from '@/components/AuthScreen'
import HomeScreen from '@/components/HomeScreen'
import ClassScreen from '@/components/ClassScreen'
import StudentsScreen from '@/components/StudentsScreen'
import StudentDetail from '@/components/StudentDetail'
import FinanceScreen from '@/components/FinanceScreen'
import BottomNav from '@/components/BottomNav'
import type { Session } from '@supabase/supabase-js'

export type Tab = 'home' | 'students' | 'finance'
export type Screen = Tab | 'class' | 'student-detail'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const store = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [screen, setScreen] = useState<Screen>('home')
  const [screenStack, setScreenStack] = useState<Screen[]>([])
  const [currentClassId, setCurrentClassId] = useState<string | null>(null)
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  function navigate(t: Tab) {
    setTab(t); setScreen(t); setScreenStack([])
  }
  function pushScreen(s: Screen) {
    setScreenStack(prev => [...prev, screen]); setScreen(s)
  }
  function goBack() {
    const prev = screenStack[screenStack.length - 1] || tab
    setScreenStack(s => s.slice(0, -1)); setScreen(prev)
  }
  function openClass(id: string) { setCurrentClassId(id); pushScreen('class') }
  function openStudent(id: string) { setCurrentStudentId(id); pushScreen('student-detail') }

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#f5f0e8' }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: '#3d4a2e' }}>Kriyā</p>
    </div>
  )

  if (!session) return <AuthScreen />

  return (
    <div className="app-shell">
      {screen === 'home' && <HomeScreen store={store} onOpenClass={openClass} />}
      {screen === 'class' && currentClassId && <ClassScreen store={store} classId={currentClassId} onBack={goBack} />}
      {screen === 'students' && <StudentsScreen store={store} onOpenStudent={openStudent} />}
      {screen === 'student-detail' && currentStudentId && <StudentDetail store={store} studentId={currentStudentId} onBack={goBack} />}
      {screen === 'finance' && <FinanceScreen store={store} />}
      <BottomNav activeTab={tab} onNavigate={navigate} onSignOut={() => supabase.auth.signOut()} />
    </div>
  )
}
