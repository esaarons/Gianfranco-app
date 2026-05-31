'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSound, areaLabel } from '@/hooks/useSound'
import type { AreaCard, CardStatus } from '@/types'

// Re-export for convenience
export type { CardStatus }

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
      // Seed known IDs so initial load doesn't trigger sounds
      data.forEach((c) => knownIds.current.add(c.id))
      return data
    },
    refetchInterval: 30_000, // fallback poll if realtime disconnects
    staleTime: 15_000,
  })

  // Realtime: listen for new area_cards
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`cards-${areaId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'area_cards', filter: `area_id=eq.${areaId}` },
        (payload) => {
          const newCard = payload.new as AreaCard
          if (!knownIds.current.has(newCard.id)) {
            knownIds.current.add(newCard.id)
            queryClient.invalidateQueries({ queryKey: ['cards', areaId] })
            if (newCard.status === 'pending') {
              const area = areaLabel(newCard.area_id)
              playAlert(`Nuevo pedido para ${area}`, `Nuevo pedido — ${area}`)
            }
          }
        }
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'area_cards', filter: `area_id=eq.${areaId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['cards', areaId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [areaId, queryClient, playAlert])

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards', areaId] }),
  })
}
