'use client'

import { useState } from 'react'
import { useModifiers } from '@/hooks/useProducts'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'

interface ModifierSheetProps {
  product: Product
  onAdd: (quantity: number, modifiers: Array<{ modifierId: string; name: string; price: number }>, notes: string) => void
  onClose: () => void
}

export function ModifierSheet({ product, onAdd, onClose }: ModifierSheetProps) {
  const { data: modifiers = [] } = useModifiers()
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')

  const activeModifiers = modifiers.filter((m) => m.modifier_group !== 'note')
  const selectedModList = modifiers.filter((m) => selected.has(m.id))
  const modTotal = selectedModList.reduce((sum, m) => sum + m.price, 0)
  const unitTotal = product.price + modTotal
  const lineTotal = unitTotal * quantity

  function toggleModifier(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleAdd() {
    onAdd(
      quantity,
      selectedModList.map((m) => ({ modifierId: m.id, name: m.name, price: m.price })),
      notes
    )
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3">
          <div>
            <h2 className="font-bold text-lg text-stone-800">{product.name}</h2>
            <p className="text-amber-600 font-semibold">{formatPrice(product.price)}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 text-2xl px-1 -mt-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 space-y-4">
          {/* Quantity */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm font-medium text-stone-700">Cantidad</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-full bg-stone-100 text-stone-700 font-bold text-lg flex items-center justify-center"
              >
                −
              </button>
              <span className="w-6 text-center font-bold text-lg">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-full bg-stone-100 text-stone-700 font-bold text-lg flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Modifiers */}
          {activeModifiers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Modificadores</p>
              <div className="flex flex-wrap gap-2">
                {activeModifiers.map((mod) => (
                  <button
                    key={mod.id}
                    onClick={() => toggleModifier(mod.id)}
                    className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
                      selected.has(mod.id)
                        ? 'bg-amber-500 border-amber-500 text-stone-900'
                        : 'bg-stone-50 border-stone-200 text-stone-700'
                    }`}
                  >
                    {mod.name}
                    {mod.price > 0 && <span className="ml-1 opacity-70">+{formatPrice(mod.price)}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Nota (opcional)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Sin azúcar, extra caliente..."
              rows={2}
              className="w-full bg-stone-50 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
          </div>
        </div>

        {/* Add button */}
        <div className="p-5 pt-3 border-t border-stone-100">
          <button
            onClick={handleAdd}
            className="w-full bg-amber-500 text-stone-900 font-bold py-4 rounded-2xl text-base flex items-center justify-between px-5"
          >
            <span>Agregar {quantity > 1 ? `×${quantity}` : ''}</span>
            <span>{formatPrice(lineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
