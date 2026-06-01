'use client'

import { useState, useCallback } from 'react'
import { useTableOrder } from '@/hooks/useProducts'
import { useQueryClient } from '@tanstack/react-query'
import { formatPrice, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SplitBillSheet } from './SplitBillSheet'
import type { Table, Order, OrderItem } from '@/types'

interface TableOrderSheetProps {
  table: Table
  onClose: () => void
  onAddMore: () => void
}

export function TableOrderSheet({ table, onClose, onAddMore }: TableOrderSheetProps) {
  const { data: order, isLoading } = useTableOrder(table.id)
  const qc = useQueryClient()
  const [closing,   setClosing]   = useState(false)
  const [closed,    setClosed]    = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const [editing,   setEditing]   = useState(false)

  const barItems     = order?.items?.filter((i) => i.area?.type === 'bar')     ?? []
  const kitchenItems = order?.items?.filter((i) => i.area?.type === 'kitchen') ?? []

  const total = order?.items?.reduce((sum, item) => {
    const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0
    return sum + (item.unit_price + modTotal) * item.quantity
  }, 0) ?? 0

  // ── Optimistic item update helper ─────────────────────────────────────────
  function patchCache(itemId: string, update: (item: OrderItem) => OrderItem | null) {
    qc.setQueryData<Order | null>(['table-order', table.id], (prev) => {
      if (!prev) return prev
      const items = (prev.items ?? [])
        .map((it) => (it.id === itemId ? update(it) : it))
        .filter(Boolean) as OrderItem[]
      return { ...prev, items }
    })
  }

  const handleChangeQty = useCallback(async (item: OrderItem, delta: number) => {
    const newQty = item.quantity + delta
    if (newQty < 1) {
      await handleRemove(item)
      return
    }
    // Optimistic
    patchCache(item.id, (it) => ({ ...it, quantity: newQty }))
    try {
      const res = await fetch(`/api/orders/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // Revert
      patchCache(item.id, (it) => ({ ...it, quantity: item.quantity }))
      toast.error('Error al actualizar')
    } finally {
      qc.invalidateQueries({ queryKey: ['orders', 'open'] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.id])

  const handleRemove = useCallback(async (item: OrderItem) => {
    // Optimistic — remove from cache immediately
    patchCache(item.id, () => null)
    try {
      const res = await fetch(`/api/orders/items/${item.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      qc.invalidateQueries({ queryKey: ['table-order', table.id] })
    } catch {
      // Revert
      qc.invalidateQueries({ queryKey: ['table-order', table.id] })
      toast.error('Error al eliminar')
    } finally {
      qc.invalidateQueries({ queryKey: ['orders', 'open'] })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.id])

  async function handleClose() {
    if (!order) return
    setClosing(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!res.ok) { toast.error('Error al cerrar mesa'); return }
      setClosed(true)
      qc.invalidateQueries({ queryKey: ['tables'] })
      qc.invalidateQueries({ queryKey: ['table-order', table.id] })
      qc.invalidateQueries({ queryKey: ['orders', 'open'] })
      setTimeout(onClose, 1200)
    } finally {
      setClosing(false)
    }
  }

  const hasItems = (order?.items?.length ?? 0) > 0

  return (
    <>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[6px]" onClick={onClose} />

      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-[2rem] flex flex-col max-h-[92dvh] spring-up overflow-hidden"
        style={{ background: '#0D2226', borderTop: '1px solid rgba(255,255,255,0.12)' }}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 shrink-0">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 className="text-white text-xl font-bold tracking-tight">Mesa {table.code}</h2>
              {order && (
                <span className="text-white/30 text-sm">desde {formatTime(order.created_at)}</span>
              )}
            </div>
            <p className="text-white/30 text-xs mt-0.5">
              {order?.items?.length ?? 0} productos · {formatPrice(total)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Edit mode toggle — only when there are items */}
            {hasItems && !closed && (
              <button
                onClick={() => setEditing((e) => !e)}
                className={cn(
                  'h-8 px-3 flex items-center justify-center rounded-full text-xs font-semibold transition-all press-scale',
                  editing
                    ? 'bg-[#A7B897]/25 text-[#A7B897] border border-[#A7B897]/40'
                    : 'glass text-white/40'
                )}
              >
                {editing ? 'Listo' : '✎ Editar'}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full glass text-white/50"
            >✕</button>
          </div>
        </div>

        <div className="h-px bg-white/8 mx-5 shrink-0" />

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
          {isLoading ? (
            <div className="flex flex-col gap-3 py-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 skeleton rounded-2xl" />)}
            </div>
          ) : !order || !order.items?.length ? (
            <div className="flex flex-col items-center py-10">
              <p className="text-4xl mb-3">🧾</p>
              <p className="text-white/40 text-sm font-medium">Sin pedidos registrados</p>
              <p className="text-white/20 text-xs mt-1">Agrega items para comenzar</p>
            </div>
          ) : (
            <>
              {editing && (
                <div className="flex items-center gap-2 bg-[#A7B897]/10 border border-[#A7B897]/20 rounded-xl px-3 py-2">
                  <span className="text-[#A7B897] text-xs">✎</span>
                  <p className="text-[#A7B897]/80 text-xs font-medium">
                    Ajusta cantidades o elimina ítems. Los cambios se guardan al instante.
                  </p>
                </div>
              )}
              {barItems.length > 0 && (
                <ItemGroup
                  label="Barra" icon="☕" items={barItems} areaType="bar"
                  editing={editing}
                  onChangeQty={handleChangeQty}
                  onRemove={handleRemove}
                />
              )}
              {kitchenItems.length > 0 && (
                <ItemGroup
                  label="Cocina" icon="🍽" items={kitchenItems} areaType="kitchen"
                  editing={editing}
                  onChangeQty={handleChangeQty}
                  onRemove={handleRemove}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {order && (
          <div className="shrink-0 px-5 pb-safe-8 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-white/40 text-sm font-medium">Total consumido</span>
              <span className="text-white text-2xl font-bold tracking-tight">{formatPrice(total)}</span>
            </div>

            {closed ? (
              <div className="w-full bg-[#A7B897]/20 text-[#A7B897] font-bold py-4 rounded-2xl text-sm text-center success-pop">
                Mesa cerrada ✓
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2.5">
                  <button
                    onClick={onAddMore}
                    className="flex-1 glass text-white/60 font-semibold py-3.5 rounded-2xl text-sm press-scale"
                  >
                    + Agregar
                  </button>
                  <button
                    onClick={handleClose}
                    disabled={closing || !hasItems}
                    className="flex-[2] bg-[#F5F1E8] text-[#0E2F33] font-bold py-3.5 rounded-2xl text-sm btn-primary disabled:opacity-40"
                  >
                    {closing ? 'Cerrando…' : 'Cobrar y cerrar mesa'}
                  </button>
                </div>
                <button
                  onClick={() => setShowSplit(true)}
                  disabled={!hasItems}
                  className="w-full glass text-white/40 font-medium py-3 rounded-2xl text-sm press-scale disabled:opacity-30"
                >
                  Dividir cuenta por persona
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {showSplit && order && (
        <div className="absolute inset-0 z-10">
          <SplitBillSheet
            order={order}
            onClose={() => setShowSplit(false)}
            onCloseTable={() => { setShowSplit(false); handleClose() }}
          />
        </div>
      )}
    </>
  )
}

// ── Item group ────────────────────────────────────────────────────────────────
const AREA_ACCENT: Record<string, { bar: string; label: string; labelText: string }> = {
  bar:     { bar: 'bg-[#A7B897]', label: 'bg-[#A7B897]/15 text-[#A7B897]',  labelText: 'text-[#A7B897]' },
  kitchen: { bar: 'bg-[#C46F4E]', label: 'bg-[#C46F4E]/15 text-[#C46F4E]',  labelText: 'text-[#C46F4E]' },
}

function ItemGroup({
  label, icon, items, areaType, editing, onChangeQty, onRemove,
}: {
  label: string
  icon: string
  items: OrderItem[]
  areaType: 'bar' | 'kitchen'
  editing: boolean
  onChangeQty: (item: OrderItem, delta: number) => void
  onRemove: (item: OrderItem) => void
}) {
  const accent = AREA_ACCENT[areaType]
  const subtotal = items.reduce((s, item) => {
    const modTotal = item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0
    return s + (item.unit_price + modTotal) * item.quantity
  }, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className={cn('text-[10px] font-bold uppercase tracking-widest', accent.labelText)}>{label}</span>
        </div>
        <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full', accent.label)}>
          {formatPrice(subtotal)}
        </span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          const modTotal  = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0
          const lineTotal = (item.unit_price + modTotal) * item.quantity

          return (
            <div
              key={item.id}
              className={cn(
                'flex items-stretch gap-0 bg-[#162B2F] rounded-2xl overflow-hidden border fade-scale-in transition-all',
                editing ? 'border-white/15' : 'border-white/8'
              )}
            >
              {/* Colored left accent bar */}
              <div className={cn('w-1 shrink-0', accent.bar)} />

              <div className="flex items-center gap-3 flex-1 px-4 py-3">

                {/* Qty — static badge or stepper */}
                {editing ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => item.quantity === 1 ? onRemove(item) : onChangeQty(item, -1)}
                      className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all press-scale',
                        item.quantity === 1
                          ? 'bg-[#C46F4E]/20 text-[#C46F4E] border border-[#C46F4E]/30'
                          : 'bg-white/10 text-white/70'
                      )}
                    >
                      {item.quantity === 1 ? '✕' : '−'}
                    </button>
                    <span className="w-6 text-center text-sm font-bold text-white">{item.quantity}</span>
                    <button
                      onClick={() => onChangeQty(item, 1)}
                      className="w-7 h-7 rounded-lg bg-white/10 text-white/70 flex items-center justify-center text-sm font-bold press-scale"
                    >+</button>
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm font-bold">{item.quantity}×</span>
                  </div>
                )}

                {/* Name + modifiers + notes */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold leading-snug">
                    {item.product?.name ?? (
                      <span className="text-[#EAD9B1]/80 italic">✦ {item.notes ?? 'Pedido libre'}</span>
                    )}
                  </p>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-white/45 text-xs mt-0.5">
                      {item.modifiers.map((m) => m.modifier?.name).join(' · ')}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-[#C46F4E] text-xs italic mt-0.5">"{item.notes}"</p>
                  )}
                </div>

                {/* Line total */}
                <div className="shrink-0 text-right">
                  <span className="text-white text-sm font-bold">{formatPrice(lineTotal)}</span>
                  {item.quantity > 1 && (
                    <p className="text-white/30 text-[10px] mt-0.5">{formatPrice(item.unit_price + modTotal)} c/u</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
