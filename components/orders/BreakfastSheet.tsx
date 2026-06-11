'use client'

import { useState } from 'react'
import { useModifiers } from '@/hooks/useProducts'
import { useOrderStore } from '@/store/orderStore'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { AREA_IDS } from '@/lib/constants'
import { FREE_ITEM_ID } from '@/components/orders/FreeItemSheet'
import type { Product, CartItem } from '@/types'

interface BreakfastSheetProps {
  product: Product
  onClose: () => void
}

export function BreakfastSheet({ product, onClose }: BreakfastSheetProps) {
  const { data: allModifiers = [] } = useModifiers()
  const { addItem, activeGuest } = useOrderStore()

  const hasEggChoice = product.name.toLowerCase().includes('huevo')

  const eggMods     = allModifiers.filter((m) => m.modifier_group === 'breakfast_egg'    && m.active !== false)
  const juiceMods   = allModifiers.filter((m) => m.modifier_group === 'breakfast_juice'  && m.active !== false)
  const coffeeMods  = allModifiers.filter((m) => m.modifier_group === 'breakfast_coffee' && m.active !== false)

  const baseCoffee    = coffeeMods.filter((m) => m.price === 0)
  const upgradeCoffee = coffeeMods.filter((m) => m.price > 0)

  const [eggChoice,    setEggChoice]    = useState<string | null>(null)
  const [juiceChoice,  setJuiceChoice]  = useState<string | null>(null)
  const [coffeeChoice, setCoffeeChoice] = useState<string | null>(null)
  const [notes,        setNotes]        = useState('')

  const selectedCoffee = coffeeMods.find((m) => m.id === coffeeChoice)
  const coffeeUpgrade  = selectedCoffee?.price ?? 0
  const total          = product.price + coffeeUpgrade

  const canSubmit =
    (!hasEggChoice || !!eggChoice) &&
    !!juiceChoice &&
    !!coffeeChoice

  function handleAdd() {
    if (!canSubmit) return

    const comboKey   = crypto.randomUUID()
    const juiceName  = juiceMods.find((m) => m.id === juiceChoice)?.name ?? ''
    const coffeeName = selectedCoffee?.name ?? ''
    const eggNote    = hasEggChoice && eggChoice ? allModifiers.find((m) => m.id === eggChoice)?.name : null

    // Kitchen item: food + egg choice in notes
    const kitchenNotes = [
      eggNote ? `Huevos: ${eggNote}` : null,
      coffeeUpgrade > 0 ? `Café: ${coffeeName} +S/${coffeeUpgrade}` : `Café: ${coffeeName}`,
      notes.trim() || null,
    ].filter(Boolean).join(' · ')

    const kitchenItem: CartItem = {
      productId:   product.id,
      productName: product.name,
      quantity:    1,
      unitPrice:   product.price + coffeeUpgrade,
      areaId:      AREA_IDS.KITCHEN,
      areaType:    'kitchen',
      notes:       kitchenNotes || undefined,
      modifiers:   [],
      comboKey,
      comboRole:   'main',
    }

    // Bar item 1: juice
    const juiceItem: CartItem = {
      productId:   FREE_ITEM_ID,
      productName: `Jugo: ${juiceName}`,
      quantity:    1,
      unitPrice:   0,
      areaId:      AREA_IDS.BAR,
      areaType:    'bar',
      notes:       product.name,
      modifiers:   [],
      comboKey,
      comboRole:   'bar_included',
    }

    // Bar item 2: coffee
    const coffeeItem: CartItem = {
      productId:   FREE_ITEM_ID,
      productName: `Café: ${coffeeName}`,
      quantity:    1,
      unitPrice:   0,
      areaId:      AREA_IDS.BAR,
      areaType:    'bar',
      notes:       product.name,
      modifiers:   [],
      comboKey,
      comboRole:   'bar_included',
    }

    // addItem attaches activeGuest automatically to all 3
    addItem(kitchenItem)
    addItem(juiceItem)
    addItem(coffeeItem)
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
            style={{ background: 'rgba(196,111,78,0.15)' }}
          >🍳</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-base font-bold tracking-tight leading-snug">{product.name}</h2>
            <p className="text-white/40 text-xs mt-0.5">Incluye jugo + café · {activeGuest ? `Para ${activeGuest}` : 'Desayuno'}</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/40 shrink-0 press-scale">✕</button>
        </div>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">

          {/* Egg choice */}
          {hasEggChoice && (
            <Section label="Tipo de huevos" required missing={!eggChoice}>
              <div className="flex flex-wrap gap-2">
                {eggMods.map((m) => (
                  <OptionChip
                    key={m.id}
                    label={m.name}
                    selected={eggChoice === m.id}
                    onSelect={() => setEggChoice(m.id)}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Juice */}
          <Section label="Jugo incluido" required missing={!juiceChoice}>
            <div className="flex flex-wrap gap-2">
              {juiceMods.map((m) => (
                <OptionChip
                  key={m.id}
                  label={m.name}
                  selected={juiceChoice === m.id}
                  onSelect={() => setJuiceChoice(m.id)}
                />
              ))}
            </div>
          </Section>

          {/* Coffee */}
          <Section label="Café incluido" required missing={!coffeeChoice}>
            {baseCoffee.length > 0 && (
              <div className="mb-3">
                <p className="text-white/25 text-[10px] font-bold uppercase tracking-widest mb-2">Base · sin cargo</p>
                <div className="flex flex-wrap gap-2">
                  {baseCoffee.map((m) => (
                    <OptionChip
                      key={m.id}
                      label={m.name}
                      selected={coffeeChoice === m.id}
                      onSelect={() => setCoffeeChoice(m.id)}
                    />
                  ))}
                </div>
              </div>
            )}
            {upgradeCoffee.length > 0 && (
              <div>
                <p className="text-[#C46F4E]/70 text-[10px] font-bold uppercase tracking-widest mb-2">Con leche · +S/ 2</p>
                <div className="flex flex-wrap gap-2">
                  {upgradeCoffee.map((m) => (
                    <OptionChip
                      key={m.id}
                      label={m.name}
                      price={m.price}
                      selected={coffeeChoice === m.id}
                      onSelect={() => setCoffeeChoice(m.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Notes */}
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2.5">Observaciones</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin azúcar, pan aparte, jugo sin hielo…"
              rows={2}
              className="w-full bg-white/6 border border-white/8 focus:border-white/20 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none placeholder:text-white/25 transition-all"
            />
          </div>

          {/* Price breakdown */}
          <div className="bg-white/4 border border-white/8 rounded-2xl px-4 py-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-white/50">{product.name}</span>
              <span className="text-white/70 font-medium">{formatPrice(product.price)}</span>
            </div>
            {coffeeUpgrade > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-[#C46F4E]/80">Café con leche</span>
                <span className="text-[#C46F4E] font-medium">+{formatPrice(coffeeUpgrade)}</span>
              </div>
            )}
            <div className="h-px bg-white/8 my-1" />
            <div className="flex justify-between">
              <span className="text-white/60 text-sm font-semibold">Total</span>
              <span className="text-white font-bold text-lg">{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleAdd}
            disabled={!canSubmit}
            className="w-full bg-[#F5F1E8] disabled:opacity-35 text-[#0F2018] font-bold py-4 rounded-2xl text-base flex items-center justify-between px-5 btn-primary"
          >
            <span>Agregar desayuno</span>
            <span className="text-[#C46F4E] font-bold">{formatPrice(total)}</span>
          </button>
          {!canSubmit && (
            <p className="text-white/25 text-xs text-center mt-2">
              {!juiceChoice ? 'Elige un jugo' : !coffeeChoice ? 'Elige un café' : 'Elige tipo de huevos'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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
          <span className="text-[10px] font-bold text-[#C46F4E]/70 bg-[#C46F4E]/10 px-2 py-0.5 rounded-full">requerido</span>
        )}
      </div>
      {children}
    </div>
  )
}

function OptionChip({ label, price, selected, onSelect }: {
  label: string
  price?: number
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
      {price !== undefined && price > 0 && (
        <span className={cn('ml-1.5 text-xs font-bold', selected ? 'text-[#C46F4E]' : 'text-white/30')}>
          +{formatPrice(price)}
        </span>
      )}
    </button>
  )
}
