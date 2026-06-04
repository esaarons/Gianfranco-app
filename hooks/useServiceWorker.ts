'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useAuthStore } from '@/store/authStore'

// Converts a URL-safe base64 string to Uint8Array (required by pushManager.subscribe)
function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData  = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function useServiceWorker() {
  const user        = useAuthStore((s) => s.user)
  const subscribing = useRef(false)

  // Register SW once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch((err) => console.warn('[SW] registration failed:', err))
  }, [])

  // Subscribe to push for the current user's areas
  const subscribePush = useCallback(async (): Promise<boolean> => {
    if (subscribing.current) return false
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false
    if (!user) return false

    try {
      subscribing.current = true

      const registration = await navigator.serviceWorker.ready

      // Ask notification permission if not already granted
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') return false

      // Fetch VAPID public key
      const keyRes  = await fetch('/api/push/vapid-key')
      const { publicKey } = await keyRes.json()
      if (!publicKey) return false

      // Subscribe to push manager
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      })

      const subJson = sub.toJSON()

      // Save subscription to DB with user's area IDs
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys:     subJson.keys,
          areaIds:  user.areas?.map((a) => a.id) ?? [],
        }),
      })

      return true
    } catch (err) {
      console.warn('[Push] subscribe failed:', err)
      return false
    } finally {
      subscribing.current = false
    }
  }, [user])

  // Unsubscribe on explicit sign-out
  const unsubscribePush = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return
    try {
      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.getSubscription()
      if (!sub) return
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
    } catch {
      // best-effort
    }
  }, [])

  // Check current push permission state
  const getPushPermission = useCallback(async (): Promise<NotificationPermission | 'unsupported'> => {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  }, [])

  return { subscribePush, unsubscribePush, getPushPermission }
}
