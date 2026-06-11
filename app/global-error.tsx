'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global error]', error)
  }, [error])

  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'sans-serif', background: '#F6F2EA' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, textAlign: 'center', gap: 12 }}>
          <p style={{ fontSize: 32, margin: 0 }}>⚠️</p>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#252525', margin: 0 }}>Algo salió mal</h2>
          <p style={{ fontSize: 13, color: '#666', maxWidth: 320, margin: 0 }}>
            {error.message || 'Error inesperado.'}
          </p>
          {error.digest && (
            <p style={{ fontSize: 11, color: '#999', margin: 0 }}>
              Código: {error.digest}
            </p>
          )}
          {process.env.NODE_ENV !== 'production' && error.stack && (
            <pre style={{ fontSize: 10, textAlign: 'left', background: '#fff', padding: 12, borderRadius: 8, maxWidth: 400, overflow: 'auto', color: '#c00' }}>
              {error.stack}
            </pre>
          )}
          <button
            onClick={reset}
            style={{ marginTop: 8, padding: '8px 20px', background: '#1B3428', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
