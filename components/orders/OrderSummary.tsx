'use client'

import { useOrderStore } from '@/store/orderStore'
import { formatPrice } from '@/lib/utils'

interface OrderSummaryProps {
  onSubmit: () => void
  submitting?: boolean
}

export function OrderSummary({ onSubmit, submitting }: OrderSummaryProps) {
  const { items, tableCode, updateItemQty, removeItem, total } = useOrderStore()

  if (!items.length) return null

  const barItems = items.filter((i) => i.areaType === 'bar')
  const kitchenItems = items.filter((i) => i.areaType === 'kitchen')

  return (
    <div className="bg-white border-t border-stone-200 shadow-xl">
      {/* Summary toggle header */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div>
          <span className="font-bold text-stone-800">Mesa {tableCode}</span>
          <span className="text-stone-400 text-sm ml-2">· {items.length} producto{items.length > 1 ? 's' : ''}</span>
        </div>
        <span className="font-bold text-amber-600 text-lg">{formatPrice(total())}</span>
      </div>

      {/* Items list */}
      <div className="px-4 pb-2 max-h-40 overflow-y-auto space-y-1">
        {items.map((item) => (
          <div key={item.productId} className="flex items-center gap-2 py-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateItemQty(item.productId, -1)}
                className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 text-sm flex items-center justify-center"
              >
                −
              </button>
              <span className="w-5 text-center text-sm font-semibold">{item.quantity}</span>
              <button
                onClick={() => updateItemQty(item.productId, 1)}
                className="w-6 h-6 rounded-full bg-stone-100 text-stone-700 text-sm flex items-center justify-center"
              >
                +
              </button>
            </div>
            <span className="flex-1 text-sm text-stone-700 truncate">{item.productName}</span>
            {item.modifiers.length > 0 && (
              <span className="text-xs text-stone-400 truncate max-w-[80px]">
                {item.modifiers.map((m) => m.name).join(', ')}
              </span>
            )}
            <span className="text-sm font-medium text-amber-600 shrink-0">
              {formatPrice((item.unitPrice + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.quantity)}
            </span>
            <button
              onClick={() => removeItem(item.productId)}
              className="text-stone-300 hover:text-red-400 text-sm ml-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* Send button */}
      <div className="px-4 pb-4 pt-2">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-between px-5"
        >
          <span>{submitting ? 'Enviando...' : 'Enviar pedido'}</span>
          <span>{formatPrice(total())}</span>
        </button>
      </div>
    </div>
  )
}
