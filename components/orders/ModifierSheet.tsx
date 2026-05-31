'use client'

import { useState } from 'react'
import { useModifiers } from '@/hooks/useProducts'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface ModifierSheetProps {
  product: Product
  onAdd: (quantity: number, modifiers: Array<{ modifierId: string; name: string; price: number }>, notes: string) => void
  onClose: () => void
}

const CATEGORY_GROUPS: Record<string, string[]> = {
  'Espresso Bar':     ['temperature', 'milk_cow', 'milk_plant', 'cafe_extra'],
  'Brew Bar':         ['temperature', 'milk_cow', 'milk_plant', 'cafe_extra'],
  'Cold Drinks':      ['milk_cow', 'milk_plant'],
  'Matcha Bar':       ['temperature', 'milk_cow', 'milk_plant'],
  'Specialty Lattes': ['temperature', 'milk_cow', 'milk_plant'],
  'Jugos':            [],
  'Jugos / Refresh':  [],
  'Refresh':          [],
  'Postres':          [],
  'Vitrina':          [],
  'Tostones':         ['kitchen_extra'],
  'Sandwiches':       ['kitchen_extra'],
  'Quiche':           ['kitchen_extra'],
  'Ensaladas':        ['kitchen_extra'],
  'Pastas':           ['kitchen_extra'],
  'Pizzas':           ['kitchen_extra'],
  'Smoothie Bowls':   ['kitchen_extra', 'bowl_extra'],
  // New categories
  'Infusiones':       [],
  'Helados':          [],   // handled by IceCreamSheet — no modifiers here
}

const GROUP_LABELS: Record<string, string> = {
  temperature:   'Temperatura',
  milk_cow:      'Leche',
  milk_plant:    'Leche vegetal',
  cafe_extra:    'Extras café',
  kitchen_extra: 'Adiciones',
  bowl_extra:    'Toppings',
}

const GROUP_BADGE: Record<string, string> = {
  milk_plant: '+S/ 3.00',
}

// Icon per category for the header
const CAT_ICON: Record<string, string> = {
  'Espresso Bar': '☕', 'Brew Bar': '♨', 'Cold Drinks': '🧊',
  'Matcha Bar': '🍵', 'Specialty Lattes': '🥛', 'Jugos': '🍊',
  'Jugos / Refresh': '🍋', 'Refresh': '🍋', 'Tostones': '🥑',
  'Sandwiches': '🥪', 'Quiche': '🥧', 'Ensaladas': '🥗',
  'Pastas': '🍝', 'Pizzas': '🍕', 'Postres': '🍰',
  'Smoothie Bowls': '🫐', 'Vitrina': '🥐',
  'Infusiones': '🫖', 'Helados': '🍦',
}

export function ModifierSheet({ product, onAdd, onClose }: ModifierSheetProps) {
  const { data: allModifiers = [] } = useModifiers()
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notes, setNotes]       = useState('')

  const categoryName  = product.category?.name ?? ''
  const allowedGroups = CATEGORY_GROUPS[categoryName] ?? (
    product.primary_area?.type === 'bar'
      ? ['temperature', 'milk_cow', 'milk_plant', 'cafe_extra']
      : ['kitchen_extra']
  )

  const visibleModifiers = allModifiers.filter(
    (m) => m.active !== false && allowedGroups.includes(m.modifier_group ?? '')
  )
  const groups = allowedGroups.filter((g) => visibleModifiers.some((m) => m.modifier_group === g))

  const selectedMods = allModifiers.filter((m) => selected.has(m.id))
  const modTotal     = selectedMods.reduce((s, m) => s + m.price, 0)
  const lineTotal    = (product.price + modTotal) * quantity

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAdd() {
    onAdd(
      quantity,
      selectedMods.map((m) => ({ modifierId: m.id, name: m.name, price: m.price })),
      notes
    )
    onClose()
  }

  const catIcon = CAT_ICON[categoryName] ?? '•'

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[10px]" onClick={onClose} />

      <div
        className="relative w-full max-w-lg mx-auto max-h-[90dvh] flex flex-col spring-up rounded-t-[2rem] overflow-hidden"
        style={{ background: '#0D2226', borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-3 shrink-0">
          {/* Category icon badge */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            {catIcon}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-white text-base font-bold tracking-tight leading-snug">{product.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-white/70 font-bold text-sm">{formatPrice(product.price)}</span>
              <span className="text-white/25 text-xs">· {categoryName}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/40 shrink-0 press-scale"
          >✕</button>
        </div>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">

          {/* Quantity */}
          <div className="flex items-center justify-between bg-white/6 border border-white/8 rounded-2xl px-4 py-3.5">
            <span className="text-white/60 text-sm font-semibold">Cantidad</span>
            <div className="flex items-center gap-5">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white font-bold text-xl flex items-center justify-center press-scale disabled:opacity-30"
                disabled={quantity === 1}
              >−</button>
              <span className="w-6 text-center font-bold text-xl text-white tabular-nums">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-full bg-[#F5F1E8] text-[#0E2F33] font-bold text-xl flex items-center justify-center press-scale"
              >+</button>
            </div>
          </div>

          {/* Modifier groups */}
          {groups.map((group) => {
            const mods  = visibleModifiers.filter((m) => m.modifier_group === group)
            const badge = GROUP_BADGE[group]
            return (
              <div key={group}>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {GROUP_LABELS[group] ?? group}
                  </p>
                  {badge && (
                    <span className="text-[10px] font-bold text-[#C46F4E] bg-[#C46F4E]/15 px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                  {group === 'milk_cow' && (
                    <span className="text-[10px] text-[#A7B897]/70 font-medium">sin costo</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {mods.map((mod) => {
                    const on = selected.has(mod.id)
                    return (
                      <button
                        key={mod.id}
                        onClick={() => toggle(mod.id)}
                        className={cn(
                          'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border press-scale',
                          on
                            ? 'bg-[#F5F1E8] border-[#F5F1E8] text-[#0E2F33]'
                            : 'bg-white/6 border-white/10 text-white/55 hover:border-white/20 hover:text-white/80'
                        )}
                        style={on ? { boxShadow: '0 0 16px rgba(245,241,232,0.2)' } : undefined}
                      >
                        {mod.name}
                        {mod.price > 0 && (
                          <span className={cn('ml-1.5 text-xs font-bold', on ? 'text-[#C46F4E]' : 'text-white/30')}>
                            +{formatPrice(mod.price)}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Note */}
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2.5">Nota para cocina / barra</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin azúcar, extra caliente, alergia a nueces…"
              rows={2}
              className="w-full bg-white/6 border border-white/8 focus:border-white/20 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none placeholder:text-white/25 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-5 pb-8 pt-3 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={handleAdd}
            className="w-full bg-[#F5F1E8] text-[#0E2F33] font-bold py-4 rounded-2xl text-base flex items-center justify-between px-5 btn-primary"
          >
            <span>
              Agregar{quantity > 1 ? ` ×${quantity}` : ''}
            </span>
            <span className="text-[#C46F4E] font-bold">{formatPrice(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
