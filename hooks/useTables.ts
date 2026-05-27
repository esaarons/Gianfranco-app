'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Table, TableStatus } from '@/types'

export function useTables() {
  const queryClient = useQueryClient()

  const query = useQuery<Table[]>({
    queryKey: ['tables'],
    queryFn: async () => {
      const res = await fetch('/api/tables')
      if (!res.ok) throw new Error('Error cargando mesas')
      return res.json()
    },
  })

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tables-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [queryClient])

  return query
}

export function useUpdateTableStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TableStatus }) => {
      const res = await fetch(`/api/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Error actualizando mesa')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useJoinTables() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ childId, parentId }: { childId: string; parentId: string }) => {
      const res = await fetch(`/api/tables/${childId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', parentId }),
      })
      if (!res.ok) throw new Error('Error uniendo mesas')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useSplitTable() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tableId: string) => {
      const res = await fetch(`/api/tables/${tableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'split' }),
      })
      if (!res.ok) throw new Error('Error separando mesa')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useMoveOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fromTableId, targetTableId, orderId }: { fromTableId: string; targetTableId: string; orderId: string }) => {
      const res = await fetch(`/api/tables/${fromTableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'move', targetTableId, orderId }),
      })
      if (!res.ok) throw new Error('Error moviendo pedido')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tables'] }),
  })
}
