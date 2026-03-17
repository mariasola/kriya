'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    setError('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setSent(true)
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', padding: '2rem', background: '#f5f0e8' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 36, fontWeight: 500, color: '#3d4a2e', marginBottom: 8 }}>Kriyā</h1>
          <p style={{ fontSize: 14, color: '#8a7a6a' }}>Gestión de clases de yoga</p>
        </div>
        {sent ? (
          <div style={{ background: '#eaf5ee', borderRadius: 12, padding: '1.25rem', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#2a6640', lineHeight: 1.6 }}>Revisa tu email para confirmar tu cuenta.</p>
          </div>
        ) : (
          <>
            <label className="field-label">Email</label>
            <input className="field-input" type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            <label className="field-label">Contraseña</label>
            <input className="field-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p style={{ fontSize: 13, color: '#9a3a1e', marginBottom: 8 }}>{error}</p>}
            <button className="btn-primary" onClick={handleSubmit} disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Cargando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
            </button>
            <button className="btn-secondary" onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}>
              {mode === 'login' ? '¿Sin cuenta? Regístrate' : '¿Ya tienes cuenta? Entra'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
