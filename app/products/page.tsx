'use client'

import { useState, useMemo } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useQueryClient } from '@tanstack/react-query'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product } from '@/types'

const AREA_CFG = {
  bar:     { label: 'Barra',   color: 'text-[#A7B897]', bg: 'bg-[#A7B897]/15 border-[#A7B897]/25' },
  kitchen: { label: 'Cocina',  color: 'text-[#C46F4E]', bg: 'bg-[#C46F4E]/15 border-[#C46F4E]/25' },
}

type Filter = 'all' | 'bar' | 'kitchen' | 'favorites'

export default function ProductsPage() {
  const { data: products = [], isLoading } = useProducts()
  const qc = useQueryClient()
  const [search, setSearch]   = useState('')
  const [filter, setFilter]   = useState<Filter>('all')

  const filtered = useMemo(() => products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all'       ? true :
      filter === 'bar'       ? p.primary_area?.type === 'bar' :
      filter === 'kitchen'   ? p.primary_area?.type === 'kitchen' :
      p.is_favorite
    return matchSearch && matchFilter
  }), [products, search, filter])

  const grouped = useMemo(() => {
    const map: Record<string, Product[]> = {}
    filtered.forEach((p) => {
      const cat = p.category?.name ?? 'Sin categoría'
      if (!map[cat]) map[cat] = []
      map[cat].push(p)
    })
    return map
  }, [filtered])

  async function toggleFavorite(product: Product) {
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !product.is_favorite }),
    })
    qc.invalidateQueries({ queryKey: ['products'] })
  }

  async function toggleActive(product: Product) {
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !product.active }),
    })
    qc.invalidateQueries({ queryKey: ['products'] })
    toast.success(`${product.name} ${product.active ? 'desactivado' : 'activado'}`)
  }

  const activeCount = products.filter((p) => p.active).length

  return (
    <div className="min-h-screen bg-[#F6F2EA]">

      {/* Header */}
      <div className="px-5 pt-8 pb-4">
        <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Catálogo</p>
        <div className="flex items-end justify-between">
          <h1 className="text-[#252525] text-2xl font-bold tracking-tight">Productos</h1>
          <span className="text-[#B0AB9F] text-xs mb-1">{activeCount} activos</span>
        </div>
      </div>

      {/* Search + filters */}
      <div className="px-5 pb-4 space-y-3">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-2xl pl-11 pr-4 py-3 text-sm text-white outline-none placeholder:text-white/30 transition-all"
          />
        </div>

        <div className="flex gap-2">
          {([
            { value: 'all',       label: 'Todos'      },
            { value: 'bar',       label: 'Barra'      },
            { value: 'kitchen',   label: 'Cocina'     },
            { value: 'favorites', label: '⭐ Favs'    },
          ] as const).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'flex-1 py-2 rounded-xl text-xs font-bold transition-all press-scale',
                filter === f.value ? 'bg-[#F5F1E8] text-[#0F2018]' : 'glass text-white/45'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="px-5 pb-10 space-y-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 skeleton rounded-2xl" />
          ))
        ) : Object.keys(grouped).length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <p className="text-5xl mb-4 opacity-30">🔍</p>
            <p className="text-white/30 text-sm">Sin resultados</p>
          </div>
        ) : (
          Object.entries(grouped).map(([category, catProducts]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-white/30 text-[10px] font-bold uppercase tracking-widest">{category}</span>
                <div className="flex-1 h-px bg-white/6" />
                <span className="text-white/20 text-[10px]">{catProducts.length}</span>
              </div>

              <div className="space-y-2">
                {catProducts.map((product) => {
                  const area = AREA_CFG[product.primary_area?.type as 'bar' | 'kitchen'] ?? AREA_CFG.bar
                  return (
                    <div
                      key={product.id}
                      className={cn(
                        'bg-white border border-[#E8E4DC] rounded-2xl px-4 py-3.5 flex items-center gap-3 transition-all card-shadow',
                        !product.active && 'opacity-40'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[#252525] text-sm font-semibold truncate">{product.name}</p>
                          {product.is_favorite && <span className="text-xs shrink-0">⭐</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#1B3428] font-bold text-sm">{formatPrice(product.price)}</span>
                          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', area.bg, area.color)}>
                            {area.label}
                          </span>
                        </div>
                      </div>

                      {/* Fav toggle */}
                      <button
                        onClick={() => toggleFavorite(product)}
                        className={cn(
                          'w-8 h-8 flex items-center justify-center rounded-xl transition-all press-scale text-lg',
                          product.is_favorite ? 'text-[#EAD9B1]' : 'text-white/15 hover:text-white/40'
                        )}
                      >★</button>

                      {/* Active toggle */}
                      <button
                        onClick={() => toggleActive(product)}
                        className={cn(
                          'relative w-11 h-6 rounded-full transition-colors shrink-0',
                          product.active ? 'bg-[#A7B897]' : 'bg-white/10'
                        )}
                      >
                        <div className={cn(
                          'absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all',
                          product.active ? 'left-6' : 'left-1'
                        )} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
