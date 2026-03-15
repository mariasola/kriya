'use client'
import { Tab } from '@/app/page'

interface Props { activeTab: Tab; onNavigate: (t: Tab) => void }

export default function BottomNav({ activeTab, onNavigate }: Props) {
  return (
    <nav className="bnav">
      <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => onNavigate('home')}>
        <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="4" x2="9" y2="9"/><line x1="15" y1="4" x2="15" y2="9"/></svg>
        <span>Clases</span>
      </div>
      <div className={`nav-item ${activeTab === 'alumnas' ? 'active' : ''}`} onClick={() => onNavigate('alumnas')}>
        <svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2"/><path d="M19 8v6M22 11h-6" strokeLinecap="round"/></svg>
        <span>Alumnas</span>
      </div>
      <div className={`nav-item ${activeTab === 'finanzas' ? 'active' : ''}`} onClick={() => onNavigate('finanzas')}>
        <svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        <span>Finanzas</span>
      </div>
    </nav>
  )
}
