'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product, Modifier, Order, StockStatus } from '@/types'

export function useProducts() {
  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Error cargando productos')
      return res.json()
    },
    staleTime: 1000 * 60 * 2,
  })
}

export function useProductsRealtime() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('products-stock-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products' }, () => {
        queryClient.invalidateQueries({ queryKey: ['products'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [queryClient])
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stock_status }: { id: string; stock_status: StockStatus }) => {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_status }),
      })
      if (!res.ok) throw new Error('Error actualizando stock')
      return res.json()
    },
    onMutate: async ({ id, stock_status }) => {
      await queryClient.cancelQueries({ queryKey: ['products'] })
      const prev = queryClient.getQueryData<Product[]>(['products'])
      queryClient.setQueryData<Product[]>(['products'], (old) =>
        old?.map((p) => p.id === id ? { ...p, stock_status } : p) ?? []
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['products'], ctx.prev)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
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
