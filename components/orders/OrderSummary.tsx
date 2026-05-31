'use client'

import { useOrderStore, cartKey } from '@/store/orderStore'
import { FREE_ITEM_ID } from '@/components/orders/FreeItemSheet'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { CartItem } from '@/types'

interface OrderSummaryProps {
  onSubmit: () => void
  submitting?: boolean
  label?: string
}

// Group items by guestName. Items with no guest go into the '' (empty) bucket.
function groupByGuest(items: CartItem[]): Map<string, CartItem[]> {
  const map = new Map<string, CartItem[]>()
  for (const item of items) {
    const key = item.guestName ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

function ItemRow({ item, onQty, onRemove }: {
  item: CartItem
  onQty: (delta: number) => void
  onRemove: () => void
}) {
  const modPrice = item.modifiers.reduce((s, m) => s + m.price, 0)
  const isFree   = item.productId === FREE_ITEM_ID

  return (
    <div className="flex items-center gap-2 fade-in">
      {/* Qty controls */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onQty(-1)}
          className="w-7 h-7 rounded-full bg-white/10 border border-white/10 text-white text-sm font-bold flex items-center justify-center press-scale"
        >−</button>
        <span className="w-5 text-center text-sm font-bold text-white">{item.quantity}</span>
        <button
          onClick={() => onQty(1)}
          className="w-7 h-7 rounded-full bg-white/15 text-white text-sm font-bold flex items-center justify-center press-scale"
        >+</button>
      </div>

      {/* Name + modifiers */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate font-medium', isFree ? 'text-[#EAD9B1]/80' : 'text-white/90')}>
          {isFree ? '✦ ' : ''}{item.productName}
        </p>
        {item.modifiers.length > 0 && (
          <p className="text-[10px] text-white/30 truncate mt-0.5">
            {item.modifiers.map((m) => m.name).join(' · ')}
          </p>
        )}
      </div>

      {/* Price */}
      <span className="text-sm font-semibold text-white/80 shrink-0">
        {item.unitPrice + modPrice === 0 ? (
          <span className="text-white/25 text-xs">sin cargo</span>
        ) : (
          formatPrice((item.unitPrice + modPrice) * item.quantity)
        )}
      </span>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center rounded-full text-white/25 hover:bg-white/10 hover:text-[#C46F4E] transition-all text-base shrink-0 press-scale"
      >×</button>
    </div>
  )
}

export function OrderSummary({ onSubmit, submitting, label }: OrderSummaryProps) {
  const { items, tableCode, guests, updateItemQty, removeItem, total } = useOrderStore()

  if (!items.length) return null

  const hasGuests = guests.length > 0
  const grouped   = hasGuests ? groupByGuest(items) : null

  return (
    <div
      className="border-t border-white/8"
      style={{ background: '#0D2226', boxShadow: '0 -12px 40px rgba(0,0,0,0.4)' }}
    >
      {/* Items list */}
      <div className="px-4 pt-3 max-h-44 overflow-y-auto space-y-2 scrollbar-hide">

        {hasGuests && grouped ? (
          // ── Grouped by guest ──────────────────────────────────────────────
          [...grouped.entries()].map(([guest, gItems]) => (
            <div key={guest || '__none__'}>
              {/* Guest header */}
              <div className="flex items-center gap-2 mb-1.5 mt-1 first:mt-0">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  {guest || 'Sin asignar'}
                </span>
                <div className="flex-1 h-px bg-white/8" />
              </div>
              {gItems.map((item) => {
                const key = cartKey(item)
                return (
                  <ItemRow
                    key={key}
                    item={item}
                    onQty={(d) => updateItemQty(key, d)}
                    onRemove={() => removeItem(key)}
                  />
                )
              })}
            </div>
          ))
        ) : (
          // ── Flat list (no guests) ─────────────────────────────────────────
          items.map((item) => {
            const key = cartKey(item)
            return (
              <ItemRow
                key={key}
                item={item}
                onQty={(d) => updateItemQty(key, d)}
                onRemove={() => removeItem(key)}
              />
            )
          })
        )}
      </div>

      {/* CTA bar */}
      <div className="px-4 pt-3 pb-5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/30 font-medium truncate">
            {tableCode ? `Mesa ${tableCode}` : 'Para llevar'}
            {hasGuests && ` · ${guests.length} personas`}
            {!hasGuests && ` · ${items.length} producto${items.length > 1 ? 's' : ''}`}
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
