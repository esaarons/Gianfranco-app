'use client'

import { useState, useMemo } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { useOrderStore } from '@/store/orderStore'
import { AREA_IDS } from '@/lib/constants'
import { FREE_ITEM_ID } from '@/components/orders/FreeItemSheet'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Product, CartItem } from '@/types'

export type BrunchType = 'brunch_49' | 'brunch_39'

interface BrunchSheetProps {
  brunchType: BrunchType
  onClose: () => void
}

export function BrunchSheet({ brunchType, onClose }: BrunchSheetProps) {
  const { data: products = [] } = useProducts()
  const addItem    = useOrderStore((s) => s.addItem)
  const activeGuest = useOrderStore((s) => s.activeGuest)

  const price = brunchType === 'brunch_49' ? 49 : 39

  const drinkProducts = useMemo(() =>
    products
      .filter((p) => p.active && p.primary_area?.type === 'bar')
      .sort((a, b) => a.sort_order - b.sort_order),
    [products]
  )

  const foodProducts = useMemo(() =>
    products.filter((p) => p.active && (
      p.name.toLowerCase().includes('tostón') ||
      p.name.toLowerCase().includes('toston') ||
      p.name.toLowerCase().includes('sándwich') ||
      p.name.toLowerCase().includes('sandwich')
    )),
    [products]
  )

  const dessertProducts = useMemo(() =>
    products.filter((p) => p.active && (
      p.name.toLowerCase().includes('alfajor') ||
      p.name.toLowerCase().includes('galleta') ||
      p.name.toLowerCase().includes('chocopecana')
    )),
    [products]
  )

  const drinksByCategory = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of drinkProducts) {
      const cat = p.category?.name ?? 'Bebidas'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    }
    return map
  }, [drinkProducts])

  const [selectedFood,    setSelectedFood]    = useState<Product | null>(null)
  const [selectedDrink,   setSelectedDrink]   = useState<Product | null>(null)
  const [selectedDessert, setSelectedDessert] = useState<Product | null>(null)

  const canSubmit =
    !!selectedFood &&
    !!selectedDrink &&
    (brunchType === 'brunch_39' || !!selectedDessert)

  function handleAdd() {
    if (!canSubmit) return

    const comboKey    = crypto.randomUUID()
    const brunchLabel = brunchType === 'brunch_49' ? 'Brunch S/49' : 'Brunch S/39'

    const kitchenNotes = [
      selectedFood!.name,
      brunchType === 'brunch_49' && selectedDessert ? selectedDessert.name : null,
    ].filter(Boolean).join(' · ')

    const kitchenItem: CartItem = {
      productId:   FREE_ITEM_ID,
      productName: brunchLabel,
      quantity:    1,
      unitPrice:   price,
      areaId:      AREA_IDS.KITCHEN,
      areaType:    'kitchen',
      notes:       kitchenNotes || undefined,
      modifiers:   [],
      comboKey,
      comboRole:   'main',
    }

    const barItem: CartItem = {
      productId:   FREE_ITEM_ID,
      productName: selectedDrink!.name,
      quantity:    1,
      unitPrice:   0,
      areaId:      AREA_IDS.BAR,
      areaType:    'bar',
      notes:       brunchLabel,
      modifiers:   [],
      comboKey,
      comboRole:   'bar_included',
    }

    addItem(kitchenItem)
    addItem(barItem)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[10px]" onClick={onClose} />

      <div
        className="relative w-full max-w-lg mx-auto max-h-[92dvh] flex flex-col spring-up rounded-t-[2rem] overflow-hidden"
        style={{ background: '#0D2226', borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-3 shrink-0">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(200,145,58,0.15)' }}
          >
            ☕
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-base font-bold tracking-tight">
              {brunchType === 'brunch_49' ? 'Brunch S/49' : 'Brunch S/39'}
            </h2>
            <p className="text-white/40 text-xs mt-0.5">
              {brunchType === 'brunch_49' ? 'Bebida + comida + postre' : 'Bebida + comida'}
              {activeGuest ? ` · Para ${activeGuest}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/40 shrink-0 press-scale"
          >
            ✕
          </button>
        </div>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">

          {/* Food choice */}
          <Section label="Comida" required missing={!selectedFood}>
            <div className="flex flex-wrap gap-2">
              {foodProducts.length === 0
                ? <p className="text-white/25 text-xs">Sin productos disponibles</p>
                : foodProducts.map((p) => (
                    <OptionChip
                      key={p.id}
                      label={p.name}
                      selected={selectedFood?.id === p.id}
                      onSelect={() => setSelectedFood(p)}
                    />
                  ))
              }
            </div>
          </Section>

          {/* Drink choice — grouped by category */}
          <Section label="Bebida" required missing={!selectedDrink}>
            {drinksByCategory.size === 0 ? (
              <p className="text-white/25 text-xs">Sin bebidas disponibles</p>
            ) : (
              Array.from(drinksByCategory.entries()).map(([cat, catProducts]) => (
                <div key={cat} className="mb-4">
                  <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-2">
                    {catProducts.map((p) => (
                      <OptionChip
                        key={p.id}
                        label={p.name}
                        selected={selectedDrink?.id === p.id}
                        onSelect={() => setSelectedDrink(p)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </Section>

          {/* Dessert — only for brunch_49 */}
          {brunchType === 'brunch_49' && (
            <Section label="Postre" required missing={!selectedDessert}>
              <div className="flex flex-wrap gap-2">
                {dessertProducts.length === 0
                  ? <p className="text-white/25 text-xs">Sin postres disponibles</p>
                  : dessertProducts.map((p) => (
                      <OptionChip
                        key={p.id}
                        label={p.name}
                        selected={selectedDessert?.id === p.id}
                        onSelect={() => setSelectedDessert(p)}
                      />
                    ))
                }
              </div>
            </Section>
          )}

          {/* Price summary */}
          <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-3 space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm">
                {brunchType === 'brunch_49' ? 'Brunch S/49' : 'Brunch S/39'}
              </span>
              <span className="text-white font-bold text-lg">{formatPrice(price)}</span>
            </div>
            {selectedDrink && (
              <p className="text-white/30 text-xs">Bebida: {selectedDrink.name} (incluida)</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleAdd}
            disabled={!canSubmit}
            className="w-full bg-[#F5F1E8] disabled:opacity-35 text-[#0F2018] font-bold py-4 rounded-2xl text-base flex items-center justify-between px-5 btn-primary"
          >
            <span>Agregar brunch</span>
            <span className="font-bold">{formatPrice(price)}</span>
          </button>
          {!canSubmit && (
            <p className="text-white/25 text-xs text-center mt-2">
              {!selectedFood ? 'Elige la comida' : !selectedDrink ? 'Elige la bebida' : 'Elige el postre'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ label, required, missing, children }: {
  label: string
  required?: boolean
  missing?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">{label}</p>
        {required && missing && (
          <span className="text-[10px] font-bold text-[#C8913A]/70 bg-[#C8913A]/10 px-2 py-0.5 rounded-full">
            requerido
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function OptionChip({ label, selected, onSelect }: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 border press-scale',
        selected
          ? 'bg-[#F5F1E8] border-[#F5F1E8] text-[#0F2018]'
          : 'bg-white/6 border-white/10 text-white/55 hover:border-white/20 hover:text-white/80'
      )}
      style={selected ? { boxShadow: '0 0 16px rgba(245,241,232,0.2)' } : undefined}
    >
      {label}
    </button>
  )
}
