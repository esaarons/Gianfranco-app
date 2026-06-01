'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSound, areaLabel } from '@/hooks/useSound'
import type { AreaCard, AreaType, CardStatus } from '@/types'

// Re-export for convenience
export type { CardStatus }

// ── useAreaCards (by exact area_id) ─────────────────────────────────────────
export function useAreaCards(areaId: string) {
  const queryClient = useQueryClient()
  const { playAlert } = useSound()
  const knownIds = useRef<Set<string>>(new Set())

  const query = useQuery<AreaCard[]>({
    queryKey: ['cards', areaId],
    queryFn: async () => {
      const res = await fetch(`/api/cards?areaId=${areaId}`)
      if (!res.ok) throw new Error('Error cargando tarjetas')
      const data: AreaCard[] = await res.json()
      data.forEach((c) => knownIds.current.add(c.id))
      return data
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

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
            if (newCard.status === 'pending') playAlert(`Nuevo pedido para ${areaLabel(newCard.area_id)}`, `Nuevo pedido — ${areaLabel(newCard.area_id)}`)
          }
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'area_cards', filter: `area_id=eq.${areaId}` },
        () => queryClient.invalidateQueries({ queryKey: ['cards', areaId] }))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [areaId, queryClient, playAlert])

  return query
}

// ── useAreaCardsByType (by area.type) ────────────────────────────────────────
// More robust: resolves actual area IDs from DB instead of relying on hardcoded constants.
export function useAreaCardsByType(areaType: AreaType) {
  const queryClient = useQueryClient()
  const { playAlert } = useSound()
  const knownIds   = useRef<Set<string>>(new Set())
  const [resolvedIds, setResolvedIds] = useState<string[]>([])

  // Step 1: resolve area IDs for this type from the DB
  useEffect(() => {
    fetch(`/api/areas?type=${areaType}`)
      .then((r) => r.json())
      .then((areas: Array<{ id: string }>) => setResolvedIds(areas.map((a) => a.id)))
      .catch(() => { /* keep empty, will fall back to polling */ })
  }, [areaType])

  const query = useQuery<AreaCard[]>({
    queryKey: ['cards-type', areaType],
    queryFn: async () => {
      const res = await fetch(`/api/cards?areaType=${areaType}`)
      if (!res.ok) throw new Error('Error cargando tarjetas')
      const data: AreaCard[] = await res.json()
      data.forEach((c) => knownIds.current.add(c.id))
      return data
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  })

  // Step 2: set up Realtime subscriptions for each resolved area ID
  useEffect(() => {
    if (!resolvedIds.length) return
    const supabase = createClient()
    const channels = resolvedIds.map((aid) =>
      supabase
        .channel(`cards-type-${areaType}-${aid}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'area_cards', filter: `area_id=eq.${aid}` },
          (payload) => {
            const newCard = payload.new as AreaCard
            if (!knownIds.current.has(newCard.id)) {
              knownIds.current.add(newCard.id)
              queryClient.invalidateQueries({ queryKey: ['cards-type', areaType] })
              if (newCard.status === 'pending') playAlert(`Nuevo pedido`, `Nuevo pedido — ${areaType}`)
            }
          })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'area_cards', filter: `area_id=eq.${aid}` },
          () => queryClient.invalidateQueries({ queryKey: ['cards-type', areaType] }))
        .subscribe()
    )
    return () => { channels.forEach((ch) => supabase.removeChannel(ch)) }
  }, [resolvedIds, areaType, queryClient, playAlert])

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
      // Invalidate both key formats: exact areaId and areaType-based
      queryClient.invalidateQueries({ queryKey: ['cards', areaId] })
      queryClient.invalidateQueries({ queryKey: ['cards-type'] })
    },
  })
}
