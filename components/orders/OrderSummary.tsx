'use client'

import { useOrderStore, cartKey } from '@/store/orderStore'
import { formatPrice } from '@/lib/utils'

interface OrderSummaryProps {
  onSubmit: () => void
  submitting?: boolean
  label?: string
}

export function OrderSummary({ onSubmit, submitting, label }: OrderSummaryProps) {
  const { items, tableCode, updateItemQty, removeItem, total } = useOrderStore()

  if (!items.length) return null

  return (
    <div
      className="border-t border-white/8"
      style={{ background: '#0D2226', boxShadow: '0 -12px 40px rgba(0,0,0,0.4)' }}
    >
      {/* Items list */}
      <div className="px-4 pt-3 max-h-36 overflow-y-auto space-y-2 scrollbar-hide">
        {items.map((item) => {
          const key = cartKey(item)
          const modPrice = item.modifiers.reduce((s, m) => s + m.price, 0)
          return (
            <div key={key} className="flex items-center gap-2 fade-in">
              {/* Qty controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => updateItemQty(key, -1)}
                  className="w-7 h-7 rounded-full bg-white/10 border border-white/10 text-white text-sm font-bold flex items-center justify-center press-scale"
                >−</button>
                <span className="w-5 text-center text-sm font-bold text-white">{item.quantity}</span>
                <button
                  onClick={() => updateItemQty(key, 1)}
                  className="w-7 h-7 rounded-full bg-white/15 text-white text-sm font-bold flex items-center justify-center press-scale"
                >+</button>
              </div>

              {/* Name + modifiers */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 truncate font-medium">{item.productName}</p>
                {item.modifiers.length > 0 && (
                  <p className="text-[10px] text-white/30 truncate mt-0.5">
                    {item.modifiers.map((m) => m.name).join(' · ')}
                  </p>
                )}
              </div>

              {/* Price */}
              <span className="text-sm font-semibold text-white/80 shrink-0">
                {formatPrice((item.unitPrice + modPrice) * item.quantity)}
              </span>

              {/* Remove */}
              <button
                onClick={() => removeItem(key)}
                className="w-6 h-6 flex items-center justify-center rounded-full text-white/25 hover:bg-white/10 hover:text-[#C46F4E] transition-all text-base shrink-0 press-scale"
              >×</button>
            </div>
          )
        })}
      </div>

      {/* CTA bar */}
      <div className="px-4 pt-3 pb-5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/30 font-medium truncate">
            {tableCode ? `Mesa ${tableCode}` : 'Para llevar'} · {items.length} producto{items.length > 1 ? 's' : ''}
          </p>
          <p className="text-xl font-bold text-white tracking-tight leading-tight">{formatPrice(total())}</p>
        </div>

        <button
          onClick={onSubmit}
          disabled={submitting}
          className="bg-[#F5F1E8] disabled:opacity-50 text-[#0E2F33] font-bold py-3.5 px-6 rounded-2xl text-sm btn-primary shrink-0"
        >
          {submitting ? 'Enviando…' : (label ?? 'Enviar →')}
        </button>
      </div>
    </div>
  )
}
