'use client'

import { useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { formatPrice } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Product } from '@/types'

export default function ProductsPage() {
  const { data: products = [], isLoading } = useProducts()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'bar' | 'kitchen' | 'favorites'>('all')

  const filtered = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchFilter =
      filter === 'all' ? true :
      filter === 'bar' ? p.primary_area?.type === 'bar' :
      filter === 'kitchen' ? p.primary_area?.type === 'kitchen' :
      p.is_favorite
    return matchSearch && matchFilter
  })

  async function toggleFavorite(product: Product) {
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_favorite: !product.is_favorite }),
    })
    queryClient.invalidateQueries({ queryKey: ['products'] })
  }

  async function toggleActive(product: Product) {
    await fetch(`/api/products/${product.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !product.active }),
    })
    queryClient.invalidateQueries({ queryKey: ['products'] })
    toast.success(`${product.name} ${product.active ? 'desactivado' : 'activado'}`)
  }

  const groupedByCategory: Record<string, Product[]> = {}
  filtered.forEach((p) => {
    const cat = p.category?.name ?? 'Sin categoría'
    if (!groupedByCategory[cat]) groupedByCategory[cat] = []
    groupedByCategory[cat].push(p)
  })

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-stone-800">Productos</h1>
        <p className="text-stone-400 text-sm">{products.length} productos activos</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="flex-1 bg-stone-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400"
        />
        {(['all', 'bar', 'kitchen', 'favorites'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl text-xs font-medium shrink-0 ${filter === f ? 'bg-amber-500 text-stone-900' : 'bg-stone-100 text-stone-600'}`}
          >
            {f === 'all' ? 'Todos' : f === 'bar' ? 'Barra' : f === 'kitchen' ? 'Cocina' : '⭐'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-stone-400 py-8">Cargando...</div>
      ) : (
        Object.entries(groupedByCategory).map(([category, catProducts]) => (
          <div key={category}>
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">{category}</h2>
            <div className="space-y-1">
              {catProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 border border-stone-100">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 truncate">{product.name}</p>
                    <p className="text-amber-600 text-sm font-semibold">{formatPrice(product.price)}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${product.primary_area?.type === 'bar' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                    {product.primary_area?.type === 'bar' ? 'Barra' : 'Cocina'}
                  </span>
                  <button
                    onClick={() => toggleFavorite(product)}
                    className={`text-lg ${product.is_favorite ? 'text-amber-400' : 'text-stone-300'}`}
                  >
                    ★
                  </button>
                  <button
                    onClick={() => toggleActive(product)}
                    className={`w-10 h-6 rounded-full transition-colors ${product.active ? 'bg-emerald-400' : 'bg-stone-200'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white mx-auto transition-transform ${product.active ? 'translate-x-2' : '-translate-x-2'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
