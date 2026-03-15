'use client'

import { useState } from 'react'
import { useStore } from '@/hooks/useStore'
import HomeScreen from '@/components/HomeScreen'
import ClaseScreen from '@/components/ClaseScreen'
import AlumnasScreen from '@/components/AlumnasScreen'
import AlumnaDetalle from '@/components/AlumnaDetalle'
import FinanzasScreen from '@/components/FinanzasScreen'
import BottomNav from '@/components/BottomNav'

export type Tab = 'home' | 'alumnas' | 'finanzas'
export type Screen = Tab | 'clase' | 'alumna-detalle'

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState<Tab>('home')
  const [screen, setScreen] = useState<Screen>('home')
  const [screenStack, setScreenStack] = useState<Screen[]>([])
  const [currentClaseId, setCurrentClaseId] = useState<string | null>(null)
  const [currentAlumnaId, setCurrentAlumnaId] = useState<string | null>(null)

  function navigate(t: Tab) {
    setTab(t)
    setScreen(t)
    setScreenStack([])
  }

  function pushScreen(s: Screen) {
    setScreenStack(prev => [...prev, screen])
    setScreen(s)
  }

  function goBack() {
    const prev = screenStack[screenStack.length - 1] || tab
    setScreenStack(s => s.slice(0, -1))
    setScreen(prev)
  }

  function openClase(id: string) {
    setCurrentClaseId(id)
    pushScreen('clase')
  }

  function openAlumna(id: string) {
    setCurrentAlumnaId(id)
    pushScreen('alumna-detalle')
  }

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <HomeScreen store={store} onOpenClase={openClase} />
      )}
      {screen === 'clase' && currentClaseId && (
        <ClaseScreen
          store={store}
          claseId={currentClaseId}
          onBack={goBack}
        />
      )}
      {screen === 'alumnas' && (
        <AlumnasScreen store={store} onOpenAlumna={openAlumna} />
      )}
      {screen === 'alumna-detalle' && currentAlumnaId && (
        <AlumnaDetalle
          store={store}
          alumnaId={currentAlumnaId}
          onBack={goBack}
        />
      )}
      {screen === 'finanzas' && (
        <FinanzasScreen store={store} />
      )}
      <BottomNav activeTab={tab} onNavigate={navigate} />
    </div>
  )
}
