'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export function useSetting(key: string) {
  return useQuery<string | null>({
    queryKey: ['settings', key],
    queryFn: async () => {
      const res = await fetch(`/api/settings?key=${key}`)
      if (!res.ok) return null
      const data = await res.json()
      return data?.value ?? null
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useUpdateSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) throw new Error('Error actualizando configuración')
    },
    onSuccess: (_, { key }) => qc.invalidateQueries({ queryKey: ['settings', key] }),
  })
}
