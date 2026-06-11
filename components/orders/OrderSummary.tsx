'use client'

import { useState } from 'react'
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

// ── Group items by guestName ──────────────────────────────────────────────────
function groupByGuest(items: CartItem[]): Map<string, CartItem[]> {
  const map = new Map<string, CartItem[]>()
  for (const item of items) {
    const key = item.guestName ?? ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

// ── Combo row ─────────────────────────────────────────────────────────────────
function ComboRow({ main, children, onRemove }: {
  main: CartItem; children: CartItem[]; onRemove: () => void
}) {
  const total = main.unitPrice + main.modifiers.reduce((s, m) => s + m.price, 0)
  return (
    <div className="fade-in">
      <div className="flex items-start gap-2">
        <span className="w-5 text-center text-[10px] font-bold text-[#C46F4E]/70 mt-1 shrink-0">🍳</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white/90 leading-snug">{main.productName}</p>
          {children.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {children.map((c, i) => (
                <p key={i} className="text-[10px] text-white/35 leading-snug">↳ {c.productName}</p>
              ))}
            </div>
          )}
        </div>
        <span className="text-sm font-semibold text-white/80 shrink-0 mt-0.5">{formatPrice(total)}</span>
        <button onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-full text-white/25 hover:bg-white/10 hover:text-[#C46F4E] transition-all text-base shrink-0 press-scale mt-0.5">×</button>
      </div>
    </div>
  )
}

// ── Standard item row ─────────────────────────────────────────────────────────
function ItemRow({ item, onQty, onRemove }: {
  item: CartItem; onQty: (d: number) => void; onRemove: () => void
}) {
  const modPrice = item.modifiers.reduce((s, m) => s + m.price, 0)
  const isFree   = item.productId === FREE_ITEM_ID
  return (
    <div className="flex items-center gap-2 fade-in">
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onQty(-1)}
          className="w-7 h-7 rounded-full bg-white/10 border border-white/10 text-white text-sm font-bold flex items-center justify-center press-scale">−</button>
        <span className="w-5 text-center text-sm font-bold text-white">{item.quantity}</span>
        <button onClick={() => onQty(1)}
          className="w-7 h-7 rounded-full bg-white/15 text-white text-sm font-bold flex items-center justify-center press-scale">+</button>
      </div>
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
      <span className="text-sm font-semibold text-white/80 shrink-0">
        {item.unitPrice + modPrice === 0
          ? <span className="text-white/25 text-xs">sin cargo</span>
          : formatPrice((item.unitPrice + modPrice) * item.quantity)}
      </span>
      <button onClick={onRemove}
        className="w-6 h-6 flex items-center justify-center rounded-full text-white/25 hover:bg-white/10 hover:text-[#C46F4E] transition-all text-base shrink-0 press-scale">×</button>
    </div>
  )
}

// ── Items list (combos + standalone) ─────────────────────────────────────────
function ItemsList({ items, onQty, onRemove, onRemoveCombo }: {
  items: CartItem[]
  onQty: (key: string, d: number) => void
  onRemove: (key: string) => void
  onRemoveCombo: (comboKey: string) => void
}) {
  const seenCombos = new Set<string>()
  const comboMap = new Map<string, { main: CartItem; children: CartItem[] }>()
  for (const item of items) {
    if (item.comboKey) {
      if (!comboMap.has(item.comboKey)) comboMap.set(item.comboKey, { main: item, children: [] })
      const g = comboMap.get(item.comboKey)!
      if (item.comboRole === 'main') g.main = item; else g.children.push(item)
    }
  }
  return (
    <>
      {items.map((item) => {
        if (item.comboRole === 'bar_included') return null
        if (item.comboKey) {
          if (seenCombos.has(item.comboKey)) return null
          seenCombos.add(item.comboKey)
          const group = comboMap.get(item.comboKey)!
          return <ComboRow key={item.comboKey} main={group.main} children={group.children} onRemove={() => onRemoveCombo(item.comboKey!)} />
        }
        const key = cartKey(item)
        return <ItemRow key={key} item={item} onQty={(d) => onQty(key, d)} onRemove={() => onRemove(key)} />
      })}
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function OrderSummary({ onSubmit, submitting, label }: OrderSummaryProps) {
  const { items, tableCode, guests, updateItemQty, removeItem, removeCombo, total } = useOrderStore()

  // Count visible lines (combos = 1 line)
  const seenCombos     = new Set(items.filter(i => i.comboKey).map(i => i.comboKey!))
  const standaloneCount = items.filter(i => !i.comboKey).length
  const lineCount      = standaloneCount + seenCombos.size

  // Collapsed by default when there are many items — keeps the search area usable
  const [expanded, setExpanded] = useState(true)

  const hasGuests = guests.length > 0
  const grouped   = hasGuests ? groupByGuest(items) : null

  if (!items.length) return null

  return (
    <div className="border-t border-white/8" style={{ background: '#0D2226', boxShadow: '0 -12px 40px rgba(0,0,0,0.4)' }}>

      {/* ── Toggle bar — always visible ─────────────────────────────────────── */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-2.5 press-scale"
      >
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-medium">
            {lineCount} producto{lineCount !== 1 ? 's' : ''}
            {hasGuests ? ` · ${guests.length} personas` : ''}
          </span>
          {/* Compact item pills when collapsed */}
          {!expanded && lineCount <= 5 && (
            <div className="flex gap-1 overflow-hidden max-w-[180px]">
              {[...new Set(items.filter(i => i.comboRole !== 'bar_included').map(i => i.productName))].slice(0, 4).map((name, i) => (
                <span key={i} className="text-[10px] bg-white/8 text-white/40 px-2 py-0.5 rounded-full truncate max-w-[80px] shrink-0">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-white">{formatPrice(total())}</span>
          <span className={cn(
            'text-white/30 text-xs transition-transform duration-200',
            expanded ? 'rotate-180' : 'rotate-0'
          )}>▲</span>
        </div>
      </button>

      {/* ── Expandable item list ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-4 pb-2 max-h-52 overflow-y-auto space-y-2 scrollbar-hide">
          {hasGuests && grouped ? (
            [...grouped.entries()].map(([guest, gItems]) => (
              <div key={guest || '__none__'}>
                <div className="flex items-center gap-2 mb-1.5 mt-1 first:mt-0">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    {guest || 'Sin asignar'}
                  </span>
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="text-[10px] text-white/25">{gItems.filter(i => i.comboRole !== 'bar_included').length}</span>
                </div>
                <ItemsList items={gItems} onQty={updateItemQty} onRemove={removeItem} onRemoveCombo={removeCombo} />
              </div>
            ))
          ) : (
            <ItemsList items={items} onQty={updateItemQty} onRemove={removeItem} onRemoveCombo={removeCombo} />
          )}
        </div>
      )}

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-safe-5 pt-1.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/30 font-medium truncate">
            {tableCode ? `Mesa ${tableCode}` : 'Para llevar'}
          </p>
          <p className="text-xl font-bold text-white tracking-tight leading-tight">{formatPrice(total())}</p>
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="bg-[#F5F1E8] disabled:opacity-50 text-[#0F2018] font-bold py-3.5 px-6 rounded-2xl text-sm btn-primary shrink-0"
        >
          {submitting ? 'Enviando…' : (label ?? 'Enviar →')}
        </button>
      </div>
    </div>
  )
}
