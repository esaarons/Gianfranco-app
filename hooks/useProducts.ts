'use client'

import { useQuery } from '@tanstack/react-query'
import type { Product, Modifier } from '@/types'

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
