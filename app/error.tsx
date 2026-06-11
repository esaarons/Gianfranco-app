'use client'

import { useEffect } from 'react'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app error]', error)
  }, [error])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center', gap: 12, fontFamily: 'sans-serif', background: '#F6F2EA' }}>
      <p style={{ fontSize: 32, margin: 0 }}>⚠️</p>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#252525', margin: 0 }}>Algo salió mal</h2>
      <p style={{ fontSize: 13, color: '#666', maxWidth: 320, margin: 0 }}>
        {error.message || 'Error inesperado. Por favor recarga la página.'}
      </p>
      {error.digest && (
        <p style={{ fontSize: 11, color: '#999', margin: 0 }}>Código: {error.digest}</p>
      )}
      <button
        onClick={reset}
        style={{ marginTop: 8, padding: '8px 20px', background: '#1B3428', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
      >
        Intentar de nuevo
      </button>
    </div>
  )
}
