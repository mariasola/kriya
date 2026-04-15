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
import GroupsScreen from '@/components/GroupsScreen'
import GroupDetailScreen from '@/components/GroupDetailScreen'
import GroupFormScreen from '@/components/GroupFormScreen'
import BottomNav from '@/components/BottomNav'
import type { Session } from '@supabase/supabase-js'
import type { ClassSeries } from '@/lib/types'

export type Tab = 'home' | 'students' | 'finance'
export type Screen = Tab | 'class' | 'student-detail' | 'groups' | 'groupDetail' | 'groupForm'

function AuthenticatedApp() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [screen, setScreen] = useState<Screen>('home')
  const [screenStack, setScreenStack] = useState<Screen[]>([])
  const [currentClassId, setCurrentClassId] = useState<string | null>(null)
  const [currentStudentId, setCurrentStudentId] = useState<string | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<ClassSeries | null>(null)

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

  return (
    <div className="app-shell">
      {store.error && (
        <div style={{ position: 'fixed', top: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 430, background: '#9a3a1e', color: '#fff', fontSize: 13, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, boxSizing: 'border-box' }}>
          <span>{store.error}</span>
          <button onClick={store.dismissError} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: '0 0 0 12px' }}>×</button>
        </div>
      )}
      {screen === 'home' && <HomeScreen store={store} onOpenClass={openClass} isActiveTab={tab === 'home'} onOpenGroups={() => pushScreen('groups')} />}
      {screen === 'class' && currentClassId && <ClassScreen store={store} classId={currentClassId} onBack={goBack} />}
      {screen === 'students' && <StudentsScreen store={store} onOpenStudent={openStudent} />}
      {screen === 'student-detail' && currentStudentId && <StudentDetail store={store} studentId={currentStudentId} onBack={goBack} />}
      {screen === 'finance' && <FinanceScreen store={store} onOpenClass={openClass} />}
      {screen === 'groups' && (
        <GroupsScreen
          classSeries={store.data.classSeries}
          subscriptions={store.data.subscriptions}
          classes={store.data.classes}
          onBack={goBack}
          onSelectSeries={s => { setSelectedSeries(s); pushScreen('groupDetail') }}
          onNewSeries={() => { setSelectedSeries(null); pushScreen('groupForm') }}
        />
      )}
      {screen === 'groupDetail' && selectedSeries && (
        <GroupDetailScreen
          series={store.data.classSeries.find(s => s.id === selectedSeries.id) || selectedSeries}
          classes={store.data.classes}
          subscriptions={store.data.subscriptions}
          students={store.data.students}
          onBack={goBack}
          onEdit={() => pushScreen('groupForm')}
          onSelectClass={openClass}
          onToggleSubscriptionStatus={store.toggleSubscriptionStatus}
          onAddSubscription={(studentId, month) => store.addSubscription({ studentId, seriesId: selectedSeries.id, month, price: null, status: 'pending' })}
        />
      )}
      {screen === 'groupForm' && (
        <GroupFormScreen
          series={selectedSeries ?? undefined}
          onBack={goBack}
          onSave={async d => {
            if (selectedSeries) await store.updateClassSeries(selectedSeries.id, d)
            else await store.addClassSeries(d)
          }}
          onDelete={selectedSeries ? async () => {
            await store.deleteClassSeries(selectedSeries.id)
            setSelectedSeries(null)
            goBack()
            goBack() // Go back twice: form → detail → groups list
          } : undefined}
        />
      )}
      <BottomNav activeTab={tab} onNavigate={navigate} onSignOut={() => supabase.auth.signOut()} />
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#f5f0e8' }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: '#3d4a2e' }}>Kriyā</p>
    </div>
  )

  if (!session) return <AuthScreen />

  return <AuthenticatedApp />
}
