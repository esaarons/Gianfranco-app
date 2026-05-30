'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product, Modifier, Order } from '@/types'

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Error cargando productos')
      return res.json()
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useModifiers() {
  return useQuery<Modifier[]>({
    queryKey: ['modifiers'],
    queryFn: async () => {
      const res = await fetch('/api/modifiers')
      if (!res.ok) throw new Error('Error cargando modificadores')
      return res.json()
    },
    staleTime: 1000 * 60 * 10,
  })
}

export function useTableOrder(tableId: string | null) {
  const queryClient = useQueryClient()

  const query = useQuery<Order | null>({
    queryKey: ['table-order', tableId],
    queryFn: async () => {
      if (!tableId) return null
      const res = await fetch(`/api/orders?tableId=${tableId}&status=open`)
      if (!res.ok) throw new Error('Error cargando pedido')
      const data: Order[] = await res.json()
      return data[0] ?? null
    },
    enabled: !!tableId,
    refetchInterval: 60000, // fallback polling — realtime handles most updates
  })

  const orderId = query.data?.id ?? null

  useEffect(() => {
    if (!tableId) return
    const supabase = createClient()
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['table-order', tableId] })

    const channel = supabase
      .channel(`table-order-${tableId}-${orderId ?? 'none'}`)
      // Order status changes (e.g. closed)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `table_id=eq.${tableId}` }, invalidate)

    // Item changes — only subscribe once we know the order ID
    if (orderId) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: 'order_items', filter: `order_id=eq.${orderId}` }, invalidate)
    }

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [tableId, orderId, queryClient])

  return query
}
