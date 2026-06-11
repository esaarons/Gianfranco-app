'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { useTables } from '@/hooks/useTables'
import { useAreaCardsByType } from '@/hooks/useCards'
import { ZONE_LABELS } from '@/lib/constants'
import { cn, formatPrice } from '@/lib/utils'
import Link from 'next/link'
import { ReservationBanner } from '@/components/notifications/ReservationBanner'
import type { Table, Order, AreaCard } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function elapsed(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1)  return 'ahora'
  if (diff < 60) return `${diff}m`
  return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? ` ${diff % 60}m` : ''}`
}

function avgWaitMin(cards: { status: string; created_at: string }[]): number | null {
  const pending = cards.filter(c => c.status === 'pending')
  if (!pending.length) return null
  const sum = pending.reduce((s, c) => s + (Date.now() - new Date(c.created_at).getTime()) / 60000, 0)
  return sum / pending.length
}

type StatusType = 'ok' | 'warning' | 'critical'

function getOperationStatus(
  barCards: { status: string; created_at: string }[],
  kitchenCards: { status: string; created_at: string }[],
): { type: StatusType; msg: string; accent: string } {
  const maxWait = (cards: { status: string; created_at: string }[]) =>
    Math.max(0, ...cards.filter(c => c.status === 'pending').map(c =>
      (Date.now() - new Date(c.created_at).getTime()) / 60000))
  const top = Math.max(maxWait(barCards), maxWait(kitchenCards))
  if (top >= 15) return { type: 'critical', msg: 'Demora crítica en estaciones', accent: '#B8574E' }
  if (top >= 8)  return { type: 'warning',  msg: 'Atención requerida',           accent: '#C98933' }
  return { type: 'ok', msg: 'Todo operando correctamente', accent: '#4EA055' }
}

function computeAlerts(
  barCards: { status: string; created_at: string }[],
  kitchenCards: { status: string; created_at: string }[],
  openOrders: Order[],
): string[] {
  const alerts: string[] = []
  const late = (cards: { status: string; created_at: string }[], name: string) => {
    const n = cards.filter(c => c.status === 'pending' && (Date.now() - new Date(c.created_at).getTime()) / 60000 >= 8)
    if (n.length) alerts.push(`${name}: ${n.length} comanda${n.length > 1 ? 's' : ''} sin recibir (${Math.round((Date.now() - new Date(n[0].created_at).getTime()) / 60000)} min)`)
  }
  late(barCards, 'Barra')
  late(kitchenCards, 'Cocina')
  openOrders.filter(o => o.table && (Date.now() - new Date(o.created_at).getTime()) / 60000 >= 90)
    .slice(0, 2).forEach(o => o.table && alerts.push(`Mesa ${o.table.code} abierta hace ${Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000)} min`))
  return alerts
}

// ── Station carousel card ─────────────────────────────────────────────────────

function StationCard({
  label, href, emoji, accent, bg,
  pending, received, avgWait,
}: {
  label: string; href: string; emoji: string; accent: string; bg: string
  pending: number; received: number; avgWait: number | null
}) {
  const alerting = pending > 0 && (avgWait ?? 0) >= 8
  return (
    <Link
      href={href}
      className="shrink-0 flex flex-col gap-3.5 rounded-2xl border p-4 press-scale w-[148px]"
      style={{
        background: alerting ? accent + '08' : bg,
        borderColor: alerting ? accent + '45' : '#E7E1D8',
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ background: alerting ? accent + '18' : accent + '12' }}
        >
          {emoji}
        </div>
        {pending > 0 && (
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: accent, boxShadow: `0 2px 8px ${accent}50` }}
          >
            {pending}
          </div>
        )}
      </div>

      {/* Label + status */}
      <div>
        <p className="font-bold text-[#1F1F1F] text-sm leading-none">{label}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          {pending === 0 && received === 0 ? (
            <span className="text-[11px] text-[#A9A39C] font-medium">Lista</span>
          ) : (
            <>
              {pending > 0 && <span className="text-[11px] font-semibold" style={{ color: accent }}>{pending} pend.</span>}
              {received > 0 && <span className="text-[11px] text-[#4A87C7] font-semibold">{received} prep.</span>}
            </>
          )}
        </div>
        {avgWait != null && avgWait > 0 && (
          <p className="text-[10px] mt-1 font-medium" style={{ color: alerting ? accent : '#A9A39C' }}>
            Ø {avgWait.toFixed(1)} min
          </p>
        )}
      </div>

      {/* Bottom accent bar */}
      <div className="h-0.5 rounded-full w-full" style={{ background: pending > 0 ? accent + '50' : '#E7E1D8' }} />
    </Link>
  )
}

// ── Unified order card for admin ──────────────────────────────────────────────

function AdminOrderCard({
  order, barCard, kitchenCard,
}: {
  order: Order
  barCard?:     AreaCard
  kitchenCard?: AreaCard
}) {
  const barItems     = order.items?.filter(i => i.area?.type === 'bar')     ?? []
  const kitItems     = order.items?.filter(i => i.area?.type === 'kitchen') ?? []
  const otherItems   = order.items?.filter(i => i.area?.type !== 'bar' && i.area?.type !== 'kitchen') ?? []
  const total        = order.items?.reduce((s, item) => {
    const m = item.modifiers?.reduce((ms, mod) => ms + mod.price, 0) ?? 0
    return s + (item.unit_price + m) * item.quantity
  }, 0) ?? 0

  const cardBadge = (card?: AreaCard) => {
    if (!card) return null
    const label = card.status === 'delivered' ? '✓ Listo' : card.status === 'received' ? 'Preparando' : 'Pendiente'
    const color = card.status === 'delivered' ? '#4EA055' : card.status === 'received' ? '#C8913A' : '#F5A623'
    return (
      <span
        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: color + '18', color }}
      >
        {label}
      </span>
    )
  }

  return (
    <div className="bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#F2EFE9]">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">
            {order.type === 'takeaway' ? '🥡' : order.table ? '🪑' : '📦'}
          </span>
          <p className="font-bold text-[#1F1F1F] text-sm">
            {order.type === 'takeaway' ? `Para llevar ·${order.id.slice(-4).toUpperCase()}` : order.table ? `Mesa ${order.table.code}` : 'Delivery'}
          </p>
          <span className="text-[#A9A39C] text-[11px]">{elapsed(order.created_at)}</span>
        </div>
        {total > 0 && (
          <span className="text-[#1B3428] text-sm font-bold">{formatPrice(total)}</span>
        )}
      </div>

      {/* Area rows */}
      <div className="divide-y divide-[#F2EFE9]">
        {barItems.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-2.5">
            <div className="w-0.5 self-stretch rounded-full bg-[#C8913A] shrink-0 my-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[#C8913A] text-[10px] font-bold uppercase tracking-wide">Barra</span>
                {cardBadge(barCard)}
              </div>
              <p className="text-[#5C4E2E] text-[11px] leading-relaxed">
                {barItems.map(i => `${i.quantity}× ${i.product?.name ?? i.notes ?? '?'}`).join(' · ')}
              </p>
            </div>
          </div>
        )}
        {kitItems.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-2.5">
            <div className="w-0.5 self-stretch rounded-full bg-[#C46F4E] shrink-0 my-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[#C46F4E] text-[10px] font-bold uppercase tracking-wide">Cocina</span>
                {cardBadge(kitchenCard)}
              </div>
              <p className="text-[#5C4E2E] text-[11px] leading-relaxed">
                {kitItems.map(i => `${i.quantity}× ${i.product?.name ?? i.notes ?? '?'}`).join(' · ')}
              </p>
            </div>
          </div>
        )}
        {otherItems.length > 0 && (
          <div className="flex items-start gap-3 px-4 py-2.5">
            <div className="w-0.5 self-stretch rounded-full bg-[#A9A39C] shrink-0 my-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[#A9A39C] text-[10px] font-bold uppercase tracking-wide mb-0.5">Otros</p>
              <p className="text-[#5C4E2E] text-[11px] leading-relaxed">
                {otherItems.map(i => `${i.quantity}× ${i.product?.name ?? i.notes ?? '?'}`).join(' · ')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Shortcut tile ─────────────────────────────────────────────────────────────

function ShortcutTile({ href, icon, label, accent }: { href: string; icon: string; label: string; accent?: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3.5 press-scale transition-all text-center border"
      style={{
        background: accent ? accent + '08' : 'white',
        borderColor: accent ? accent + '25' : '#E7E1D8',
      }}
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[10px] font-semibold leading-tight" style={{ color: accent ? accent : '#7A756D' }}>
        {label}
      </span>
    </Link>
  )
}

// ── Table chip ────────────────────────────────────────────────────────────────

const TABLE_DOT: Record<string, { dot: string; chip: string; dotClass: string }> = {
  free:     { dot: '#9DAA7D',  chip: 'bg-[#C9D4C2]/50 text-[#4A6B4E] border-[#C9D4C2]',         dotClass: ''            },
  occupied: { dot: '#4EA055',  chip: 'bg-[#4EA055]/10 text-[#2B6130] border-[#4EA055]/30',       dotClass: 'dot-pulse'   },
  cleaning: { dot: '#C8B8AA',  chip: 'bg-[#C8B8AA]/25 text-[#7C5640] border-[#C8B8AA]/35',      dotClass: ''            },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: tables       = [] } = useTables()
  const { data: barCards     = [] } = useAreaCardsByType('bar')
  const { data: kitchenCards = [] } = useAreaCardsByType('kitchen')

  const { data: openOrders = [] } = useQuery<Order[]>({
    queryKey: ['orders', 'open'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=open')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 15_000,
  })

  const { data: staffActivity } = useQuery<{ active: number; absent: number; total: number }>({
    queryKey: ['analytics', 'staff-activity'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/staff-activity')
      if (!res.ok) return { active: 0, absent: 0, total: 0 }
      return res.json()
    },
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const occupiedTables  = tables.filter(t => t.status === 'occupied').length
  const freeTables      = tables.filter(t => t.status === 'free').length
  const cleaningTables  = tables.filter(t => t.status === 'cleaning').length
  const salonPending    = openOrders.filter(o => o.table != null).length
  const barPending      = barCards.filter(c => c.status === 'pending').length
  const barReceived     = barCards.filter(c => c.status === 'received').length
  const kitchenPending  = kitchenCards.filter(c => c.status === 'pending').length
  const kitchenReceived = kitchenCards.filter(c => c.status === 'received').length
  const barAvgWait      = avgWaitMin(barCards)
  const kitAvgWait      = avgWaitMin(kitchenCards)
  const activeStaff     = staffActivity?.active ?? 0
  const totalStaff      = staffActivity?.total  ?? 0

  const status  = getOperationStatus(barCards, kitchenCards)
  const alerts  = computeAlerts(barCards, kitchenCards, openOrders)

  const recentOrders = [...openOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6)

  const orderCards = useMemo(() => {
    const byOrderBar: Record<string, AreaCard> = {}
    const byOrderKit: Record<string, AreaCard> = {}
    barCards.forEach(c => { if (c.order_id) byOrderBar[c.order_id] = c })
    kitchenCards.forEach(c => { if (c.order_id) byOrderKit[c.order_id] = c })
    return recentOrders.map(o => ({
      order:       o,
      barCard:     byOrderBar[o.id],
      kitchenCard: byOrderKit[o.id],
    }))
  }, [recentOrders, barCards, kitchenCards])

  const tablesByZone: Record<string, Table[]> = {}
  tables.forEach(t => { tablesByZone[t.zone] = [...(tablesByZone[t.zone] ?? []), t] })

  const timeStr = now?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
  const dateStr = now?.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="min-h-screen bg-[#F5F2EC]">

      {/* ── HERO ── */}
      <div style={{ background: '#1B3428' }}>
        <div className="px-5 pt-10 pb-5">

          {/* Brand row */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-[0.28em] mb-1">
                Gianfranco Coffee Roasters
              </p>
              <h1 className="text-white text-2xl font-bold tracking-tight leading-none">
                Centro Operativo
              </h1>
              {now && (
                <p className="text-white/35 text-sm mt-1.5 capitalize">{dateStr} · {timeStr}</p>
              )}
            </div>

            {/* Free tables indicator */}
            <div
              className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <p className="text-white text-2xl font-bold leading-none">{freeTables}</p>
              <p className="text-white/35 text-[9px] uppercase tracking-wide mt-0.5">libres</p>
            </div>
          </div>

          {/* 3 key metrics */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { value: occupiedTables, label: 'Mesas activas' },
              { value: openOrders.length, label: 'Pedidos abiertos' },
              { value: activeStaff, sub: totalStaff > 0 ? `de ${totalStaff}` : undefined, label: 'Equipo activo' },
            ].map(({ value, label, sub }) => (
              <div
                key={label}
                className="rounded-2xl px-3 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-baseline justify-center gap-1">
                  <p className="text-white text-2xl font-bold leading-none">{value}</p>
                  {sub && <span className="text-white/30 text-xs">{sub}</span>}
                </div>
                <p className="text-white/40 text-[10px] mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Operational status */}
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: status.accent, boxShadow: `0 0 6px ${status.accent}80` }}
            />
            <p className="text-white/80 text-sm font-medium flex-1">{status.msg}</p>
            {cleaningTables > 0 && (
              <span className="text-white/25 text-[11px]">{cleaningTables} limpieza</span>
            )}
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="px-4 pt-5 pb-12 space-y-6">

        {/* Alerts */}
        {alerts.length > 0 && (
          <section
            className="rounded-2xl border p-4"
            style={{ background: '#FFFBF0', borderColor: '#C98933' + '30' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#C98933] dot-pulse-amber" />
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#C98933]">
                Alertas
              </p>
            </div>
            <div className="space-y-2">
              {alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[#C98933] text-xs mt-0.5 shrink-0">›</span>
                  <p className="text-[#5C4E2E] text-sm leading-snug">{a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Stations carousel ── */}
        <section>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A9A39C] mb-3 px-0.5">
            Estaciones
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
            <StationCard
              label="Salón"    href="/salon"    emoji="🗺️"
              accent="#4EA055" bg="#EEF6EF"
              pending={salonPending} received={occupiedTables} avgWait={null}
            />
            <StationCard
              label="Barra"   href="/bar"     emoji="☕"
              accent="#C8913A" bg="#FEF4E6"
              pending={barPending} received={barReceived} avgWait={barAvgWait}
            />
            <StationCard
              label="Cocina"  href="/kitchen" emoji="🍳"
              accent="#C46F4E" bg="#FEF0EE"
              pending={kitchenPending} received={kitchenReceived} avgWait={kitAvgWait}
            />
            <StationCard
              label="Delivery" href="/delivery" emoji="📦"
              accent="#4A87C7" bg="#EDF3FC"
              pending={0} received={0} avgWait={null}
            />
          </div>
        </section>

        <ReservationBanner />

        {/* ── Active orders ── */}
        {orderCards.length > 0 && (
          <section>
            <div className="flex items-center justify-between px-0.5 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A9A39C]">
                Pedidos activos
              </p>
              <Link href="/admin/orders" className="text-[#1B3428] text-xs font-semibold">
                Ver todos →
              </Link>
            </div>
            <div className="space-y-2.5">
              {orderCards.map(({ order, barCard, kitchenCard }) => (
                <AdminOrderCard key={order.id} order={order} barCard={barCard} kitchenCard={kitchenCard} />
              ))}
            </div>
          </section>
        )}

        {openOrders.length === 0 && tables.length > 0 && (
          <div className="rounded-2xl border border-dashed border-[#E7E1D8] py-10 text-center">
            <p className="text-3xl mb-2">🪑</p>
            <p className="text-[#7A756D] text-sm font-medium">Sin pedidos activos</p>
            <p className="text-[#A9A39C] text-xs mt-1">El salón está listo para recibir</p>
          </div>
        )}

        {/* ── Shortcuts ── */}
        <section className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A9A39C] mb-3 px-0.5">
              Operaciones
            </p>
            <div className="grid grid-cols-4 gap-2">
              <ShortcutTile href="/salon"              icon="🗺️" label="Salón"    accent="#4EA055" />
              <ShortcutTile href="/admin/orders"       icon="📋" label="Pedidos"  accent="#1B3428" />
              <ShortcutTile href="/admin/reservations" icon="📅" label="Reservas" accent="#C8913A" />
              <ShortcutTile href="/admin/operations"   icon="🎛" label="Turnos"   accent="#4A87C7" />
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A9A39C] mb-3 px-0.5">
              Gestión
            </p>
            <div className="grid grid-cols-4 gap-2">
              <ShortcutTile href="/admin/products"  icon="🍽" label="Productos"  />
              <ShortcutTile href="/admin/modifiers" icon="🧩" label="Modif."     />
              <ShortcutTile href="/staff"           icon="👥" label="Personal"   />
              <ShortcutTile href="/settings"        icon="⚙️" label="Ajustes"    />
            </div>
          </div>
        </section>

        {/* ── Quick table map ── */}
        {Object.keys(tablesByZone).length > 0 && (
          <section>
            <div className="flex items-center justify-between px-0.5 mb-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A9A39C]">
                Mapa de mesas
              </p>
              <Link href="/salon" className="text-[#1B3428] text-xs font-semibold">
                Ir al salón →
              </Link>
            </div>
            <div className="bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden">
              {Object.entries(tablesByZone).map(([zone, zoneTables], idx, arr) => (
                <div key={zone} className={idx < arr.length - 1 ? 'border-b border-[#F2EFE9]' : ''}>
                  <div className="px-4 pt-3 pb-1">
                    <p className="text-[10px] font-bold text-[#A9A39C] uppercase tracking-widest">
                      {ZONE_LABELS[zone]}
                    </p>
                  </div>
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {zoneTables.map(table => {
                      const cfg = TABLE_DOT[table.status] ?? TABLE_DOT.free
                      return (
                        <Link
                          key={table.id}
                          href="/salon"
                          className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold press-scale', cfg.chip)}
                        >
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dotClass)} style={{ background: cfg.dot }} />
                          {table.code}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
