'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useSound } from '@/hooks/useSound'
import { AREA_IDS } from '@/lib/constants'
import type { AreaCard } from '@/types'

function buildToastText(card: AreaCard): { title: string; description: string; speech: string } {
  const isBar    = card.area_id === AREA_IDS.BAR
  const areaName = card.area?.name ?? (isBar ? 'Barra' : 'Cocina')
  const areaIcon = isBar ? '☕' : '🍳'

  const order     = card.order
  const tableCode = order?.table?.code ?? null
  const isTakeaway = order?.type === 'takeaway'

  const areaType  = isBar ? 'bar' : 'kitchen'
  const areaItems = order?.items?.filter(i => i.area?.type === areaType) ?? []
  const itemsText = areaItems
    .map(i => `${i.quantity > 1 ? i.quantity + '× ' : ''}${i.product?.name ?? i.notes ?? ''}`)
    .filter(Boolean)
    .join(', ')

  const location = tableCode ? `Mesa ${tableCode}` : isTakeaway ? 'Para llevar' : ''
  const title    = `${areaIcon} ${areaName}${location ? ` · ${location}` : ''}`
  const description = itemsText || 'Pedido listo para recoger'

  // Siri-readable speech text
  const speech = location
    ? `${areaName} listo. ${location}. ${itemsText}`
    : `${areaName} listo. ${itemsText}`

  return { title, description, speech }
}

export function usePickupCards() {
  const queryClient   = useQueryClient()
  const { playAlert } = useSound()
  const notifiedIds   = useRef<Set<string>>(new Set())

  const query = useQuery<AreaCard[]>({
    queryKey: ['pickup-cards'],
    queryFn: async () => {
      const res = await fetch('/api/cards/ready')
      if (!res.ok) return []
      const data: AreaCard[] = await res.json()
      // Seed known IDs on load — don't toast for already-delivered items
      data.forEach((c) => notifiedIds.current.add(c.id))
      return data
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const supabase = createClient()

    async function handleUpdate(payload: { new: Record<string, unknown> }) {
      const partialCard = payload.new as unknown as AreaCard
      if (partialCard.status !== 'delivered') return
      if (notifiedIds.current.has(partialCard.id)) return
      notifiedIds.current.add(partialCard.id)

      // Invalidate the list immediately (card will appear in banner)
      queryClient.invalidateQueries({ queryKey: ['pickup-cards'] })

      // Fetch full card with order/table join for the rich toast
      let card = partialCard
      try {
        const res = await fetch(`/api/cards/${partialCard.id}`)
        if (res.ok) card = await res.json()
      } catch {
        // fallback to partial card — toast still shows area name at minimum
      }

      const { title, description, speech } = buildToastText(card)

      toast(title, {
        description,
        duration: 10_000,
        style: {
          background: '#F0FDF4',
          border: '1px solid #86EFAC',
          color: '#166534',
        },
      })

      playAlert(speech, title, 'info')
    }

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
  }, [queryClient, playAlert])

  return query
}
