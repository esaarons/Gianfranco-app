'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProducts } from '@/hooks/useProducts'
import { SoundEnabler } from '@/components/notifications/SoundEnabler'
import { formatTime, formatPrice, cn } from '@/lib/utils'
import { ZONE_LABELS } from '@/lib/constants'
import Link from 'next/link'
import type { Order, AreaCard, Reservation } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsed(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1)  return 'ahora'
  if (diff < 60) return `${diff} min`
  return `${Math.floor(diff / 60)}h ${diff % 60 > 0 ? `${diff % 60}m` : ''}`
}

function todayDate(): string {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local tz
}

function reservationTime(r: Reservation): string {
  return r.start_time.slice(0, 5)
}

function minutesUntil(date: string, time: string): number {
  const dt = new Date(`${date}T${time}`)
  return Math.round((dt.getTime() - Date.now()) / 60000)
}

// ── Timeline step types ────────────────────────────────────────────────────────

type StepState = 'active' | 'done' | 'pending-area'

interface TimelineStep {
  id: string
  label: string
  sublabel: string
  time?: string
  state: StepState
  accent: string
  dotBg: string
}

function buildSteps(order: Order, cards: AreaCard[]): TimelineStep[] {
  const barCard     = cards.find(c => c.area?.type === 'bar')
  const kitchenCard = cards.find(c => c.area?.type === 'kitchen')

  const barItems     = order.items?.filter(i => i.area_id === barCard?.area_id) ?? []
  const kitchenItems = order.items?.filter(i => i.area_id === kitchenCard?.area_id) ?? []

  // Fallback: group by area type from items if cards don't tell us
  const hasBarItems     = barItems.length > 0 || (barCard != null)
  const hasKitchenItems = kitchenItems.length > 0 || (kitchenCard != null)

  const barStatus     = barCard?.status     ?? 'none'
  const kitchenStatus = kitchenCard?.status ?? 'none'

  const allDelivered =
    (!hasBarItems     || barStatus === 'delivered') &&
    (!hasKitchenItems || kitchenStatus === 'delivered')

  const steps: TimelineStep[] = []

  // ── Top: "Listo para servir" — only when all areas done ─────────────────
  if (allDelivered && (hasBarItems || hasKitchenItems)) {
    steps.push({
      id: 'ready',
      label: 'Listo para servir',
      sublabel: 'Todo listo — llevar a la mesa',
      state: 'active',
      accent: '#6D8A5C',
      dotBg: 'bg-[#6D8A5C]',
    })
  }

  // ── Barra ────────────────────────────────────────────────────────────────
  if (hasBarItems) {
    const count = barItems.length || (barCard?.order?.items?.filter(i => i.area?.type === 'bar').length ?? 0)
    const itemLabel = count > 0 ? `${count} bebida${count !== 1 ? 's' : ''}` : 'Bebidas'

    const cfg = barStatus === 'delivered'
      ? { label: `Barra · Listo ✓`, sublabel: itemLabel, state: 'done' as StepState, accent: '#6D8A5C', dotBg: 'bg-[#6D8A5C]' }
      : barStatus === 'received'
      ? { label: 'Barra · Preparando', sublabel: itemLabel, state: allDelivered ? 'done' as StepState : 'active' as StepState, accent: '#6D9EEB', dotBg: 'bg-[#6D9EEB]' }
      : { label: 'Barra · Pendiente', sublabel: itemLabel, state: allDelivered ? 'done' as StepState : 'pending-area' as StepState, accent: '#C98933', dotBg: 'bg-[#C98933]' }

    steps.push({ id: 'bar', time: barCard?.created_at ? formatTime(barCard.created_at) : undefined, ...cfg })
  }

  // ── Cocina ───────────────────────────────────────────────────────────────
  if (hasKitchenItems) {
    const count = kitchenItems.length || 0
    const itemLabel = count > 0 ? `${count} plato${count !== 1 ? 's' : ''}` : 'Platos'

    const cfg = kitchenStatus === 'delivered'
      ? { label: `Cocina · Listo ✓`, sublabel: itemLabel, state: 'done' as StepState, accent: '#6D8A5C', dotBg: 'bg-[#6D8A5C]' }
      : kitchenStatus === 'received'
      ? { label: 'Cocina · Preparando', sublabel: itemLabel, state: allDelivered ? 'done' as StepState : 'active' as StepState, accent: '#6D9EEB', dotBg: 'bg-[#6D9EEB]' }
      : { label: 'Cocina · Pendiente', sublabel: itemLabel, state: allDelivered ? 'done' as StepState : 'pending-area' as StepState, accent: '#C98933', dotBg: 'bg-[#C98933]' }

    steps.push({ id: 'kitchen', time: kitchenCard?.created_at ? formatTime(kitchenCard.created_at) : undefined, ...cfg })
  }

  // ── Bottom: pedido tomado ─────────────────────────────────────────────────
  const totalItems = order.items?.length ?? 0
  steps.push({
    id: 'created',
    label: 'Pedido tomado',
    sublabel: totalItems > 0 ? `${totalItems} ítem${totalItems !== 1 ? 's' : ''}` : 'Sin ítems',
    time: formatTime(order.created_at),
    state: 'done',
    accent: '#A9A39C',
    dotBg: 'bg-[#A9A39C]',
  })

  return steps
}

// ── OrderTimelineCard ─────────────────────────────────────────────────────────

function OrderTimelineCard({ order, cards }: { order: Order; cards: AreaCard[] }) {
  const steps = buildSteps(order, cards)
  const isAllReady = steps[0]?.id === 'ready'
  const total = order.items?.reduce((s, item) => {
    const mods = item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0
    return s + (item.unit_price + mods) * item.quantity
  }, 0) ?? 0

  return (
    <div className={cn(
      'bg-white rounded-2xl border overflow-hidden card-shadow transition-all',
      isAllReady ? 'border-[#6D8A5C]/40' : 'border-[#E7E1D8]'
    )}>
      {/* Card header */}
      <div className={cn(
        'flex items-center justify-between px-4 pt-4 pb-3',
        isAllReady && 'bg-[#F1F5EE]'
      )}>
        <div className="flex items-center gap-2.5">
          {isAllReady && <span className="w-2 h-2 rounded-full bg-[#6D8A5C] dot-pulse shrink-0" />}
          <div>
            <p className={cn(
              'font-bold text-base leading-none tracking-tight',
              isAllReady ? 'text-[#3D5E30]' : 'text-[#1F1F1F]'
            )}>
              {order.table ? `Mesa ${order.table.code}` : order.type === 'takeaway' ? '🥡 Para llevar' : 'Pedido'}
            </p>
            {order.table?.zone && (
              <p className="text-[#A9A39C] text-[11px] mt-0.5">{ZONE_LABELS[order.table.zone] ?? order.table.zone}</p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-[#A9A39C] text-xs">{elapsed(order.created_at)}</p>
          {total > 0 && <p className="text-[#3D5E30] text-xs font-bold mt-0.5">{formatPrice(total)}</p>}
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 pb-4">
        {steps.map((step, idx) => {
          const isLast   = idx === steps.length - 1
          const isActive = step.state === 'active'
          const isDone   = step.state === 'done'

          return (
            <div key={step.id} className="flex gap-3">
              {/* Dot + connector line */}
              <div className="flex flex-col items-center" style={{ minWidth: 20 }}>
                <div className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all',
                  isActive
                    ? `${step.dotBg} shadow-md`
                    : isDone
                    ? 'bg-[#E7E1D8]'
                    : 'border-2 border-[#E7E1D8] bg-white'
                )}>
                  {isActive && <span className="w-2 h-2 rounded-full bg-white" />}
                  {isDone    && <span className="w-2 h-2 rounded-full bg-[#A9A39C]" />}
                </div>
                {!isLast && (
                  <div className={cn(
                    'w-px flex-1 my-1',
                    isActive ? 'bg-[#E7E1D8]' : 'bg-[#E7E1D8]'
                  )}
                  style={{ minHeight: 16, borderLeft: `2px dashed ${isActive ? step.accent + '40' : '#E7E1D8'}` }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={cn('flex-1 pb-3', isLast && 'pb-0')}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn(
                    'text-sm font-semibold leading-snug',
                    isActive ? '' : isDone ? 'text-[#A9A39C]' : 'text-[#C7C2BA]'
                  )}
                  style={isActive ? { color: step.accent } : undefined}>
                    {step.label}
                  </p>
                  {step.time && (
                    <span className={cn(
                      'text-[11px] shrink-0',
                      isActive ? 'font-semibold' : 'text-[#C7C2BA]'
                    )}
                    style={isActive ? { color: step.accent } : undefined}>
                      {step.time}
                    </span>
                  )}
                </div>
                <p className={cn(
                  'text-[11px] mt-0.5',
                  isActive ? 'text-[#7A756D]' : 'text-[#C7C2BA]'
                )}>
                  {step.sublabel}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Reservation card ──────────────────────────────────────────────────────────

function ReservationCard({ r }: { r: Reservation }) {
  const mins = minutesUntil(r.date, r.start_time)
  const isImminent = mins >= 0 && mins <= 30
  const isPast     = mins < 0

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-2xl px-4 py-3 border',
      isImminent
        ? 'bg-[#FEF4E6] border-[#C98933]/30'
        : isPast
        ? 'bg-white border-[#E7E1D8] opacity-60'
        : 'bg-white border-[#E7E1D8]'
    )}>
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0',
        isImminent ? 'bg-[#C98933]/15' : 'bg-[#F7F5F0]'
      )}>
        📅
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-bold text-sm text-[#1F1F1F] truncate">{r.customer_name}</p>
          <span className={cn(
            'text-xs font-bold shrink-0',
            isImminent ? 'text-[#9A6520]' : 'text-[#7A756D]'
          )}>
            {reservationTime(r)}
            {isImminent && ` · en ${mins} min`}
          </span>
        </div>
        <p className="text-[#7A756D] text-xs mt-0.5">
          {r.party_size} personas
          {r.zone ? ` · ${ZONE_LABELS[r.zone] ?? r.zone}` : ''}
          {r.menu_type ? ` · ${r.menu_type === 'brunch' ? 'Brunch' : 'Simple'}` : ''}
        </p>
        {r.notes && (
          <p className="text-[#A9A39C] text-[11px] italic mt-0.5 truncate">"{r.notes}"</p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SalonPage() {
  const [now, setNow] = useState<string>('')

  useEffect(() => {
    const update = () => setNow(new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }))
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  // ── Data ──────────────────────────────────────────────────────────────────

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
  })

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ['reservations', 'today'],
    queryFn: async () => {
      const date = todayDate()
      const res = await fetch(`/api/reservations?date=${date}&status=pending,confirmed,in_progress`)
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 60_000,
  })

  const { data: products = [] } = useProducts()

  // ── Derived data ──────────────────────────────────────────────────────────

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

  // Only table orders, sorted: ready first → then by oldest
  const tableOrders = useMemo(() => {
    const orders = openOrders.filter(o => o.table_id)
    return orders.sort((a, b) => {
      const aCards = cardsByOrder.get(a.id) ?? []
      const bCards = cardsByOrder.get(b.id) ?? []
      const aReady = aCards.length > 0 && aCards.every(c => c.status === 'delivered')
      const bReady = bCards.length > 0 && bCards.every(c => c.status === 'delivered')
      if (aReady && !bReady) return -1
      if (!aReady && bReady) return  1
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [openOrders, cardsByOrder])

  const stockAlerts = useMemo(() =>
    products.filter(p => p.active && (p.stock_status === 'low' || p.stock_status === 'out')),
    [products]
  )

  const readyCount = tableOrders.filter(o => {
    const cards = cardsByOrder.get(o.id) ?? []
    return cards.length > 0 && cards.every(c => c.status === 'delivered')
  }).length

  // Reservations sorted by start_time, skip already-finished
  const upcomingReservations = reservations
    .filter(r => minutesUntil(r.date, r.start_time) > -60)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      <SoundEnabler />

      {/* ── Header ── */}
      <div className="px-5 pt-8 pb-4">
        <p className="section-label mb-1">Vista de servicio</p>
        <div className="flex items-center justify-between">
          <h1 className="text-[#1F1F1F] text-2xl font-bold tracking-tight">Salón</h1>
          <div className="flex items-center gap-2">
            {now && <span className="text-[#A9A39C] text-sm">{now}</span>}
            {readyCount > 0 && (
              <span className="flex items-center gap-1.5 bg-[#6D8A5C]/12 text-[#3D5E30] text-xs font-bold px-3 py-1.5 rounded-full border border-[#6D8A5C]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6D8A5C] dot-pulse" />
                {readyCount} listo{readyCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Reservas de hoy ── */}
      {upcomingReservations.length > 0 && (
        <section className="px-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="section-label">Reservas hoy</p>
            <span className="bg-[#1E3541]/10 text-[#1E3541] text-[10px] font-bold px-2 py-0.5 rounded-full">
              {upcomingReservations.length}
            </span>
          </div>
          <div className="space-y-2">
            {upcomingReservations.map(r => <ReservationCard key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {/* ── Alertas de stock ── */}
      {stockAlerts.length > 0 && (
        <section className="px-4 mb-4">
          <p className="section-label mb-2">Stock</p>
          <div className="bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden card-shadow">
            {stockAlerts.map((p, idx) => (
              <div
                key={p.id}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  idx < stockAlerts.length - 1 && 'border-b border-[#F2EFE9]'
                )}
              >
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0',
                  p.stock_status === 'out'
                    ? 'bg-[#B8574E]/15 text-[#8B3A3A]'
                    : 'bg-[#C98933]/15 text-[#9A6520]'
                )}>
                  {p.stock_status === 'out' ? '86' : '85'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1F1F1F] truncate">{p.name}</p>
                  <p className={cn(
                    'text-[11px] font-medium',
                    p.stock_status === 'out' ? 'text-[#B8574E]' : 'text-[#C98933]'
                  )}>
                    {p.stock_status === 'out' ? 'Sin stock — no ofrecer' : 'Poco stock — avisar al cliente'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Pedidos activos ── */}
      <section className="px-4 pb-8">
        <div className="flex items-center justify-between mb-2.5">
          <p className="section-label">Pedidos activos</p>
          <Link
            href="/tables"
            className="flex items-center gap-1.5 bg-[#1E3541] text-white text-xs font-bold px-3 py-1.5 rounded-full press-scale"
          >
            <span>🗺️</span>
            <span>Ir al salón</span>
          </Link>
        </div>

        {tableOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40">
            <p className="text-3xl mb-2 opacity-40">🪑</p>
            <p className="text-[#7A756D] text-sm font-medium">Sin pedidos activos</p>
            <p className="text-[#A9A39C] text-xs mt-1">El salón está listo para recibir</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tableOrders.map(order => (
              <OrderTimelineCard
                key={order.id}
                order={order}
                cards={cardsByOrder.get(order.id) ?? []}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
