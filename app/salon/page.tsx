'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useTables } from '@/hooks/useTables'
import { useProducts } from '@/hooks/useProducts'
import { useTableOrder } from '@/hooks/useProducts'
import { useSound } from '@/hooks/useSound'
import { SoundEnabler } from '@/components/notifications/SoundEnabler'
import { PickupBanner } from '@/components/notifications/PickupBanner'
import { FloorTable, FloorGroupTable, FLOOR_STATE } from '@/components/tables/FloorTable'
import type { FloorState } from '@/components/tables/FloorTable'
import { AREA_IDS } from '@/lib/constants'
import { cn, formatPrice, formatTime } from '@/lib/utils'
import Link from 'next/link'
import type { Table, Order, AreaCard, Reservation, TableZone, OrderItem } from '@/types'

// ── Date helpers ──────────────────────────────────────────────────────────────

function localDate(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toLocaleDateString('en-CA')
}

function reservationTimeLabel(r: Reservation): string {
  return r.start_time.slice(0, 5)
}

function minutesUntil(date: string, time: string): number {
  return Math.round((new Date(`${date}T${time}`).getTime() - Date.now()) / 60_000)
}

// ── Table state computation ───────────────────────────────────────────────────

interface TableStateData {
  state: FloorState
  order?: Order
  cards: AreaCard[]
  itemCount: number
  personCount: number
}

function computeTableState(
  table: Table,
  openOrders: Order[],
  cardsByOrder: Map<string, AreaCard[]>,
  reservedTableIds: Set<string>,
): TableStateData {
  if (table.status === 'cleaning') {
    return { state: 'limpieza', cards: [], itemCount: 0, personCount: 0 }
  }
  const order = openOrders.find(o => o.table_id === table.id && o.type === 'table')
  if (!order) {
    return {
      state: reservedTableIds.has(table.id) ? 'reservada' : 'libre',
      cards: [], itemCount: 0, personCount: 0,
    }
  }
  const cards = cardsByOrder.get(order.id) ?? []
  const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
  const uniqueGuests = new Set(order.items?.map(i => i.guest_label).filter(Boolean))

  if (cards.length === 0) return { state: 'ocupada', order, cards, itemCount, personCount: uniqueGuests.size }
  if (cards.every(c => c.status === 'delivered')) return { state: 'listo', order, cards, itemCount, personCount: uniqueGuests.size }
  if (cards.some(c => c.status === 'received' || c.status === 'delivered')) return { state: 'preparando', order, cards, itemCount, personCount: uniqueGuests.size }
  return { state: 'ocupada', order, cards, itemCount, personCount: uniqueGuests.size }
}

// ── Tracking types ────────────────────────────────────────────────────────────

interface TrackingItem {
  table?: Table        // undefined for takeaway orders
  order: Order
  state: FloorState
  cards: AreaCard[]
  itemCount: number
  isTakeaway?: boolean
}

// ── Tracking progress bar ─────────────────────────────────────────────────────

interface ProgressStage {
  label: string
  sublabel?: string
  time?: string
  state: 'done' | 'active' | 'pending'
}

function TrackingProgressBar({ stages }: { stages: ProgressStage[] }) {
  const activeIdx = stages.findIndex(s => s.state === 'active')
  const doneCount = stages.filter(s => s.state === 'done').length
  // Progress % = doneCount / (stages.length - 1)
  const pct = stages.length > 1
    ? (doneCount / (stages.length - 1)) * 100
    : 0

  return (
    <div className="relative pt-1 pb-1">
      {/* Background line */}
      <div
        className="absolute h-[2px] rounded-full"
        style={{
          top: '22px',
          left: '14px',
          right: '14px',
          background: 'rgba(255,255,255,0.08)',
        }}
      />
      {/* Fill line */}
      <div
        className="absolute h-[2px] rounded-full transition-all duration-700"
        style={{
          top: '22px',
          left: '14px',
          width: `calc(${pct}% * (100% - 28px) / 100)`,
          background: doneCount === stages.length - 1
            ? '#EAD9B1'   // all done → golden
            : '#6DBF70',  // in progress → green
          maxWidth: 'calc(100% - 28px)',
        }}
      />

      {/* Nodes */}
      <div className="relative flex justify-between">
        {stages.map((stage, i) => {
          const isDone   = stage.state === 'done'
          const isActive = stage.state === 'active'
          const isLast   = i === stages.length - 1

          return (
            <div key={i} className="flex flex-col items-center gap-1.5" style={{ minWidth: 56 }}>
              {/* Circle */}
              <div
                className={cn(
                  'w-[28px] h-[28px] rounded-full flex items-center justify-center transition-all duration-500 z-[1]',
                  isDone && !isLast   && 'bg-[#6DBF70] border-2 border-[#6DBF70]',
                  isDone &&  isLast   && 'bg-[#EAD9B1] border-2 border-[#EAD9B1]',
                  isActive             && 'bg-transparent border-2 border-[#6DBF70]',
                  stage.state === 'pending' && 'bg-transparent border-2 border-white/15',
                )}
              >
                {isDone && !isLast && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isDone && isLast && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1B3428" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-[#6DBF70]" />
                )}
              </div>

              {/* Label */}
              <div className="text-center">
                <p className={cn(
                  'text-[10px] font-semibold leading-tight',
                  isDone   ? (isLast ? 'text-[#EAD9B1]' : 'text-[#6DBF70]') :
                  isActive ? 'text-white/80' : 'text-white/25',
                )}>
                  {stage.label}
                </p>
                {stage.sublabel && (
                  <p className={cn(
                    'text-[9px] mt-0.5 leading-tight',
                    isActive ? 'text-white/45' : 'text-white/20',
                  )}>
                    {stage.sublabel}
                  </p>
                )}
                {stage.time && (
                  <p className={cn(
                    'text-[9px] mt-0.5',
                    isDone ? 'text-white/35' : 'text-white/20',
                  )}>
                    {stage.time}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Single tracking card ──────────────────────────────────────────────────────

function TableTrackingCard({
  item,
  isExiting,
  onClick,
}: {
  item: TrackingItem
  isExiting: boolean
  onClick?: () => void
}) {
  const { table, order, state, cards, isTakeaway } = item
  const barCard = cards.find(c => c.area_id === AREA_IDS.BAR)
  const kitCard = cards.find(c => c.area_id === AREA_IDS.KITCHEN)

  const isListo      = state === 'listo'
  const isPrep       = state === 'preparando' || state === 'ocupada'

  // Build sublabel for "Preparando" stage
  const areaLabels: string[] = []
  if (barCard) {
    areaLabels.push(
      barCard.status === 'delivered' ? '☕ ✓' :
      barCard.status === 'received'  ? '☕ prep.' : '☕ pend.'
    )
  }
  if (kitCard) {
    areaLabels.push(
      kitCard.status === 'delivered' ? '🍽 ✓' :
      kitCard.status === 'received'  ? '🍽 prep.' : '🍽 pend.'
    )
  }

  // Timestamps
  const pedidoTime  = formatTime(order.created_at)
  const prepTime    = barCard?.created_at || kitCard?.created_at
    ? formatTime((barCard?.created_at ?? kitCard?.created_at)!)
    : undefined
  const listoTime   = isListo
    ? formatTime(
        cards.reduce((latest, c) =>
          c.delivered_at && c.delivered_at > latest ? c.delivered_at : latest,
          cards[0]?.delivered_at ?? order.created_at
        )
      )
    : undefined

  // Stage state resolution
  const prepStageState: ProgressStage['state'] =
    isListo ? 'done' : cards.length > 0 ? 'active' : 'pending'
  const listoStageState: ProgressStage['state'] =
    isListo ? 'done' : 'pending'

  const stages: ProgressStage[] = [
    {
      label:    'Pedido',
      time:     pedidoTime,
      state:    'done',
    },
    {
      label:    'Preparando',
      sublabel: areaLabels.join(' · ') || undefined,
      time:     prepStageState === 'done' ? prepTime : undefined,
      state:    prepStageState,
    },
    {
      label:    'Listo',
      time:     listoTime,
      state:    listoStageState,
    },
  ]

  // Item summary (first 2 unique product names)
  const itemNames = [...new Set(
    order.items
      ?.map(i => i.product?.name ?? i.notes)
      .filter(Boolean)
      .slice(0, 3) ?? []
  )]
  const itemSummary = itemNames.join(' · ')
    + (order.items && order.items.length > 3 ? ` · +${order.items.length - 3}` : '')

  const cardLabel = isTakeaway
    ? `Para llevar #${order.id.slice(-4).toUpperCase()}`
    : `Mesa ${table!.code}`

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      {...(onClick ? { onClick } : {})}
      className={cn(
        'w-full text-left rounded-2xl border px-4 py-4 transition-all mb-3',
        onClick ? 'press-scale' : 'cursor-default',
        isExiting && 'card-exit',
        isListo
          ? 'border-[#EAD9B1]/30 bg-[#EAD9B1]/8'
          : 'border-white/8 bg-white/5',
      )}
    >
      {/* Card header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <p className="text-white font-bold text-sm">{cardLabel}</p>
          <span className="text-white/30 text-xs">·</span>
          <p className="text-white/45 text-xs">{item.itemCount} ítem{item.itemCount !== 1 ? 's' : ''}</p>
        </div>
        <span className={cn(
          'text-[10px] font-bold px-2.5 py-1 rounded-full',
          isListo   ? 'bg-[#EAD9B1]/15 text-[#EAD9B1]' :
          isPrep    ? 'bg-[#6DBF70]/15 text-[#6DBF70]'  :
                      'bg-white/8 text-white/50',
        )}>
          {isListo ? '✓ Listo' : state === 'preparando' ? 'Preparando' : 'Tomado'}
        </span>
      </div>

      {/* Item names */}
      {itemSummary && (
        <p className="text-white/35 text-[11px] mb-3 truncate">{itemSummary}</p>
      )}

      {/* ── Demora ── */}
      {cards.some(c => c.delay_minutes && c.delay_minutes > 0) && (() => {
        const dc = cards.find(c => c.delay_minutes && c.delay_minutes > 0)!
        return (
          <div className="flex items-center gap-2 mb-2 rounded-xl px-3 py-2 border"
            style={{ background: 'rgba(226,91,78,0.1)', borderColor: 'rgba(226,91,78,0.2)' }}>
            <span className="text-[#E25B4E] text-xs shrink-0">⏱</span>
            <p className="text-[#E25B4E] text-xs font-semibold">
              Demora ~{dc.delay_minutes} min
              {dc.delay_reason ? <span className="font-normal opacity-80"> — {dc.delay_reason}</span> : null}
            </p>
          </div>
        )
      })()}

      {/* ── Notas de área ── */}
      {cards.filter(c => c.operator_note).map(c => (
        <div key={c.id}
          className="flex items-start gap-2 mb-2 rounded-xl px-3 py-2 border"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}>
          <span className="text-white/40 text-xs shrink-0 mt-0.5">
            {c.area?.type === 'bar' ? '☕' : c.area?.type === 'kitchen' ? '🍽' : '📝'}
          </span>
          <p className="text-white/55 text-xs leading-relaxed">"{c.operator_note}"</p>
        </div>
      ))}

      {/* Progress */}
      <div className="mt-3">
        <TrackingProgressBar stages={stages} />
      </div>
    </Wrapper>
  )
}

// ── Tracking section (manages auto-dismiss logic) ─────────────────────────────

function TrackingSection({
  items,
  onTablePress,
}: {
  items: TrackingItem[]
  onTablePress: (table: Table) => void
}) {
  const scheduledRef = useRef<Set<string>>(new Set())
  const [exiting,   setExiting]   = useState<Set<string>>(new Set())
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    items.forEach(item => {
      if (item.state !== 'listo') return
      const id = item.order.id
      if (scheduledRef.current.has(id)) return
      scheduledRef.current.add(id)

      // Start exit animation after 30s (waiter needs time to notice)
      setTimeout(() => setExiting(prev  => new Set([...prev,  id])), 30_000)
      // Remove from DOM after animation finishes (30s + 700ms)
      setTimeout(() => setDismissed(prev => new Set([...prev, id])), 30_700)
    })
  }, [items])

  const visible = items.filter(item => !dismissed.has(item.order.id))

  if (visible.length === 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/8">
        <div className="w-2 h-2 rounded-full bg-[#6DBF70]" />
        <p className="text-white/40 text-sm">Sin pedidos activos en este momento</p>
      </div>
    )
  }

  return (
    <div>
      {visible.map(item => (
        <TableTrackingCard
          key={item.order.id}
          item={item}
          isExiting={exiting.has(item.order.id)}
          onClick={item.isTakeaway ? undefined : () => onTablePress(item.table!)}
        />
      ))}
    </div>
  )
}

// ── Order item row (inside modal) ─────────────────────────────────────────────

function OrderItemRow({ item }: { item: OrderItem }) {
  const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0
  const lineTotal = (item.unit_price + modTotal) * item.quantity
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-[#F7F5F0] last:border-0">
      <span className="text-[#7A756D] text-sm font-bold w-6 text-center mt-0.5 shrink-0">{item.quantity}×</span>
      <div className="flex-1 min-w-0">
        <p className="text-[#1F1F1F] text-sm font-semibold leading-snug">
          {item.product?.name ?? item.notes ?? '—'}
        </p>
        {item.modifiers && item.modifiers.length > 0 && (
          <p className="text-[#A9A39C] text-xs mt-0.5">
            {item.modifiers.map(m => m.modifier?.name).filter(Boolean).join(' · ')}
          </p>
        )}
        {item.notes && item.product?.name && (
          <p className="text-[#C46F4E] text-xs italic mt-0.5">"{item.notes}"</p>
        )}
      </div>
      <span className="text-[#1B3428] text-sm font-semibold shrink-0">{formatPrice(lineTotal)}</span>
    </div>
  )
}

// ── Table detail modal ────────────────────────────────────────────────────────

function TableModal({
  table, stateData, onClose,
}: {
  table: Table
  stateData: TableStateData
  onClose: () => void
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data: liveOrder, isLoading } = useTableOrder(table.id)
  const [closing, setClosing] = useState(false)
  const [closed,  setClosed]  = useState(false)

  const order     = liveOrder ?? stateData.order
  const items     = order?.items ?? []
  const barItems  = items.filter(i => i.area?.type === 'bar')
  const kitItems  = items.filter(i => i.area?.type === 'kitchen')
  const total     = items.reduce((s, item) => {
    const mods = item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0
    return s + (item.unit_price + mods) * item.quantity
  }, 0)

  const elapsed = order
    ? Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60_000)
    : null
  const elapsedLabel = elapsed === null ? null
    : elapsed < 1 ? 'ahora'
    : elapsed < 60 ? `${elapsed} min`
    : `${Math.floor(elapsed / 60)}h ${elapsed % 60 > 0 ? `${elapsed % 60}m` : ''}`

  async function handleCloseOrder() {
    if (!order) return
    setClosing(true)
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      })
      if (!res.ok) { toast.error('Error al cerrar la mesa'); return }
      toast.success(`Mesa ${table.code} cobrada`)
      setClosed(true)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        queryClient.invalidateQueries({ queryKey: ['orders', 'open'] })
        queryClient.invalidateQueries({ queryKey: ['table-order', table.id] })
        queryClient.invalidateQueries({ queryKey: ['cards-all-active'] })
        onClose()
      }, 700)
    } catch {
      toast.error('Error al cerrar la mesa')
    } finally {
      setClosing(false)
    }
  }

  async function handleReleaseTable() {
    setClosing(true)
    try {
      const res = await fetch(`/api/tables/${table.id}/release`, { method: 'POST' })
      if (!res.ok) { toast.error('Error al liberar la mesa'); return }
      toast.success(`Mesa ${table.code} liberada`)
      setClosed(true)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        queryClient.invalidateQueries({ queryKey: ['orders', 'open'] })
        queryClient.invalidateQueries({ queryKey: ['table-order', table.id] })
        queryClient.invalidateQueries({ queryKey: ['cards-all-active'] })
        onClose()
      }, 700)
    } catch {
      toast.error('Error al liberar la mesa')
    } finally {
      setClosing(false)
    }
  }

  const stateCfg = FLOOR_STATE[stateData.state]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] overlay-fade" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 spring-up" style={{ maxHeight: '92dvh' }}>
        <div className="bg-white rounded-t-3xl flex flex-col" style={{ maxHeight: '92dvh' }}>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-10 h-1 rounded-full bg-[#E7E1D8]" />
          </div>

          {/* Header */}
          <div className="px-5 pt-2 pb-4 border-b border-[#F2EFE9] shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-[#1B3428] text-2xl font-bold leading-none">Mesa {table.code}</h2>
                  <span
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: stateCfg.bg, color: stateCfg.dot, border: `1px solid ${stateCfg.border}` }}
                  >
                    {stateCfg.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {elapsedLabel && (
                    <span className="text-[#7A756D] text-xs flex items-center gap-1">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      {elapsedLabel}
                    </span>
                  )}
                  <span className="text-[#7A756D] text-xs flex items-center gap-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                    {table.capacity} personas
                  </span>
                  {items.length > 0 && (
                    <span className="text-[#7A756D] text-xs">{items.length} ítem{items.length !== 1 ? 's' : ''}</span>
                  )}
                  {!order && !isLoading && <span className="text-[#6D8A5C] text-xs font-medium">Mesa libre</span>}
                </div>
              </div>
              <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-[#F7F5F0] text-[#7A756D] shrink-0 press-scale">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
            {isLoading && !order ? (
              <div className="h-24 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 border-[#1B3428]/20 border-t-[#1B3428] animate-spin" />
              </div>
            ) : !order ? (
              <div className="h-24 flex flex-col items-center justify-center gap-2">
                <p className="text-3xl">🪑</p>
                <p className="text-[#A9A39C] text-sm">Sin pedido activo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {barItems.length > 0 && (
                  <div>
                    <p className="text-[#C98933] text-[10px] font-bold uppercase tracking-widest mb-1.5">☕ Barra</p>
                    {barItems.map(item => <OrderItemRow key={item.id} item={item} />)}
                  </div>
                )}
                {kitItems.length > 0 && (
                  <div>
                    <p className="text-[#C46F4E] text-[10px] font-bold uppercase tracking-widest mb-1.5">🍽 Cocina</p>
                    {kitItems.map(item => <OrderItemRow key={item.id} item={item} />)}
                  </div>
                )}
                {items.length > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-[#F2EFE9]">
                    <span className="text-[#7A756D] text-sm font-medium">Total</span>
                    <span className="text-[#1B3428] text-xl font-bold">{formatPrice(total)}</span>
                  </div>
                )}

                {/* ── Demoras y notas de barra/cocina ── */}
                {stateData.cards.some(c =>
                  (c.delay_minutes && c.delay_minutes > 0) || c.operator_note
                ) && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[#A9A39C] text-[10px] font-bold uppercase tracking-widest">
                      Mensajes de área
                    </p>
                    {stateData.cards
                      .filter(c => c.delay_minutes && c.delay_minutes > 0)
                      .map(c => (
                        <div key={`d-${c.id}`}
                          className="flex items-center gap-2 bg-[#FFF5F5] border border-[#FDDEDE] rounded-xl px-3 py-2.5">
                          <span className="text-[#B8574E] text-sm shrink-0">⏱</span>
                          <div>
                            <p className="text-[#B8574E] text-xs font-bold">
                              Demora ~{c.delay_minutes} min
                            </p>
                            {c.delay_reason && (
                              <p className="text-[#B8574E]/70 text-[11px] mt-0.5">{c.delay_reason}</p>
                            )}
                          </div>
                          <span className="ml-auto text-[#B8574E]/50 text-[10px] shrink-0">
                            {c.area?.type === 'bar' ? 'Barra' : 'Cocina'}
                          </span>
                        </div>
                      ))}
                    {stateData.cards
                      .filter(c => c.operator_note)
                      .map(c => (
                        <div key={`n-${c.id}`}
                          className="flex items-start gap-2 bg-[#F7F5F0] border border-[#E7E1D8] rounded-xl px-3 py-2.5">
                          <span className="text-[#A9A39C] text-sm shrink-0 mt-0.5">
                            {c.area?.type === 'bar' ? '☕' : '🍽'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#1F1F1F] text-xs font-semibold">
                              {c.area?.type === 'bar' ? 'Barra' : 'Cocina'}
                            </p>
                            <p className="text-[#7A756D] text-xs mt-0.5">"{c.operator_note}"</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="shrink-0 px-5 pt-3 border-t border-[#F2EFE9] space-y-2.5 pb-safe-6">
            {closed ? (
              <div className="w-full bg-[#EFF7EF] text-[#2E7D32] font-bold py-4 rounded-2xl text-sm text-center success-pop">Mesa cerrada ✓</div>
            ) : (
              <>
                <button
                  onClick={() => { onClose(); router.push(`/order/${table.id}`) }}
                  className="w-full flex items-center justify-center gap-2 bg-[#1B3428] text-[#EAD9B1] font-bold py-4 rounded-2xl text-sm press-scale"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Agregar pedido
                </button>
                {order && (
                  <div className="flex gap-2.5">
                    <button onClick={handleCloseOrder} disabled={closing || !order}
                      className="flex-1 bg-[#F5F1E8] text-[#1B3428] font-bold py-4 rounded-2xl text-sm press-scale disabled:opacity-40">
                      {closing ? 'Cerrando…' : '💳 Cobrar'}
                    </button>
                    <button onClick={handleReleaseTable} disabled={closing}
                      className="flex-1 border border-[#FDDEDE] bg-[#FFF5F5] text-[#B8574E] font-semibold py-4 rounded-2xl text-sm press-scale disabled:opacity-40">
                      Cliente se fue
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// ── Dashboard — Reservation card ──────────────────────────────────────────────

function ReservCard({ r, isToday }: { r: Reservation; isToday: boolean }) {
  const mins = isToday ? minutesUntil(r.date, r.start_time) : null
  const isImminent = mins !== null && mins >= 0 && mins <= 45

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all',
      isImminent
        ? 'bg-[#EAD9B1]/10 border-[#EAD9B1]/30'
        : 'bg-white/5 border-white/8',
    )}>
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
        isImminent ? 'bg-[#EAD9B1]/20 text-[#EAD9B1]' : 'bg-white/8 text-white/50',
      )}>
        {reservationTimeLabel(r)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate leading-none">{r.customer_name}</p>
        <p className="text-white/50 text-xs mt-1">
          {r.party_size} personas
          {r.zone ? ` · ${r.zone === 'salon1' ? 'Salón 1' : r.zone === 'salon2' ? 'Salón 2' : 'Terraza'}` : ''}
          {r.menu_type ? ` · ${r.menu_type === 'brunch' ? 'Brunch' : 'Simple'}` : ''}
        </p>
      </div>
      {isImminent && mins !== null && (
        <span className="text-[#EAD9B1] text-xs font-bold shrink-0">
          {mins === 0 ? 'Ahora' : `en ${mins}m`}
        </span>
      )}
    </div>
  )
}

// ── Dashboard — Area status widget ────────────────────────────────────────────

function AreaStatusCard({
  icon, label, color, pending, preparing, delivered,
}: {
  icon: string; label: string; color: string
  pending: number; preparing: number; delivered: number
}) {
  const total = pending + preparing + delivered
  const allClear = total === 0

  return (
    <div className="flex-1 rounded-2xl border border-white/8 bg-white/5 px-4 py-3.5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base leading-none">{icon}</span>
        <span className="text-white/80 text-xs font-bold uppercase tracking-wider">{label}</span>
      </div>
      {allClear ? (
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#6DBF70]" />
          <span className="text-[#6DBF70] text-xs font-semibold">Sin pedidos</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {pending > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#F5A623] dot-pulse-amber shrink-0" />
              <span className="text-[#F5A623] text-xs font-semibold">{pending} pendiente{pending !== 1 ? 's' : ''}</span>
            </div>
          )}
          {preparing > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6D9EEB] shrink-0" />
              <span className="text-[#6D9EEB] text-xs font-semibold">{preparing} preparando</span>
            </div>
          )}
          {delivered > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#6DBF70] shrink-0" />
              <span className="text-[#6DBF70] text-xs font-semibold">{delivered} listo{delivered !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Dashboard — Tables summary bar ───────────────────────────────────────────

function TablesSummaryBar({ occupied, total }: { occupied: number; total: number }) {
  const free = total - occupied
  const pct  = total > 0 ? Math.round((occupied / total) * 100) : 0

  return (
    <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3.5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/70 text-xs font-bold uppercase tracking-wider">Mesas</span>
        <span className="text-white font-bold text-base">{occupied}<span className="text-white/40 font-normal text-sm">/{total}</span></span>
      </div>
      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct >= 80 ? '#E25B4E' : pct >= 50 ? '#F5A623' : '#6DBF70',
          }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-white/40 text-[11px]">{occupied} ocupada{occupied !== 1 ? 's' : ''}</span>
        <span className="text-white/40 text-[11px]">{free} libre{free !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

// ── Dashboard view ────────────────────────────────────────────────────────────

function DashboardView({
  trackingItems,
  stats,
  todayReservations,
  stockOut,
  stockLow,
  totalActiveTables,
  onTablePress,
}: {
  trackingItems: TrackingItem[]
  stats: { occupied: number; free: number; ready: number; reserved: number }
  todayReservations: Reservation[]
  stockOut: string[]
  stockLow: string[]
  totalActiveTables: number
  onTablePress: (table: Table) => void
}) {
  return (
    <div className="px-4 pt-5 space-y-6 pb-8">

      {/* ── Seguimiento de pedidos (tracking) ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[#A7C4A0] text-[10px] font-bold uppercase tracking-[0.18em]">Seguimiento</p>
          {stats.occupied > 0 && (
            <span className="text-white/30 text-[11px]">
              {stats.occupied} mesa{stats.occupied !== 1 ? 's' : ''} activa{stats.occupied !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <TrackingSection items={trackingItems} onTablePress={onTablePress} />
      </section>

      {/* ── Reservas hoy ── */}
      {todayReservations.length > 0 && (
        <section>
          <p className="text-[#A7C4A0] text-[10px] font-bold uppercase tracking-[0.18em] mb-3">Reservas hoy</p>
          <div className="space-y-2">
            {todayReservations.slice(0, 4).map(r => <ReservCard key={r.id} r={r} isToday />)}
            {todayReservations.length > 4 && (
              <p className="text-white/25 text-xs text-center py-1">+{todayReservations.length - 4} más</p>
            )}
          </div>
        </section>
      )}

      {/* ── Stock ── */}
      <section>
        <p className="text-[#A7C4A0] text-[10px] font-bold uppercase tracking-[0.18em] mb-3">
          Stock
        </p>
        {stockOut.length === 0 && stockLow.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/8">
            <span className="text-[#6DBF70]">✓</span>
            <p className="text-white/40 text-sm">Todo disponible — sin alertas</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/8 bg-white/5 overflow-hidden">
            {stockOut.length > 0 && (
              <div className="px-4 py-3.5 border-b border-white/5">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#E25B4E]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#E25B4E] text-[10px] font-black">86</span>
                  </div>
                  <p className="text-[#E25B4E] text-xs font-bold">Agotado — No ofrecer</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stockOut.map(name => (
                    <span key={name} className="bg-[#E25B4E]/10 border border-[#E25B4E]/20 text-[#E25B4E]/80 text-[11px] font-medium px-2.5 py-1 rounded-full">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {stockLow.length > 0 && (
              <div className="px-4 py-3.5">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#F5A623]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#F5A623] text-[10px] font-black">85</span>
                  </div>
                  <p className="text-[#F5A623] text-xs font-bold">Poco stock — Informar</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stockLow.map(name => (
                    <span key={name} className="bg-[#F5A623]/10 border border-[#F5A623]/20 text-[#F5A623]/80 text-[11px] font-medium px-2.5 py-1 rounded-full">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Floor plan zone section ───────────────────────────────────────────────────

function ZoneSection({
  label, tables, childTableIds, activeTables, tableStateMap, selectedTableId, onTablePress,
}: {
  label?: string
  tables: Table[]
  childTableIds: Set<string>
  activeTables: Table[]
  tableStateMap: Map<string, TableStateData>
  selectedTableId: string | null
  onTablePress: (table: Table) => void
}) {
  if (tables.length === 0) return null
  return (
    <div className="mb-8">
      {label && (
        <p className="text-[#4A7A5A] text-[10px] font-bold uppercase tracking-[0.18em] px-5 mb-4">{label}</p>
      )}
      <div className="px-4 flex flex-wrap justify-evenly gap-x-2 gap-y-7">
        {tables.map(table => {
          const sd = tableStateMap.get(table.id)
          const state = sd?.state ?? 'libre'
          const children = activeTables.filter(t => t.parent_table_id === table.id)

          if (children.length > 0) {
            const all = [table, ...children]
            return (
              <FloorGroupTable
                key={table.id}
                codes={all.map(t => t.code)}
                totalCapacity={all.reduce((s, t) => s + t.capacity, 0)}
                state={state}
                occupiedSince={sd?.order?.created_at}
                items={sd?.itemCount}
                persons={sd?.personCount}
                selected={selectedTableId === table.id}
                onClick={() => onTablePress(table)}
              />
            )
          }

          return (
            <FloorTable
              key={table.id}
              code={table.code}
              capacity={table.capacity}
              state={state}
              occupiedSince={sd?.order?.created_at}
              items={sd?.itemCount}
              persons={sd?.personCount}
              selected={selectedTableId === table.id}
              onClick={() => onTablePress(table)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── Takeaway strip ────────────────────────────────────────────────────────────

function TakeawayStrip({ orders, cardsByOrder }: { orders: Order[]; cardsByOrder: Map<string, AreaCard[]> }) {
  if (orders.length === 0) return null
  return (
    <div className="px-5 mb-6">
      <p className="text-[#4A7A5A] text-[10px] font-bold uppercase tracking-[0.18em] mb-3">Para llevar</p>
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {orders.map(order => {
          const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
          const cards = cardsByOrder.get(order.id) ?? []
          const allDone = cards.length > 0 && cards.every(c => c.status === 'delivered')
          const anyPrep = cards.some(c => c.status === 'received')
          return (
            <Link key={order.id} href="/order/takeaway"
              className={cn(
                'shrink-0 rounded-2xl border px-4 py-3 min-w-[110px] press-scale',
                allDone ? 'bg-[#F5F0FA] border-[#9C27B0]/25'
                  : anyPrep ? 'bg-[#FFF8F0] border-[#FF9800]/25'
                  : 'bg-white border-[#E7E1D8]',
              )}>
              <p className={cn('text-[11px] font-bold', allDone ? 'text-[#6A1B9A]' : anyPrep ? 'text-[#E65100]' : 'text-[#7A756D]')}>
                {allDone ? '✓ Listo' : anyPrep ? 'Preparando' : '🥡 Pendiente'}
              </p>
              <p className="text-[#1F1F1F] text-sm font-bold mt-1">{itemCount} ítem{itemCount !== 1 ? 's' : ''}</p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND = [
  { color: '#4CAF50', label: 'Libre'     },
  { color: '#2196F3', label: 'Ocupada'   },
  { color: '#FF9800', label: 'Preparando'},
  { color: '#9C27B0', label: 'Listo'     },
  { color: '#9E9E9E', label: 'Limpieza'  },
  { color: '#FFC107', label: 'Reservada' },
]

// ── Zone tabs ─────────────────────────────────────────────────────────────────

type ZoneFilter = TableZone | 'all'
const ZONE_TABS: { key: ZoneFilter; label: string }[] = [
  { key: 'all',     label: 'Todas'   },
  { key: 'salon1',  label: 'Salón 1' },
  { key: 'salon2',  label: 'Salón 2' },
  { key: 'terrace', label: 'Terraza' },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SalonPage() {
  useSound()

  const queryClient = useQueryClient()
  const [mainTab,   setMainTab]   = useState<'dashboard' | 'plano'>('dashboard')
  const [activeZone, setActiveZone] = useState<ZoneFilter>('all')
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: tables = [] } = useTables()
  const { data: products = [] } = useProducts()

  const { data: openOrders = [] } = useQuery<Order[]>({
    queryKey: ['orders', 'open'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=open')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 15_000,
  })

  const { data: allCards = [] } = useQuery<AreaCard[]>({
    queryKey: ['cards-all-active'],
    queryFn: async () => {
      const res = await fetch('/api/cards')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  })

  const { data: todayReservations = [] } = useQuery<Reservation[]>({
    queryKey: ['reservations', 'today'],
    queryFn: async () => {
      const res = await fetch(`/api/reservations?date=${localDate(0)}&status=pending,confirmed,in_progress`)
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 60_000,
  })

  // ── Realtime ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel('salon-floor-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'area_cards' }, () => {
        queryClient.invalidateQueries({ queryKey: ['cards-all-active'] })
        queryClient.invalidateQueries({ queryKey: ['orders', 'open'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        queryClient.invalidateQueries({ queryKey: ['orders', 'open'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [queryClient])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      queryClient.invalidateQueries({ queryKey: ['cards-all-active'] })
      queryClient.invalidateQueries({ queryKey: ['orders', 'open'] })
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [queryClient])

  // ── Derived state ──────────────────────────────────────────────────────────

  const cardsByOrder = useMemo(() => {
    const map = new Map<string, AreaCard[]>()
    for (const card of allCards) {
      if (!card.order_id) continue
      const list = map.get(card.order_id) ?? []
      list.push(card)
      map.set(card.order_id, list)
    }
    return map
  }, [allCards])

  const reservedTableIds = useMemo(() => {
    const ids = new Set<string>()
    for (const r of todayReservations) {
      if (r.status === 'confirmed' || r.status === 'pending') {
        r.tables?.forEach(t => ids.add(t.id))
      }
    }
    return ids
  }, [todayReservations])

  const tableStateMap = useMemo(() => {
    const map = new Map<string, TableStateData>()
    for (const t of tables) {
      map.set(t.id, computeTableState(t, openOrders, cardsByOrder, reservedTableIds))
    }
    return map
  }, [tables, openOrders, cardsByOrder, reservedTableIds])

  const activeTables = useMemo(() => tables.filter(t => t.active), [tables])

  const childTableIds = useMemo(() => {
    const ids = new Set<string>()
    for (const t of activeTables) {
      if (t.parent_table_id) ids.add(t.id)
    }
    return ids
  }, [activeTables])

  const takeawayOrders = useMemo(
    () => openOrders.filter(o => o.type === 'takeaway'),
    [openOrders],
  )

  const stats = useMemo(() => {
    const active = activeTables.filter(t => !childTableIds.has(t.id))
    const total = active.length
    const occupied = active.filter(t => {
      const s = tableStateMap.get(t.id)?.state
      return s === 'ocupada' || s === 'preparando' || s === 'listo'
    }).length
    const free     = active.filter(t => tableStateMap.get(t.id)?.state === 'libre').length
    const reserved = active.filter(t => tableStateMap.get(t.id)?.state === 'reservada').length
    const ready    = active.filter(t => tableStateMap.get(t.id)?.state === 'listo').length
    return { total, occupied, free, reserved, ready }
  }, [activeTables, childTableIds, tableStateMap])

  // Tracking items: tables with open orders (occupied / preparando / listo)
  const tableTrackingItems = useMemo((): TrackingItem[] => {
    return activeTables
      .filter(t => !childTableIds.has(t.id))
      .map(t => {
        const sd = tableStateMap.get(t.id)
        if (!sd?.order) return null
        return {
          table:     t,
          order:     sd.order,
          state:     sd.state,
          cards:     sd.cards,
          itemCount: sd.itemCount,
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => {
        if (a.state === 'listo' && b.state !== 'listo') return 1
        if (b.state === 'listo' && a.state !== 'listo') return -1
        if (a.state === 'preparando' && b.state !== 'preparando') return -1
        if (b.state === 'preparando' && a.state !== 'preparando') return 1
        return new Date(a.order.created_at).getTime() - new Date(b.order.created_at).getTime()
      })
  }, [activeTables, childTableIds, tableStateMap])

  // Tracking items: takeaway orders — derive state from their area cards
  const takeawayTrackingItems = useMemo((): TrackingItem[] => {
    return takeawayOrders.map(order => {
      const cards = cardsByOrder.get(order.id) ?? []
      const itemCount = order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0
      let state: FloorState = 'ocupada'
      if (cards.length > 0) {
        if (cards.every(c => c.status === 'delivered')) state = 'listo'
        else if (cards.some(c => c.status === 'received' || c.status === 'delivered')) state = 'preparando'
      }
      return { order, state, cards, itemCount, isTakeaway: true as const }
    }).sort((a, b) => {
      if (a.state === 'listo' && b.state !== 'listo') return 1
      if (b.state === 'listo' && a.state !== 'listo') return -1
      if (a.state === 'preparando' && b.state !== 'preparando') return -1
      if (b.state === 'preparando' && a.state !== 'preparando') return 1
      return new Date(a.order.created_at).getTime() - new Date(b.order.created_at).getTime()
    })
  }, [takeawayOrders, cardsByOrder])

  // Unified tracking: takeaway at the top (customer waiting at counter), tables below
  const trackingItems = useMemo(
    () => [...takeawayTrackingItems, ...tableTrackingItems],
    [takeawayTrackingItems, tableTrackingItems],
  )

  // Stock alerts
  const stockOut = useMemo(
    () => products.filter(p => p.active && p.stock_status === 'out').map(p => p.name),
    [products],
  )
  const stockLow = useMemo(
    () => products.filter(p => p.active && p.stock_status === 'low').map(p => p.name),
    [products],
  )

  // Floor plan table groups
  const zoneGroups = useMemo(() => {
    const groups: Record<string, Table[]> = { salon1: [], salon2: [], terrace: [] }
    for (const t of activeTables) {
      if (childTableIds.has(t.id)) continue
      if (activeZone !== 'all' && t.zone !== activeZone) continue
      groups[t.zone] = groups[t.zone] ?? []
      groups[t.zone].push(t)
    }
    return groups
  }, [activeTables, childTableIds, activeZone])

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleTablePress = useCallback((table: Table) => {
    setSelectedTable(table)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedTable(null)
  }, [])

  const zoneSharedProps = {
    childTableIds, activeTables, tableStateMap,
    selectedTableId: selectedTable?.id ?? null,
    onTablePress: handleTablePress,
  }

  // ── Colors ────────────────────────────────────────────────────────────────

  // The page is always dark green; only the floor plan canvas changes to light
  const PAGE_BG = '#1B3428'

  return (
    <div className="min-h-screen" style={{ background: PAGE_BG, paddingTop: 'env(safe-area-inset-top)' }}>
      <SoundEnabler />
      <PickupBanner />

      {/* ── Sticky header ── */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{ background: PAGE_BG + 'f5', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.08)' }}
      >
        {/* Title row */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h1 className="text-[#F5F1E8] text-2xl font-bold tracking-tight leading-none">Salón</h1>
            {time && <p className="text-white/40 text-[11px] mt-1">{time}</p>}
          </div>
          <Link
            href="/order/takeaway"
            className="flex items-center gap-1.5 border text-[#EAD9B1] text-xs font-bold px-3.5 py-2 rounded-xl press-scale"
            style={{ borderColor: 'rgba(234,217,177,0.25)', background: 'rgba(234,217,177,0.08)' }}
          >
            <span>🥡</span>
            <span>Para llevar</span>
          </Link>
        </div>

        {/* Stats pills */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
          {stats.occupied > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(33,150,243,0.15)', color: '#90CAF9', border: '1px solid rgba(33,150,243,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#2196F3]" />
              {stats.occupied} ocupada{stats.occupied !== 1 ? 's' : ''}
            </div>
          )}
          {stats.free > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(109,191,112,0.12)', color: '#A5D6A7', border: '1px solid rgba(109,191,112,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#6DBF70]" />
              {stats.free} libre{stats.free !== 1 ? 's' : ''}
            </div>
          )}
          {stats.ready > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(109,191,112,0.18)', color: '#6DBF70', border: '1px solid rgba(109,191,112,0.3)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#6DBF70] dot-pulse" />
              {stats.ready} listo{stats.ready !== 1 ? 's' : ''}
            </div>
          )}
          {stats.reserved > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,193,7,0.12)', color: '#FFD54F', border: '1px solid rgba(255,193,7,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFC107]" />
              {stats.reserved} reserva{stats.reserved !== 1 ? 's' : ''}
            </div>
          )}
          {takeawayOrders.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full shrink-0" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
              🥡 {takeawayOrders.length}
            </div>
          )}
        </div>

        {/* Main tab switcher: Resumen | Plano */}
        <div className="flex px-5 gap-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {(['dashboard', 'plano'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={cn(
                'flex-1 py-2.5 text-xs font-semibold transition-all border-b-2 press-scale',
                mainTab === tab
                  ? 'text-[#EAD9B1] border-[#EAD9B1]'
                  : 'text-white/30 border-transparent',
              )}
            >
              {tab === 'dashboard' ? 'Resumen' : 'Plano'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content — keyed so CSS animation replays on tab switch ── */}
      {mainTab === 'dashboard' ? (
        <div key="dashboard" className="tab-slide-in">
          <DashboardView
            trackingItems={trackingItems}
            stats={stats}
            todayReservations={todayReservations}
            stockOut={stockOut}
            stockLow={stockLow}
            totalActiveTables={stats.total}
            onTablePress={handleTablePress}
          />
        </div>
      ) : (
        /* Plano — light green canvas over the dark green page */
        <div
          key="plano"
          className="rounded-t-3xl mt-1 min-h-screen tab-slide-in"
          style={{ background: '#EEF6EF' }}
        >
          {/* Zone tabs */}
          <div className="flex px-4 pt-1 border-b border-[#D8EBD9] bg-[#EEF6EF]">
            {ZONE_TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveZone(key)}
                className={cn(
                  'flex-1 py-2.5 text-xs font-semibold transition-all border-b-2 press-scale',
                  activeZone === key
                    ? 'text-[#1B3428] border-[#1B3428]'
                    : 'text-[#8AAE8F] border-transparent',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tables */}
          <div style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 120px)', paddingTop: '24px' }}>
            {activeZone === 'all' ? (
              <>
                <ZoneSection label="Salón 1"  tables={zoneGroups.salon1}  {...zoneSharedProps} />
                <ZoneSection label="Salón 2"  tables={zoneGroups.salon2}  {...zoneSharedProps} />
                <ZoneSection label="Terraza"  tables={zoneGroups.terrace} {...zoneSharedProps} />
              </>
            ) : (
              <ZoneSection tables={zoneGroups[activeZone] ?? []} {...zoneSharedProps} />
            )}
            <TakeawayStrip orders={takeawayOrders} cardsByOrder={cardsByOrder} />
          </div>

          {/* Legend */}
          <div className="fixed left-0 right-0 pointer-events-none z-10" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 96px)' }}>
            <div className="px-4 overflow-x-auto pb-1 no-scrollbar">
              <div className="flex gap-2 w-max">
                {LEGEND.map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-[#D8EBD9] pointer-events-auto">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-[#4A7A5A] font-medium whitespace-nowrap">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom padding for dark bg dashboard ── */}
      {mainTab === 'dashboard' && (
        <div style={{ height: 'calc(env(safe-area-inset-bottom) + 72px)' }} />
      )}

      {/* ── Table detail modal ── */}
      {selectedTable && (
        <TableModal
          table={selectedTable}
          stateData={tableStateMap.get(selectedTable.id) ?? { state: 'libre', cards: [], itemCount: 0, personCount: 0 }}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}
