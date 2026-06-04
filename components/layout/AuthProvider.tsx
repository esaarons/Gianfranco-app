'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import type { User } from '@/types'

// ── Session cache ─────────────────────────────────────────────────────────────
// Persisted in sessionStorage so the app renders instantly on PWA re-open.
// The JWT cookie + server remain the source of truth — this only prevents
// showing the spinner on repeat visits within the same browser session.

const CACHE_KEY = 'gf_user_v1'
const CACHE_TTL = 10 * 60 * 1000 // 10 min

function readCache(): User | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { user, ts }: { user: User; ts: number } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) { sessionStorage.removeItem(CACHE_KEY); return null }
    return user
  } catch { return null }
}

function writeCache(user: User | null) {
  if (typeof window === 'undefined') return
  try {
    if (!user) { sessionStorage.removeItem(CACHE_KEY); return }
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ user, ts: Date.now() }))
  } catch { /* private mode / storage quota */ }
}

// ── Network fetch with retries ────────────────────────────────────────────────

const RETRY_DELAYS = [1000, 2000, 4000, 8000]

async function fetchMe(): Promise<{ user: unknown } | null> {
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      const res = await fetch('/api/auth/me')
      if (res.status === 401) return null          // explicit — no retry
      if (res.ok)             return res.json()
    } catch { /* network error — retry */ }
    if (attempt < RETRY_DELAYS.length)
      await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]))
  }
  return { user: '__network_error__' }
}

// ── AuthProvider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore(s => s.setUser)
  const router  = useRouter()
  const retrying = useRef(false)

  // ── FAST PATH: check if user is already in the Zustand store.
  // When navigating between routes (e.g. /salon → /order → /salon), each layout
  // mounts a new AuthProvider but the in-memory store already has the user.
  // useState initializer runs synchronously, so no spinner is shown at all.
  const [checked, setChecked] = useState(
    () => useAuthStore.getState().user !== null
  )
  const [networkError, setNetworkError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function check() {
      // ── Fast path: user in Zustand store (inter-route navigation) ────────────
      if (useAuthStore.getState().user) {
        setChecked(true)
        return
      }

      // ── Medium path: user in sessionStorage cache (PWA re-open) ─────────────
      // Show the UI instantly; verify with the server silently in the background.
      const cached = readCache()
      if (cached) {
        setUser(cached)
        setChecked(true)

        const result = await fetchMe()
        if (cancelled) return

        if (result === null) {
          // Session revoked or expired since we last cached
          writeCache(null)
          setUser(null)
          router.push('/login')
          return
        }

        if (result?.user && result.user !== '__network_error__') {
          const fresh = result.user as User
          writeCache(fresh)
          setUser(fresh) // refresh areas / role in case they changed
        }
        // Network error with valid cache → keep showing cached UI silently
        return
      }

      // ── Slow path: no cache — full blocking fetch ─────────────────────────
      const result = await fetchMe()
      if (cancelled) return

      if (result === null) {
        router.push('/login')
        return
      }

      if ((result as { user: unknown }).user === '__network_error__') {
        setNetworkError(true)
        setChecked(true)
        return
      }

      const u = (result as { user: unknown }).user as User | null
      if (u) {
        writeCache(u)
        setUser(u)
        setNetworkError(false)
      } else {
        router.push('/login')
      }
      setChecked(true)
    }

    check()
    return () => { cancelled = true }
  }, [setUser, router]) // stable deps — runs once per AuthProvider mount

  // ── Retry after network recovery ──────────────────────────────────────────
  async function retryCheck() {
    if (retrying.current) return
    retrying.current = true
    setNetworkError(false)
    setChecked(false)
    try {
      const res = await fetch('/api/auth/me')
      if (res.status === 401) { writeCache(null); router.push('/login'); return }
      if (res.ok) {
        const { user: u } = await res.json()
        if (u) { writeCache(u as User); setUser(u as User); setChecked(true); return }
      }
    } catch { /* still offline */ }
    setNetworkError(true)
    setChecked(true)
    retrying.current = false
  }

  // ── Network error screen ───────────────────────────────────────────────────
  if (networkError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F7F5F0] gap-4 px-6">
        <div className="text-4xl">📡</div>
        <p className="text-[#1F1F1F] font-semibold text-center">Sin conexión</p>
        <p className="text-[#7A756D] text-sm text-center">
          No se pudo verificar la sesión. Comprueba la red e intenta de nuevo.
        </p>
        <button
          onClick={retryCheck}
          className="bg-[#1E3541] text-white font-semibold px-6 py-3 rounded-xl text-sm press-scale mt-2"
        >
          Reintentar
        </button>
      </div>
    )
  }

  // ── Loading spinner — only shows on the very first cold open with no cache ──
  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F7F5F0]">
        <div className="w-8 h-8 border-2 border-[#E7E1D8] border-t-[#1E3541] rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
