'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSound, areaLabel } from '@/hooks/useSound'
import { AREA_IDS } from '@/lib/constants'
import type { AreaCard, AreaType, CardStatus } from '@/types'

// Re-export for convenience
export type { CardStatus }

// Direct map from AreaType to seeded UUID — avoids async fetch before subscribing
const AREA_TYPE_TO_ID: Partial<Record<AreaType, string>> = {
  bar:      AREA_IDS.BAR,
  kitchen:  AREA_IDS.KITCHEN,
  salon:    AREA_IDS.SALON,
  delivery: AREA_IDS.DELIVERY,
}

// ── useAreaCards (by exact area_id) ─────────────────────────────────────────
export function useAreaCards(areaId: string) {
  const queryClient = useQueryClient()
  const { playAlert } = useSound()
  const knownIds    = useRef<Set<string>>(new Set())
  const playAlertRef = useRef(playAlert)
  useEffect(() => { playAlertRef.current = playAlert }, [playAlert])

  const query = useQuery<AreaCard[]>({
    queryKey: ['cards', areaId],
    queryFn: async () => {
      const res = await fetch(`/api/cards?areaId=${areaId}`)
      if (!res.ok) throw new Error('Error cargando tarjetas')
      const data: AreaCard[] = await res.json()
      data.forEach((c) => knownIds.current.add(c.id))
      return data
    },
    refetchInterval: 5_000,
    staleTime: 3_000,
  })

  // Immediate refetch when PWA comes to foreground
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible')
        queryClient.invalidateQueries({ queryKey: ['cards', areaId] })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [queryClient, areaId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`cards-${areaId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'area_cards', filter: `area_id=eq.${areaId}` },
        (payload) => {
          const newCard = payload.new as AreaCard
          if (!knownIds.current.has(newCard.id)) {
            knownIds.current.add(newCard.id)
            queryClient.invalidateQueries({ queryKey: ['cards', areaId] })
            if (newCard.status === 'pending')
              playAlertRef.current(`Nuevo pedido para ${areaLabel(newCard.area_id)}`, `Nuevo pedido — ${areaLabel(newCard.area_id)}`, 'warning')
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'area_cards', filter: `area_id=eq.${areaId}` },
        () => queryClient.invalidateQueries({ queryKey: ['cards', areaId] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [areaId, queryClient]) // playAlert intentionally excluded — uses ref above

  return query
}

// ── useAreaCardsByType (by area.type) ────────────────────────────────────────
// Uses seeded AREA_IDS constants to subscribe to Realtime immediately on mount —
// no async DB fetch needed before the channel opens.
export function useAreaCardsByType(areaType: AreaType) {
  const queryClient  = useQueryClient()
  const { playAlert } = useSound()
  const knownIds     = useRef<Set<string>>(new Set())
  const playAlertRef = useRef(playAlert)
  useEffect(() => { playAlertRef.current = playAlert }, [playAlert])

  // Known synchronously — no async step required
  const areaId = AREA_TYPE_TO_ID[areaType]

  const query = useQuery<AreaCard[]>({
    queryKey: ['cards-type', areaType],
    queryFn: async () => {
      const res = await fetch(`/api/cards?areaType=${areaType}`)
      if (!res.ok) throw new Error('Error cargando tarjetas')
      const data: AreaCard[] = await res.json()
      data.forEach((c) => knownIds.current.add(c.id))
      return data
    },
    refetchInterval: 5_000,  // fast fallback if Realtime drops
    staleTime: 3_000,
  })

  // Immediate refetch when PWA comes to foreground (iOS WebSocket gets paused in background)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible')
        queryClient.invalidateQueries({ queryKey: ['cards-type', areaType] })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [queryClient, areaType])

  // Realtime subscription — starts immediately, no async wait
  useEffect(() => {
    if (!areaId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`cards-type-${areaType}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'area_cards', filter: `area_id=eq.${areaId}` },
        (payload) => {
          const newCard = payload.new as AreaCard
          if (!knownIds.current.has(newCard.id)) {
            knownIds.current.add(newCard.id)
            queryClient.invalidateQueries({ queryKey: ['cards-type', areaType] })
            if (newCard.status === 'pending')
              playAlertRef.current(`Nuevo pedido`, `Nuevo pedido — ${areaType}`, 'warning')
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'area_cards', filter: `area_id=eq.${areaId}` },
        () => queryClient.invalidateQueries({ queryKey: ['cards-type', areaType] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [areaId, areaType, queryClient]) // playAlert intentionally excluded — uses ref above

  return query
}

export function useUpdateCardStatus(areaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CardStatus }) => {
      const res = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Error actualizando tarjeta')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', areaId] })
      queryClient.invalidateQueries({ queryKey: ['cards-type'] })
    },
  })
}

export function useUpdateCardNote(areaId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, operator_note, delay_minutes, delay_reason }:
      { id: string; operator_note?: string; delay_minutes?: number | null; delay_reason?: string | null }) => {
      const res = await fetch(`/api/cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operator_note, delay_minutes, delay_reason }),
      })
      if (!res.ok) throw new Error('Error actualizando nota')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', areaId] })
      queryClient.invalidateQueries({ queryKey: ['cards-type'] })
    },
  })
}
