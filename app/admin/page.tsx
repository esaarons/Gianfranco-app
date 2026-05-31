'use client'

import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useTables } from '@/hooks/useTables'
import { useAreaCards } from '@/hooks/useCards'
import { AREA_IDS, ZONE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'
import type { Table, Order } from '@/types'

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
  const WARN_MIN = 8
  const CRIT_MIN = 15
  const maxWait = (cards: { status: string; created_at: string }[]) =>
    Math.max(0, ...cards.filter(c => c.status === 'pending').map(c =>
      (Date.now() - new Date(c.created_at).getTime()) / 60000))
  const bar = maxWait(barCards)
  const kit = maxWait(kitchenCards)
  const top = Math.max(bar, kit)
  if (top >= CRIT_MIN) return { type: 'critical', msg: bar >= kit ? 'Barra presenta demora crítica' : 'Cocina presenta demora crítica', accent: '#B8574E' }
  if (top >= WARN_MIN) return { type: 'warning',  msg: bar >= kit ? 'Barra requiere atención' : 'Cocina requiere atención', accent: '#C98933' }
  return { type: 'ok', msg: 'Todo funcionando correctamente', accent: '#6D8A5C' }
}

function computeAlerts(
  barCards: { status: string; created_at: string; area?: unknown }[],
  kitchenCards: { status: string; created_at: string }[],
  openOrders: Order[],
): string[] {
  const CARD_ALERT = 8
  const TABLE_ALERT = 90
  const alerts: string[] = []

  const barLate = barCards.filter(c => c.status === 'pending' && (Date.now() - new Date(c.created_at).getTime()) / 60000 >= CARD_ALERT)
  const kitLate = kitchenCards.filter(c => c.status === 'pending' && (Date.now() - new Date(c.created_at).getTime()) / 60000 >= CARD_ALERT)
  if (barLate.length > 0) alerts.push(`Barra: ${barLate.length} comanda${barLate.length > 1 ? 's' : ''} sin recibir (${Math.round((Date.now() - new Date(barLate[0].created_at).getTime()) / 60000)} min)`)
  if (kitLate.length > 0) alerts.push(`Cocina: ${kitLate.length} comanda${kitLate.length > 1 ? 's' : ''} sin recibir (${Math.round((Date.now() - new Date(kitLate[0].created_at).getTime()) / 60000)} min)`)

  const longTables = openOrders.filter(o => o.table && (Date.now() - new Date(o.created_at).getTime()) / 60000 >= TABLE_ALERT)
  for (const o of longTables.slice(0, 2)) {
    if (o.table) alerts.push(`Mesa ${o.table.code} abierta hace ${Math.round((Date.now() - new Date(o.created_at).getTime()) / 60000)} min`)
  }
  return alerts
}

// ── Area card ─────────────────────────────────────────────────────────────────

function AreaCard({
  label, href, emoji, pending, received, avgWait, accent, bg, statusOk,
}: {
  label: string; href: string; emoji: string
  pending: number; received: number; avgWait: number | null
  accent: string; bg: string; statusOk: boolean
}) {
  const alerting = pending > 0 && (avgWait ?? 0) >= 8
  return (
    <Link
      href={href}
      className="relative flex flex-col gap-3 rounded-2xl border bg-white p-4 press-scale card-shadow transition-all hover:border-[#D4CFC5] block"
      style={{ borderColor: alerting ? accent + '40' : '#E7E1D8' }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: bg }}>
          {emoji}
        </div>
        {pending > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-full"
            style={{ background: accent + '15', color: accent }}>
            <span className="w-1.5 h-1.5 rounded-full dot-pulse-amber" style={{ background: accent }} />
            {pending}
          </span>
        )}
      </div>

      {/* Label */}
      <div>
        <p className="font-bold text-[#1F1F1F] text-sm leading-none">{label}</p>

        {/* Metrics */}
        <div className="flex items-center gap-3 mt-1.5">
          {pending > 0 && (
            <span className="text-[11px]" style={{ color: accent }}>
              <strong>{pending}</strong> pend.
            </span>
          )}
          {received > 0 && (
            <span className="text-[11px] text-[#6D9EEB]">
              <strong>{received}</strong> prep.
            </span>
          )}
          {pending === 0 && received === 0 && (
            <span className="text-[11px] text-[#A9A39C]">Lista</span>
          )}
        </div>

        {/* Avg wait */}
        {avgWait != null && avgWait > 0 && (
          <p className="text-[10px] mt-1 font-medium" style={{ color: alerting ? accent : '#A9A39C' }}>
            Ø {avgWait.toFixed(1)} min espera
          </p>
        )}
      </div>

      {/* Status bar */}
      <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full overflow-hidden">
        <div className="h-full w-full rounded-full"
          style={{ background: pending === 0 ? '#E7E1D8' : accent + '50' }} />
      </div>
    </Link>
  )
}

// ── Shortcut tile ─────────────────────────────────────────────────────────────

function ShortcutTile({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 bg-white border border-[#E7E1D8] rounded-xl px-2 py-3.5 press-scale hover:border-[#D4CFC5] hover:bg-[#F9F7F4] transition-all card-shadow text-center"
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[10px] text-[#7A756D] font-semibold leading-tight">{label}</span>
    </Link>
  )
}

// ── Table dot ─────────────────────────────────────────────────────────────────

const TABLE_DOT: Record<string, { dot: string; chip: string }> = {
  free:     { dot: 'bg-[#9DAA7D]',      chip: 'bg-[#C9D4C2]/50 text-[#4A6B4E] border-[#C9D4C2]' },
  occupied: { dot: 'bg-[#6D8A5C] dot-pulse', chip: 'bg-[#6D8A5C]/12 text-[#3D5E30] border-[#6D8A5C]/30' },
  cleaning: { dot: 'bg-[#C8B8AA]',      chip: 'bg-[#C8B8AA]/30 text-[#7C5640] border-[#C8B8AA]/40' },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: tables       = [] } = useTables()
  const { data: barCards     = [] } = useAreaCards(AREA_IDS.BAR)
  const { data: kitchenCards = [] } = useAreaCards(AREA_IDS.KITCHEN)

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

  // Live clock — set client-side only to avoid hydration mismatch
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Metrics
  const occupiedTables  = tables.filter(t => t.status === 'occupied').length
  const freeTables      = tables.filter(t => t.status === 'free').length
  const cleaningTables  = tables.filter(t => t.status === 'cleaning').length
  const barPending      = barCards.filter(c => c.status === 'pending').length
  const barReceived     = barCards.filter(c => c.status === 'received').length
  const kitchenPending  = kitchenCards.filter(c => c.status === 'pending').length
  const kitchenReceived = kitchenCards.filter(c => c.status === 'received').length
  const barAvgWait      = avgWaitMin(barCards)
  const kitAvgWait      = avgWaitMin(kitchenCards)

  const activeStaff = staffActivity?.active ?? 0
  const totalStaff  = staffActivity?.total  ?? 0

  const status  = getOperationStatus(barCards, kitchenCards)
  const alerts  = computeAlerts(barCards, kitchenCards, openOrders)

  const recentOrders = [...openOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)

  const tablesByZone: Record<string, Table[]> = {}
  tables.forEach(t => {
    if (!tablesByZone[t.zone]) tablesByZone[t.zone] = []
    tablesByZone[t.zone].push(t)
  })

  const dateStr = now?.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
  const timeStr = now?.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <div className="bg-[#1E3541] px-5 pt-10 pb-6 md:px-8 md:pt-14">

        {/* Brand + title */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/35 text-[10px] font-bold uppercase tracking-[0.28em] mb-1">Gianfranco</p>
            <h1 className="text-white text-2xl md:text-3xl font-bold tracking-tight leading-none">
              Centro Operativo
            </h1>
            {now && (
              <p className="text-white/45 text-sm mt-1.5 capitalize">{dateStr} · {timeStr}</p>
            )}
          </div>
          {/* Mesas libres indicator */}
          <div className="text-right mt-1">
            <p className="text-white/35 text-[10px] font-medium uppercase tracking-widest">Libres</p>
            <p className="text-white text-2xl font-bold leading-none mt-0.5">{freeTables}</p>
            <p className="text-white/35 text-[10px]">de {tables.length}</p>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <div className="bg-white/8 rounded-2xl px-3.5 py-3 text-center">
            <p className="text-white text-2xl font-bold leading-none">{occupiedTables}</p>
            <p className="text-white/45 text-[11px] mt-1 leading-none">Mesas activas</p>
          </div>
          <div className="bg-white/8 rounded-2xl px-3.5 py-3 text-center">
            <p className="text-white text-2xl font-bold leading-none">{openOrders.length}</p>
            <p className="text-white/45 text-[11px] mt-1 leading-none">Pedidos abiertos</p>
          </div>
          <div className="bg-white/8 rounded-2xl px-3.5 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 leading-none">
              <p className="text-white text-2xl font-bold leading-none">{activeStaff}</p>
              {(staffActivity?.absent ?? 0) > 0 && (
                <span className="text-white/40 text-sm font-medium">+{staffActivity!.absent}</span>
              )}
            </div>
            <p className="text-white/45 text-[11px] mt-1 leading-none">Equipo activo</p>
          </div>
        </div>

        {/* Status */}
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: status.accent, boxShadow: `0 0 6px ${status.accent}80` }}
          />
          <p className="text-white text-sm font-medium">{status.msg}</p>
          <div className="ml-auto flex items-center gap-3">
            {totalStaff > 0 && (
              <span className="text-white/30 text-[11px]">{activeStaff}/{totalStaff} equipo</span>
            )}
            {cleaningTables > 0 && (
              <span className="text-white/30 text-[11px]">{cleaningTables} limpieza</span>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div className="px-4 md:px-8 pt-5 pb-10 md:grid md:grid-cols-[1fr_360px] md:gap-6 md:items-start space-y-5 md:space-y-0">

        {/* ── LEFT ──────────────────────────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Area cards */}
          <section>
            <p className="section-label px-0.5 mb-2.5">Estaciones</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              <AreaCard
                label="Salón" href="/tables" emoji="🗺️"
                pending={0} received={occupiedTables} avgWait={null}
                accent="#6D8A5C" bg="#EEF3EA" statusOk
              />
              <AreaCard
                label="Barra" href="/bar" emoji="☕"
                pending={barPending} received={barReceived} avgWait={barAvgWait}
                accent="#C98933" bg="#FEF4E6" statusOk={barPending === 0}
              />
              <AreaCard
                label="Cocina" href="/kitchen" emoji="🍳"
                pending={kitchenPending} received={kitchenReceived} avgWait={kitAvgWait}
                accent="#B8574E" bg="#FEF0EE" statusOk={kitchenPending === 0}
              />
              <AreaCard
                label="Delivery" href="/delivery" emoji="📦"
                pending={0} received={0} avgWait={null}
                accent="#1E3541" bg="#EDF1F3" statusOk
              />
            </div>
          </section>

          {/* Alerts */}
          {alerts.length > 0 && (
            <section className="rounded-2xl border border-[#C98933]/30 bg-[#FFFAF0] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-[#C98933]" />
                <p className="section-label text-[#C98933]">Alertas operacionales</p>
              </div>
              <div className="space-y-2">
                {alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-[#C98933] text-xs mt-0.5 shrink-0">›</span>
                    <p className="text-[#5C4E2E] text-sm leading-snug">{a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active orders */}
          {recentOrders.length > 0 && (
            <section>
              <div className="flex items-center justify-between px-0.5 mb-2.5">
                <p className="section-label">Pedidos activos</p>
                <Link href="/admin/orders" className="text-[#1E3541] text-xs font-semibold hover:underline">
                  Ver todos →
                </Link>
              </div>
              <div className="bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden card-shadow">
                {recentOrders.map((order, idx) => {
                  const orderTotal = order.items?.reduce((s, item) => {
                    const m = item.modifiers?.reduce((ms, mod) => ms + mod.price, 0) ?? 0
                    return s + (item.unit_price + m) * item.quantity
                  }, 0) ?? 0
                  const isLast = idx === recentOrders.length - 1
                  return (
                    <div key={order.id}
                      className={cn('px-4 py-3 flex items-center justify-between', !isLast && 'border-b border-[#F2EFE9]')}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-[#F7F5F0] flex items-center justify-center shrink-0 text-sm">
                          {order.type === 'takeaway' ? '🥡' : order.table ? '🪑' : '📦'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1F1F1F] text-sm leading-none truncate">
                            {order.type === 'takeaway' ? 'Para llevar' : order.table ? `Mesa ${order.table.code}` : 'Delivery'}
                          </p>
                          <p className="text-[#A9A39C] text-[11px] mt-0.5">
                            {elapsed(order.created_at)} · {order.items?.length ?? 0} ítem{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {orderTotal > 0 && (
                        <span className="text-[#3D5E30] text-sm font-bold shrink-0 ml-2">{formatPrice(orderTotal)}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* No active orders empty state */}
          {openOrders.length === 0 && tables.length > 0 && (
            <div className="rounded-2xl border border-dashed border-[#E7E1D8] py-10 text-center">
              <p className="text-3xl mb-2">🪑</p>
              <p className="text-[#7A756D] text-sm font-medium">Sin pedidos activos</p>
              <p className="text-[#A9A39C] text-xs mt-1">El salón está listo para recibir</p>
            </div>
          )}

          {/* ── Shortcuts ─────────────────────────────────────────────────── */}
          <section className="space-y-3">

            <div>
              <p className="section-label px-0.5 mb-2.5">Operaciones</p>
              <div className="grid grid-cols-4 gap-2">
                <ShortcutTile href="/tables"           icon="🗺️"  label="Salón"    />
                <ShortcutTile href="/admin/orders"     icon="📋"  label="Pedidos"  />
                <ShortcutTile href="/admin/reservations" icon="📅" label="Reservas" />
                <ShortcutTile href="/admin/operations" icon="🎛" label="Turnos"   />
              </div>
            </div>

            <div>
              <p className="section-label px-0.5 mb-2.5">Inteligencia</p>
              <div className="grid grid-cols-4 gap-2">
                <ShortcutTile href="/admin/reports"    icon="📊"  label="Métricas"  />
                <ShortcutTile href="/admin/operations" icon="⏱"  label="Turnos"    />
                <ShortcutTile href="/admin/logs"       icon="🗂️"  label="Actividad" />
                <ShortcutTile href="/admin/operations/history" icon="📈" label="Historial" />
              </div>
            </div>

            <div>
              <p className="section-label px-0.5 mb-2.5">Gestión</p>
              <div className="grid grid-cols-4 gap-2">
                <ShortcutTile href="/admin/products"   icon="🍽"  label="Productos"  />
                <ShortcutTile href="/admin/modifiers"  icon="🧩"  label="Modif."     />
                <ShortcutTile href="/staff"            icon="👥"  label="Personal"   />
                <ShortcutTile href="/settings"         icon="⚙️"  label="Ajustes"    />
              </div>
            </div>

          </section>
        </div>

        {/* ── RIGHT — table map (desktop sidebar) ─────────────────────────── */}
        <div className="space-y-5">

          {/* Quick table map */}
          <section>
            <div className="flex items-center justify-between px-0.5 mb-2.5">
              <p className="section-label">Mapa de mesas</p>
              <Link href="/tables" className="text-[#1E3541] text-xs font-semibold hover:underline">
                Ir al salón →
              </Link>
            </div>
            <div className="bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden card-shadow">
              {Object.keys(tablesByZone).length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[#A9A39C] text-sm">Sin mesas configuradas</p>
                </div>
              ) : (
                Object.entries(tablesByZone).map(([zone, zoneTables], idx, arr) => (
                  <div key={zone} className={idx < arr.length - 1 ? 'border-b border-[#F2EFE9]' : ''}>
                    <div className="px-4 pt-3 pb-1">
                      <p className="text-[10px] font-bold text-[#A9A39C] uppercase tracking-widest">{ZONE_LABELS[zone]}</p>
                    </div>
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      {zoneTables.map(table => {
                        const cfg = TABLE_DOT[table.status] ?? TABLE_DOT.free
                        return (
                          <Link key={table.id} href="/tables"
                            className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold press-scale', cfg.chip)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                            {table.code}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Active queues (desktop) */}
          {(barPending > 0 || kitchenPending > 0) && (
            <section className="hidden md:block">
              <p className="section-label px-0.5 mb-2.5">Colas activas</p>
              <div className="space-y-2">
                {barPending > 0 && (
                  <Link href="/bar"
                    className="bg-white border rounded-2xl px-4 py-3 flex items-center justify-between card-shadow hover:opacity-80 transition-opacity press-scale block"
                    style={{ borderColor: '#C98933' + '35' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#C98933] dot-pulse-amber" />
                      <p className="font-semibold text-[#1F1F1F] text-sm">Barra</p>
                    </div>
                    <span className="text-[#C98933] font-bold text-sm">{barPending} pendiente{barPending !== 1 ? 's' : ''}</span>
                  </Link>
                )}
                {kitchenPending > 0 && (
                  <Link href="/kitchen"
                    className="bg-white border rounded-2xl px-4 py-3 flex items-center justify-between card-shadow hover:opacity-80 transition-opacity press-scale block"
                    style={{ borderColor: '#B8574E' + '35' }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-[#B8574E] dot-pulse-rust" />
                      <p className="font-semibold text-[#1F1F1F] text-sm">Cocina</p>
                    </div>
                    <span className="text-[#B8574E] font-bold text-sm">{kitchenPending} pendiente{kitchenPending !== 1 ? 's' : ''}</span>
                  </Link>
                )}
              </div>
            </section>
          )}

        </div>
      </div>
    </div>
  )
}
