'use client'

import { useCallback, useEffect } from 'react'
import { useNotificationStore, type NotificationMode } from '@/store/notificationStore'
import { AREA_IDS } from '@/lib/constants'

// ── Per-mode configuration ─────────────────────────────────────────────────────
// chimeGap: ms between the START of each chime. WAV is 720 ms so 950 ms gives
// a clean overlap-free sequence with a short breath between notes.
export const MODE_CFG = {
  normal: {
    label: 'Normal',
    description: 'Ambiente tranquilo',
    volume: 0.75,
    chimes: 1,
    chimeGap: 0,
    speechDelay: 650,   // speak after first chime peak
    speechRate: 0.92,
    vibratePattern: [200],
    pendingThresholdMs: 5 * 60_000,
  },
  alto: {
    label: 'Alto',
    description: 'Hora punta',
    volume: 0.9,
    chimes: 2,
    chimeGap: 950,
    speechDelay: 1650,  // speak after second chime ends
    speechRate: 0.88,
    vibratePattern: [200, 100, 200],
    pendingThresholdMs: 3 * 60_000,
  },
  cocina_ruidosa: {
    label: 'Cocina Ruidosa',
    description: 'Ruido intenso',
    volume: 1.0,
    chimes: 3,
    chimeGap: 950,
    speechDelay: 2600,  // speak after third chime ends
    speechRate: 0.85,
    vibratePattern: [300, 100, 300, 100, 300],
    pendingThresholdMs: 2 * 60_000,
  },
} satisfies Record<NotificationMode, {
  label: string; description: string; volume: number; chimes: number;
  chimeGap: number; speechDelay: number; speechRate: number;
  vibratePattern: number[]; pendingThresholdMs: number;
}>

// ── Low-level helpers ──────────────────────────────────────────────────────────

function vibrate(pattern: number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

function speak(text: string, rate: number) {
  if (!('speechSynthesis' in window)) return
  const u  = new SpeechSynthesisUtterance(text)
  u.lang   = 'es-PE'
  u.rate   = rate
  u.pitch  = 1
  u.volume = 1
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}

function showBrowserNotification(title: string, body: string) {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  // Only pop when the tab is hidden — don't double-alert while the app is visible
  if (document.visibilityState === 'visible') return
  new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'order-alert',  // replaces the previous notification instead of stacking
    silent: true,        // our code owns the audio
  })
}

function playChimes(volume: number, count: number, gapMs: number) {
  let played = 0
  function next() {
    const audio = new Audio('/sounds/notification.wav')
    audio.volume = volume
    audio.play().catch(() => {})
    played++
    if (played < count) setTimeout(next, gapMs)
  }
  next()
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSound() {
  const {
    enabled, mode, permissionStatus,
    enable, setMode, setPermissionStatus, hydrate,
  } = useNotificationStore()

  // Hydrate once from localStorage on first client render
  useEffect(() => { hydrate() }, [hydrate])

  async function enableSound() {
    enable()
    // Unlock audio context on iOS/Safari — must happen inside a user gesture
    const a = new Audio('/sounds/notification.wav')
    a.volume = 0.001
    a.play().catch(() => {})
    // Ask for notification permission alongside the audio unlock (same gesture)
    if ('Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission()
      setPermissionStatus(perm)
    }
  }

  const playAlert = useCallback(
    (speechText: string, notifTitle = 'Nuevo pedido') => {
      if (!enabled) return
      const cfg = MODE_CFG[mode]
      vibrate(cfg.vibratePattern)
      showBrowserNotification(notifTitle, speechText)
      playChimes(cfg.volume, cfg.chimes, cfg.chimeGap)
      setTimeout(() => speak(speechText, cfg.speechRate), cfg.speechDelay)
    },
    [enabled, mode]
  )

  return { enabled, mode, permissionStatus, enableSound, setMode, playAlert }
}

// ── Utility exported for hooks that call playAlert ─────────────────────────────

export function areaLabel(areaId: string): string {
  if (areaId === AREA_IDS.BAR)      return 'Barra'
  if (areaId === AREA_IDS.KITCHEN)  return 'Cocina'
  if (areaId === AREA_IDS.DELIVERY) return 'Delivery'
  return 'estación'
}
