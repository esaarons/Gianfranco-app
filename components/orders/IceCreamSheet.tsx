'use client'

import { useState } from 'react'
import { useModifiers } from '@/hooks/useProducts'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'

interface IceCreamSheetProps {
  product: Product
  onAdd: (quantity: number, modifiers: Array<{ modifierId: string; name: string; price: number }>, notes: string) => void
  onClose: () => void
}

export function IceCreamSheet({ product, onAdd, onClose }: IceCreamSheetProps) {
  const { data: allModifiers = [] } = useModifiers()

  const maxScoops = product.name.includes('2 bolas') ? 2 : 1
  const flavors   = allModifiers.filter((m) => m.modifier_group === 'ice_cream_flavor' && m.active !== false)

  const [flavor1, setFlavor1] = useState<string | null>(null)
  const [flavor2, setFlavor2] = useState<string | null>(null)
  const [notes,   setNotes]   = useState('')

  const canSubmit = !!flavor1 && (maxScoops === 1 || !!flavor2)

  function handleAdd() {
    if (!canSubmit) return

    const mods: Array<{ modifierId: string; name: string; price: number }> = []
    const f1 = flavors.find((m) => m.id === flavor1)
    if (f1) mods.push({ modifierId: f1.id, name: f1.name, price: 0 })
    if (maxScoops === 2) {
      const f2 = flavors.find((m) => m.id === flavor2)
      if (f2) mods.push({ modifierId: f2.id, name: f2.name, price: 0 })
    }

    onAdd(1, mods, notes)
    onClose()
  }

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
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(94,74,122,0.2)' }}
          >🍦</div>
          <div className="flex-1 min-w-0">
            <h2 className="text-white text-base font-bold tracking-tight">{product.name}</h2>
            <p className="text-white/40 text-xs mt-0.5">
              {maxScoops === 1 ? 'Elige 1 sabor' : 'Elige hasta 2 sabores'}
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/40 shrink-0 press-scale">✕</button>
        </div>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">

          {/* Flavor 1 */}
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">
              {maxScoops === 1 ? 'Sabor' : 'Sabor 1'}
              {!flavor1 && <span className="ml-2 text-[#C46F4E]/70 bg-[#C46F4E]/10 px-2 py-0.5 rounded-full normal-case">requerido</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {flavors.map((m) => (
                <FlavorChip
                  key={m.id}
                  name={m.name}
                  selected={flavor1 === m.id}
                  onSelect={() => setFlavor1(m.id)}
                />
              ))}
            </div>
          </div>

          {/* Flavor 2 (only for 2 scoops) */}
          {maxScoops === 2 && (
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-3">
                Sabor 2
                {!flavor2 && <span className="ml-2 text-[#C46F4E]/70 bg-[#C46F4E]/10 px-2 py-0.5 rounded-full normal-case">requerido</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {flavors.map((m) => (
                  <FlavorChip
                    key={m.id}
                    name={m.name}
                    selected={flavor2 === m.id}
                    onSelect={() => setFlavor2(m.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2.5">Nota</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin decoración, para llevar…"
              rows={2}
              className="w-full bg-white/6 border border-white/8 focus:border-white/20 rounded-xl px-4 py-3 text-sm text-white outline-none resize-none placeholder:text-white/25 transition-all"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            onClick={handleAdd}
            disabled={!canSubmit}
            className="w-full bg-[#F5F1E8] disabled:opacity-35 text-[#0F2018] font-bold py-4 rounded-2xl text-base flex items-center justify-between px-5 btn-primary"
          >
            <span>Agregar</span>
            <span className="text-[#C46F4E] font-bold">{formatPrice(product.price)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function FlavorChip({ name, selected, onSelect }: {
  name: string
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
      {name}
    </button>
  )
}
