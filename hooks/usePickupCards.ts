'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useSound } from '@/hooks/useSound'
import { AREA_IDS } from '@/lib/constants'
import type { AreaCard } from '@/types'

export function usePickupCards() {
  const queryClient   = useQueryClient()
  const { playPickupAlert } = useSound()
  const notifiedIds   = useRef<Set<string>>(new Set())

  const query = useQuery<AreaCard[]>({
    queryKey: ['pickup-cards'],
    queryFn: async () => {
      const res = await fetch('/api/cards/ready')
      if (!res.ok) return []
      const data: AreaCard[] = await res.json()
      // Seed known IDs on load — no toast for already-delivered items
      data.forEach((c) => notifiedIds.current.add(c.id))
      return data
    },
    staleTime: 30000,
  })

  useEffect(() => {
    const supabase = createClient()

    function handleUpdate(payload: { new: Record<string, unknown> }) {
      const card = payload.new as unknown as AreaCard
      if (card.status !== 'delivered') return
      if (notifiedIds.current.has(card.id)) return

      notifiedIds.current.add(card.id)
      queryClient.invalidateQueries({ queryKey: ['pickup-cards'] })

      const isBar     = card.area_id === AREA_IDS.BAR
      const areaName  = isBar ? 'Barra' : 'Cocina'
      const areaIcon  = isBar ? '☕' : '🍳'

      toast(`${areaIcon} Listo en ${areaName}`, {
        description: 'Pedido listo para recoger',
        duration: 8000,
        style: {
          background: '#F0FDF4',
          border: '1px solid #86EFAC',
          color: '#166534',
        },
      })

      playPickupAlert(areaName)
    }

    // Two listeners on one channel — one per area
    const channel = supabase
      .channel('pickup-notifications')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'area_cards', filter: `area_id=eq.${AREA_IDS.BAR}` },
        handleUpdate
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'area_cards', filter: `area_id=eq.${AREA_IDS.KITCHEN}` },
        handleUpdate
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient, playPickupAlert])

  return query
}
