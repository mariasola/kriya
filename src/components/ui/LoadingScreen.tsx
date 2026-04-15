'use client'

export default function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', background: '#f5f0e8' }}>
      <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: '#8a7a6a', fontStyle: 'italic' }}>Cargando...</p>
    </div>
  )
}
