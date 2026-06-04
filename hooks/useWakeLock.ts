'use client'

import { useEffect, useRef } from 'react'

/**
 * Keeps the screen awake using the Screen Wake Lock API.
 * Falls back silently on unsupported browsers (iOS Safari < 16.4, Firefox).
 * Call this in Barra/Cocina/Salón pages when the user is on shift.
 */
export function useWakeLock(active: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null)

  async function acquire() {
    if (!active) return
    if (!('wakeLock' in navigator)) return
    try {
      lockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // Permission denied or not supported — fail silently
    }
  }

  function release() {
    lockRef.current?.release().catch(() => {})
    lockRef.current = null
  }

  useEffect(() => {
    if (!active) { release(); return }
    acquire()

    // Re-acquire after page becomes visible again (iOS releases lock on tab switch)
    const onVisible = () => { if (document.visibilityState === 'visible') acquire() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      release()
    }
  }, [active])
}
