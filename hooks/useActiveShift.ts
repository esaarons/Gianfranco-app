'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Shift } from '@/types'

export function useActiveShift() {
  const qc = useQueryClient()

  const { data: shift, isLoading } = useQuery<Shift | null>({
    queryKey: ['shifts', 'active'],
    queryFn: async () => {
      const res = await fetch('/api/shifts')
      if (!res.ok) return null
      const shifts: Shift[] = await res.json()
      return shifts.find(s => !s.ended_at) ?? null
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const startShift = useMutation({
    mutationFn: async (notes?: string) => {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error abriendo turno')
      }
      return res.json() as Promise<Shift>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })

  const endShift = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/shifts/${id}`, { method: 'PATCH' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error cerrando turno')
      }
      return res.json() as Promise<Shift>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shifts'] }),
  })

  return {
    shift:      shift ?? null,
    isActive:   !!shift,
    isLoading,
    startShift,
    endShift,
  }
}
