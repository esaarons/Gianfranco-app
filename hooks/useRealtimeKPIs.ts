'use client'

import { useQuery } from '@tanstack/react-query'
import type { RealtimeKPIs } from '@/types'

export function useRealtimeKPIs(intervalMs = 30_000) {
  return useQuery<RealtimeKPIs>({
    queryKey: ['analytics', 'realtime'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/realtime')
      if (!res.ok) throw new Error('Error cargando KPIs')
      return res.json()
    },
    staleTime: intervalMs,
    refetchInterval: intervalMs,
  })
}
