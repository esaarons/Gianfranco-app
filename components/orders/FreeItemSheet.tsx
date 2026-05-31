'use client'

import { useState } from 'react'
import { AREA_IDS } from '@/lib/constants'

interface FreeItemSheetProps {
  onAdd: (name: string, price: number) => void
  onClose: () => void
}

// Common quick-picks for free/operational items at a café
const QUICK_ITEMS = [
  'Agua caliente extra',
  'Cubiertos adicionales',
  'Decoración cumpleaños',
  'Canasta de pan',
  'Salsa adicional',
  'Observación especial',
]

export function FreeItemSheet({ onAdd, onClose }: FreeItemSheetProps) {
  const [name,  setName]  = useState('')
  const [price, setPrice] = useState('')

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    const parsedPrice = parseFloat(price.replace(',', '.')) || 0
    onAdd(trimmed, parsedPrice)
    onClose()
  }

  function handleQuick(label: string) {
    setName(label)
  }

  return (
    <>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[6px]" onClick={onClose} />

      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-[2rem] flex flex-col spring-up"
        style={{ background: '#0D2226', borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 shrink-0">
          <div>
            <h2 className="text-white text-base font-bold tracking-tight">Pedido libre</h2>
            <p className="text-white/30 text-xs mt-0.5">Observaciones, extras o solicitudes especiales</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/50 press-scale">
            ✕
          </button>
        </div>

        <div className="px-5 pb-8 space-y-4">

          {/* Quick picks */}
          <div className="flex flex-wrap gap-2">
            {QUICK_ITEMS.map((item) => (
              <button
                key={item}
                onClick={() => handleQuick(item)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all press-scale
                  ${name === item
                    ? 'bg-[#F5F1E8] text-[#0E2F33] border-transparent'
                    : 'bg-white/6 text-white/50 border-white/10 hover:bg-white/10'}`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Description input */}
          <div className="space-y-1.5">
            <label className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
              Descripción
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Agua caliente sin cargo"
              className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-xl px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all"
              autoFocus
            />
          </div>

          {/* Price input (optional) */}
          <div className="space-y-1.5">
            <label className="text-white/30 text-[10px] font-bold uppercase tracking-widest">
              Precio opcional
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-semibold">S/</span>
              <input
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/8 border border-white/10 focus:border-white/25 rounded-xl pl-10 pr-4 py-3 text-sm text-white outline-none placeholder:text-white/25 transition-all"
              />
            </div>
            <p className="text-white/20 text-[10px]">Deja en 0 si no tiene costo (agua, cubiertos, etc.)</p>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="w-full bg-[#F5F1E8] text-[#0E2F33] font-bold py-4 rounded-2xl text-sm btn-primary disabled:opacity-40"
          >
            Agregar al pedido
          </button>
        </div>
      </div>
    </>
  )
}

// Export the FREE_ITEM product ID constant so callers can identify free items
export const FREE_ITEM_ID = 'FREE_ITEM'

// Build a CartItem from free item inputs
export function buildFreeCartItem(name: string, price: number) {
  return {
    productId:   FREE_ITEM_ID,
    productName: name,
    quantity:    1,
    unitPrice:   price,
    areaId:      AREA_IDS.BAR,   // routed to bar by default; bar staff sees it as a note
    areaType:    'bar' as const,
    notes:       name,            // notes = description for DB storage
    modifiers:   [] as Array<{ modifierId: string; name: string; price: number }>,
  }
}
