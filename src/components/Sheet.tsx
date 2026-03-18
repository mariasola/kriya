'use client'
import { ReactNode } from 'react'

interface Props { open: boolean; onClose: () => void; title: string; children: ReactNode }

export default function Sheet({ open, onClose, title, children }: Props) {
  if (!open) return null
  return (
    <div className="sheet-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">{title}</div>
        {children}
      </div>
    </div>
  )
}
