'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

// Retry delays: 1s, 2s, 4s, 8s — total ~15s before giving up
const RETRY_DELAYS = [1000, 2000, 4000, 8000]

async function fetchMe(retries = RETRY_DELAYS): Promise<{ user: unknown } | null> {
  for (let attempt = 0; attempt <= retries.length; attempt++) {
    try {
      const res = await fetch('/api/auth/me')

      // Explicit 401: session is invalid or expired — don't retry
      if (res.status === 401) return null

      if (res.ok) return res.json()

      // Other server error — retry
    } catch {
      // Network error — retry
    }

    if (attempt < retries.length) {
      await new Promise(r => setTimeout(r, retries[attempt]))
    }
  }
  // Exhausted retries — treat as network issue, NOT as logged-out
  return { user: '__network_error__' }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser  = useAuthStore((s) => s.setUser)
  const user     = useAuthStore((s) => s.user)
  const router   = useRouter()
  const [checked, setChecked] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  const retrying = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      const result = await fetchMe()

      if (cancelled) return

      if (result === null) {
        // Real 401 — no valid session, go to login
        router.push('/login')
        return
      }

      if (result.user === '__network_error__') {
        // Network unreachable — do NOT redirect, show retry UI
        setNetworkError(true)
        setChecked(true)
        return
      }

      const u = (result as { user: unknown }).user
      if (u) {
        setUser(u as Parameters<typeof setUser>[0])
        setNetworkError(false)
      } else {
        router.push('/login')
      }

      setChecked(true)
    }

    check()
    return () => { cancelled = true }
  }, [setUser, router])

  // Retry after network error recovered
  async function retryCheck() {
    if (retrying.current) return
    retrying.current = true
    setNetworkError(false)
    setChecked(false)
    try {
      const res = await fetch('/api/auth/me')
      if (res.status === 401) { router.push('/login'); return }
      if (res.ok) {
        const { user: u } = await res.json()
        if (u) { setUser(u); setChecked(true); return }
      }
    } catch { /* still offline */ }
    setNetworkError(true)
    setChecked(true)
    retrying.current = false
  }

  if (networkError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F7F5F0] gap-4 px-6">
        <div className="text-4xl">📡</div>
        <p className="text-[#1F1F1F] font-semibold text-center">Sin conexión</p>
        <p className="text-[#7A756D] text-sm text-center">No se pudo verificar la sesión. Comprueba la red e intenta de nuevo.</p>
        <button
          onClick={retryCheck}
          className="bg-[#1E3541] text-white font-semibold px-6 py-3 rounded-xl text-sm press-scale mt-2"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (!checked || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F5F0]">
        <div className="w-8 h-8 border-2 border-[#E7E1D8] border-t-[#1E3541] rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
