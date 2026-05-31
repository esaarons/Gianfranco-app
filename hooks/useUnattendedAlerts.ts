'use client'

import { useEffect, useRef } from 'react'
import { useSound, MODE_CFG } from './useSound'
import { useNotificationStore } from '@/store/notificationStore'
import type { AreaCard } from '@/types'

const CHECK_EVERY_MS = 30_000

/**
 * Fires a repeat alert for any `pending` card that has gone unattended
 * past the threshold for the current notification mode.
 *
 * Call this inside the bar / kitchen page after fetching cards.
 * Each card is alerted at most once per pending window — the alerted ID
 * is cleared as soon as the card leaves `pending` status.
 */
export function useUnattendedAlerts(cards: AreaCard[], area: string) {
  const { playAlert, enabled } = useSound()
  const mode = useNotificationStore(s => s.mode)

  const alertedRef  = useRef<Set<string>>(new Set())
  const cardsRef    = useRef(cards)
  const modeRef     = useRef(mode)
  const enabledRef  = useRef(enabled)

  useEffect(() => { cardsRef.current  = cards   }, [cards])
  useEffect(() => { modeRef.current   = mode    }, [mode])
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  // Clear alerted IDs the moment a card leaves pending
  useEffect(() => {
    const pendingIds = new Set(
      cards.filter(c => c.status === 'pending').map(c => c.id)
    )
    for (const id of alertedRef.current) {
      if (!pendingIds.has(id)) alertedRef.current.delete(id)
    }
  }, [cards])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!enabledRef.current) return
      const threshold = MODE_CFG[modeRef.current].pendingThresholdMs
      const now = Date.now()
      for (const card of cardsRef.current) {
        if (card.status !== 'pending') continue
        if (alertedRef.current.has(card.id)) continue
        const age = now - new Date(card.created_at).getTime()
        if (age >= threshold) {
          alertedRef.current.add(card.id)
          playAlert(
            `Pedido sin atender en ${area}`,
            `⚠️ Sin atender — ${area}`
          )
        }
      }
    }, CHECK_EVERY_MS)

    return () => clearInterval(timer)
  }, [area, playAlert])
}
