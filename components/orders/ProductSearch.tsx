'use client'

import { useState, useMemo } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

const CATEGORIES = [
  'Todos', 'Favoritos', 'Café', 'Matcha', 'Bebidas Frías', 'Specialty Lattes',
  'Jugos / Refresh', 'Tostones', 'Sandwiches', 'Pizzas', 'Postres',
  'Pastas / Ensaladas', 'Smoothie Bowls', 'Otros',
]

interface ProductSearchProps {
  onSelect: (product: Product) => void
}

export function ProductSearch({ onSelect }: ProductSearchProps) {
  const { data: products = [] } = useProducts()
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('Todos')

  const filtered = useMemo(() => {
    let list = products
    if (activeCategory === 'Favoritos') {
      list = list.filter((p) => p.is_favorite)
    } else if (activeCategory !== 'Todos') {
      list = list.filter((p) => p.category?.name === activeCategory)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }
    return list
  }, [products, activeCategory, query])

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveCategory('Todos') }}
          placeholder="Buscar producto..."
          className="w-full bg-stone-100 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 px-4 pb-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setQuery('') }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-amber-500 text-stone-900'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {cat === 'Favoritos' ? '⭐ Favoritos' : cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center text-stone-400 py-8 text-sm">Sin resultados</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => onSelect(product)}
                className="bg-white rounded-xl p-3 text-left shadow-sm border border-stone-100 active:scale-95 transition-transform hover:border-amber-300"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-sm font-medium text-stone-800 leading-tight">{product.name}</span>
                  {product.is_favorite && <span className="text-amber-400 text-xs shrink-0">★</span>}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-amber-600 font-bold text-sm">{formatPrice(product.price)}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    product.primary_area?.type === 'bar'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {product.primary_area?.type === 'bar' ? 'Barra' : 'Cocina'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
