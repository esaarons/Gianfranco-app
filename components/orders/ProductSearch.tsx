'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useProducts, useProductsRealtime } from '@/hooks/useProducts'
import { useSetting } from '@/hooks/useSetting'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product } from '@/types'

function isBreakfastAvailable(cutoff: string | null | undefined): boolean {
  const [h, m] = (cutoff ?? '11:30').split(':').map(Number)
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes() <= h * 60 + m
}

// ── Sub-group definitions ─────────────────────────────────────────────────────
const SUBGROUPS: Record<string, Array<{ label: string; match: (name: string) => boolean }>> = {
  'Brew Bar': [
    { label: 'Métodos de preparación', match: (n) => !['Geisha','Marshell','Natural','Lavado','Inkawasi','Chirinos','Coipa'].some((k) => n.includes(k)) },
    { label: 'Cafés de Origen',        match: () => true },
  ],
  'Cold Drinks': [
    { label: 'Cold Brew', match: (n) => !['Frappe','Frappé','Cappushaker'].some((k) => n.includes(k)) },
    { label: 'Frappé',    match: () => true },
  ],
  'Espresso Bar': [
    { label: 'Espresso', match: (n) => ['Espresso','Ristretto','Americano','Cortado','Macchiato','Cappuccino','Flat White'].some((k) => n.includes(k)) },
    { label: 'Lattés',   match: () => true },
  ],
  'Matcha Bar': [
    { label: 'Pure Matcha',   match: (n) => ['Pure','Ceremonial'].some((k) => n.includes(k)) },
    { label: 'Matcha Latte',  match: (n) => ['Latte','Vanilla','Caramel','Hazelnut'].some((k) => n.includes(k)) },
    { label: 'Boost',         match: () => true },
  ],
}

// ── Category config ───────────────────────────────────────────────────────────
const CAT_CONFIG: Record<string, { icon: string; tint: string; chipColor: string }> = {
  'Espresso Bar':       { icon: '☕', tint: 'rgba(139,96,64,0.35)',  chipColor: '#8B6040' },
  'Brew Bar':           { icon: '♨',  tint: 'rgba(122,80,64,0.35)',  chipColor: '#7A5040' },
  'Cold Drinks':        { icon: '🧊', tint: 'rgba(46,107,138,0.35)', chipColor: '#2E6B8A' },
  'Cafés Especiales':   { icon: '✦',  tint: 'rgba(122,92,20,0.35)',  chipColor: '#7A5C14' },
  'Matcha Bar':         { icon: '🍵', tint: 'rgba(61,107,64,0.35)',  chipColor: '#3D6B40' },
  'Matcha':             { icon: '🍵', tint: 'rgba(61,107,64,0.35)',  chipColor: '#3D6B40' },
  'Specialty Lattes':   { icon: '🥛', tint: 'rgba(94,74,122,0.35)', chipColor: '#5E4A7A' },
  'Jugos':              { icon: '🍊', tint: 'rgba(196,111,78,0.35)', chipColor: '#C46F4E' },
  'Jugos / Refresh':    { icon: '🍋', tint: 'rgba(107,138,46,0.35)', chipColor: '#6B8A2E' },
  'Refresh':            { icon: '🍋', tint: 'rgba(107,138,46,0.35)', chipColor: '#6B8A2E' },
  'Tostones':           { icon: '🥑', tint: 'rgba(61,96,64,0.35)',  chipColor: '#3D6040' },
  'Sandwiches':         { icon: '🥪', tint: 'rgba(122,80,48,0.35)', chipColor: '#7A5030' },
  'Quiche':             { icon: '🥧', tint: 'rgba(139,96,48,0.35)', chipColor: '#8B6030' },
  'Ensaladas':          { icon: '🥗', tint: 'rgba(46,107,64,0.35)', chipColor: '#2E6B40' },
  'Pastas':             { icon: '🍝', tint: 'rgba(196,111,78,0.35)', chipColor: '#C46F4E' },
  'Pastas / Ensaladas': { icon: '🍝', tint: 'rgba(139,64,48,0.35)', chipColor: '#8B4030' },
  'Pizzas':             { icon: '🍕', tint: 'rgba(160,56,32,0.35)', chipColor: '#A03820' },
  'Postres':            { icon: '🍰', tint: 'rgba(139,48,96,0.35)', chipColor: '#8B3060' },
  'Smoothie Bowls':     { icon: '🫐', tint: 'rgba(56,64,160,0.35)', chipColor: '#3840A0' },
  'Vitrina':            { icon: '🥐', tint: 'rgba(139,96,32,0.35)', chipColor: '#8B6020' },
  'Café':               { icon: '☕', tint: 'rgba(139,96,64,0.35)',  chipColor: '#8B6040' },
  'Bebidas Frías':      { icon: '🧊', tint: 'rgba(46,107,138,0.35)', chipColor: '#2E6B8A' },
  'Desayunos':          { icon: '🍳', tint: 'rgba(196,111,78,0.35)', chipColor: '#C46F4E' },
  'Infusiones':         { icon: '🫖', tint: 'rgba(61,107,64,0.35)',  chipColor: '#3D6B40' },
  'Helados':            { icon: '🍦', tint: 'rgba(94,74,122,0.35)',  chipColor: '#5E4A7A' },
}
const DEFAULT_CFG = { icon: '•', tint: 'rgba(107,124,133,0.25)', chipColor: '#6B7C85' }

interface ProductSearchProps {
  onSelect: (product: Product) => void
}

export function ProductSearch({ onSelect }: ProductSearchProps) {
  const { data: products = [] }          = useProducts()
  const { data: breakfastCutoff }        = useSetting('breakfast_cutoff')
  const [query, setQuery]                = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const chipRef = useRef<HTMLDivElement>(null)

  useProductsRealtime()

  function handleSelect(product: Product) {
    if (product.stock_status === 'out') {
      toast.error(`Sin stock — ${product.name} (86)`, { description: 'No disponible por el momento' })
      return
    }
    if (product.stock_status === 'low') {
      toast.warning(`Poco stock — ${product.name} (85)`)
    }
    onSelect(product)
  }

  const breakfastAvailable = isBreakfastAvailable(breakfastCutoff)

  const categories = useMemo(() => {
    const map = new Map<string, { name: string; sortOrder: number }>()
    products.forEach((p) => {
      if (p.category && !map.has(p.category.name))
        map.set(p.category.name, { name: p.category.name, sortOrder: p.category.sort_order ?? 99 })
    })
    return [...map.values()].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [products])

  const effectiveCategory = activeCategory ?? categories[0]?.name ?? null

  const favorites = useMemo(
    () => products.filter((p) => p.active && p.is_favorite),
    [products]
  )

  useEffect(() => {
    if (!chipRef.current || !effectiveCategory) return
    const el = chipRef.current.querySelector<HTMLElement>('[data-active="true"]')
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [effectiveCategory])

  const filtered = useMemo(() => {
    const active = products.filter((p) => p.active)
    if (query.trim()) {
      const q = query.toLowerCase()
      return active.filter(
        (p) => p.name.toLowerCase().includes(q) || p.category?.name.toLowerCase().includes(q)
      )
    }
    return active.filter((p) => p.category?.name === effectiveCategory)
  }, [products, effectiveCategory, query])

  const isSearching = query.trim().length > 0

  return (
    <div className="flex flex-col h-full bg-[#0F2018]">

      {/* Search bar */}
      <div className="px-4 pt-3.5 pb-3 shrink-0">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-2xl pl-11 pr-9 py-3.5 text-sm text-white outline-none placeholder:text-white/30 transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 text-xl leading-none transition-colors"
            >×</button>
          )}
        </div>
      </div>

      {/* Favorites row */}
      {!isSearching && favorites.length > 0 && (
        <div className="shrink-0 mb-1">
          <div className="flex items-center gap-2 px-4 pb-2.5">
            <span className="text-[10px] font-bold text-[#EAD9B1]/70 uppercase tracking-widest">⭐ Favoritos</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
            {favorites.map((p) => (
              <div key={p.id} className="w-32 shrink-0">
                <ProductCard product={p} onSelect={handleSelect} isFav />
              </div>
            ))}
            <div className="w-1 shrink-0" />
          </div>
        </div>
      )}

      {/* Category chips */}
      {!isSearching && categories.length > 0 && (
        <div ref={chipRef} className="flex gap-2.5 px-4 pb-3 overflow-x-auto scrollbar-hide shrink-0">
          {categories.map((cat) => {
            const cfg = CAT_CONFIG[cat.name] ?? DEFAULT_CFG
            const active = effectiveCategory === cat.name
            return (
              <button
                key={cat.name}
                data-active={active}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all press-scale',
                  active
                    ? 'bg-[#F5F1E8] text-[#0F2018]'
                    : 'bg-white/8 text-white/45 hover:bg-white/12 border border-white/6'
                )}
              >
                <span className="text-base leading-none">{cfg.icon}</span>
                {cat.name}
              </button>
            )
          })}
        </div>
      )}

      {/* Divider + label */}
      {!isSearching && effectiveCategory && (
        <div className="px-4 pb-2.5 shrink-0 flex items-center gap-2">
          <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">{effectiveCategory}</span>
          <div className="flex-1 h-px bg-white/6" />
          <span className="text-[10px] text-white/20">{filtered.length}</span>
        </div>
      )}

      {/* Product grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-hide">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-4xl mb-3 opacity-40">{isSearching ? '🔍' : '☕'}</p>
            <p className="text-white/30 text-sm font-medium">
              {isSearching ? `Sin resultados para "${query}"` : 'Sin productos'}
            </p>
          </div>
        ) : isSearching ? (
          <div className="space-y-2">
            {filtered.map((p) => <ProductRow key={p.id} product={p} onSelect={handleSelect} />)}
          </div>
        ) : effectiveCategory === 'Desayunos' && !breakfastAvailable ? (
          <BreakfastUnavailable cutoff={breakfastCutoff ?? '11:30'} />
        ) : (
          <CategoryGrid
            products={filtered}
            effectiveCategory={effectiveCategory}
            onSelect={handleSelect}
          />
        )}
      </div>
    </div>
  )
}

// ── Category grid with optional sub-groups ────────────────────────────────────
function CategoryGrid({ products, effectiveCategory, onSelect }: {
  products: Product[]
  effectiveCategory: string | null
  onSelect: (p: Product) => void
}) {
  const defs = effectiveCategory ? SUBGROUPS[effectiveCategory] : undefined

  if (!defs) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {products.map((p) => <ProductCard key={p.id} product={p} onSelect={onSelect} />)}
      </div>
    )
  }

  const buckets: Product[][] = defs.map(() => [])
  const assigned = new Set<string>()
  defs.forEach((def, i) => {
    products.forEach((p) => {
      if (!assigned.has(p.id) && def.match(p.name)) {
        buckets[i].push(p)
        assigned.add(p.id)
      }
    })
  })

  return (
    <div className="space-y-5">
      {defs.map((def, i) => {
        const group = buckets[i]
        if (!group.length) return null
        return (
          <div key={def.label}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold text-white/25 uppercase tracking-widest">{def.label}</span>
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-[10px] text-white/20">{group.length}</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
              {group.map((p) => (
                <div key={p.id} className="w-36 shrink-0">
                  <ProductCard product={p} onSelect={onSelect} />
                </div>
              ))}
              <div className="w-1 shrink-0" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onSelect, isFav }: {
  product: Product
  onSelect: (p: Product) => void
  isFav?: boolean
}) {
  const cfg    = CAT_CONFIG[product.category?.name ?? ''] ?? DEFAULT_CFG
  const isOut  = product.stock_status === 'out'
  const isLow  = product.stock_status === 'low'

  return (
    <button
      onClick={() => onSelect(product)}
      className={cn(
        'relative w-full bg-[#0E2A2E] border border-white/8 rounded-2xl overflow-hidden text-left press-scale transition-all group',
        isOut && 'opacity-50'
      )}
      style={isFav || product.is_favorite
        ? { boxShadow: '0 0 24px rgba(234,217,177,0.12), 0 0 1px rgba(234,217,177,0.3)', borderColor: 'rgba(234,217,177,0.2)' }
        : undefined
      }
    >
      {/* Stock badge */}
      {isOut && (
        <span className="absolute top-2 left-2.5 z-20 text-[9px] font-bold bg-red-500/25 text-red-300 px-1.5 py-0.5 rounded-full border border-red-400/30 leading-tight">86</span>
      )}
      {isLow && (
        <span className="absolute top-2 left-2.5 z-20 text-[9px] font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-400/30 leading-tight">85</span>
      )}

      {/* Icon area */}
      <div
        className="w-full flex items-center justify-center pt-5 pb-4 relative overflow-hidden"
        style={{ background: `radial-gradient(ellipse at 50% 60%, ${cfg.tint} 0%, transparent 75%)` }}
      >
        {product.image_url ? (
          <>
            <img
              src={product.image_url}
              alt={product.name}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 60%, ${cfg.tint} 0%, transparent 75%)` }} />
          </>
        ) : null}
        <span className="text-3xl leading-none relative z-10">{product.image_url ? '' : cfg.icon}</span>
        {(isFav || product.is_favorite) && (
          <span className="absolute top-2 right-2.5 text-[11px] leading-none z-10">⭐</span>
        )}
        {isOut && (
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-[10px] font-bold text-white/50 bg-black/40 px-2 py-1 rounded-lg tracking-wide">SIN STOCK</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pb-3.5 pt-1">
        <p className={cn('text-[11px] font-semibold line-clamp-2 min-h-[2.4rem] leading-snug', isOut ? 'text-white/40' : 'text-white/90')}>
          {product.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span className={cn('text-sm font-bold', isOut ? 'text-white/30' : 'text-white')}>{formatPrice(product.price)}</span>
          <div
            className={cn('w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold add-btn', isOut && 'opacity-30')}
            style={{ background: cfg.chipColor, color: '#fff' }}
          >
            +
          </div>
        </div>
      </div>

      {/* Bottom glow line on hover */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(to right, transparent, ${cfg.chipColor}, transparent)` }}
      />
    </button>
  )
}

// ── Breakfast unavailable state ───────────────────────────────────────────────
function BreakfastUnavailable({ cutoff }: { cutoff: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-5xl mb-4 opacity-50">🍳</p>
      <p className="text-white/50 font-bold text-base mb-1">Desayunos no disponibles</p>
      <p className="text-white/25 text-sm">El servicio de desayunos es hasta las {cutoff} am</p>
    </div>
  )
}

// ── Search result row ─────────────────────────────────────────────────────────
function ProductRow({ product, onSelect }: { product: Product; onSelect: (p: Product) => void }) {
  const cfg   = CAT_CONFIG[product.category?.name ?? ''] ?? DEFAULT_CFG
  const isOut = product.stock_status === 'out'
  const isLow = product.stock_status === 'low'
  return (
    <button
      onClick={() => onSelect(product)}
      className={cn('w-full flex items-center gap-3 bg-[#0E2A2E] border border-white/8 rounded-2xl px-3.5 py-3 press-scale text-left transition-all hover:border-white/15 group', isOut && 'opacity-50')}
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
        style={{ background: `radial-gradient(ellipse at center, ${cfg.tint} 0%, transparent 80%)` }}
      >
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold leading-snug line-clamp-1', isOut ? 'text-white/40' : 'text-white/90')}>{product.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-white/30 text-xs">{product.category?.name}</p>
          {isOut && <span className="text-[9px] font-bold bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full border border-red-400/25">86 · Sin stock</span>}
          {isLow && <span className="text-[9px] font-bold bg-amber-400/15 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-400/25">85 · Poco stock</span>}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={cn('text-sm font-bold', isOut ? 'text-white/30' : 'text-white')}>{formatPrice(product.price)}</span>
        <div
          className={cn('w-7 h-7 rounded-full flex items-center justify-center text-base font-bold add-btn', isOut && 'opacity-30')}
          style={{ background: cfg.chipColor, color: '#fff' }}
        >+</div>
      </div>
    </button>
  )
}
