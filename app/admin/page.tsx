'use client'

import { useQuery } from '@tanstack/react-query'
import { useTables } from '@/hooks/useTables'
import { useAreaCards } from '@/hooks/useCards'
import { ZONE_LABELS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Table, Order } from '@/types'

const BAR_AREA_ID     = 'aaaaaaaa-0000-0000-0000-000000000001'
const KITCHEN_AREA_ID = 'aaaaaaaa-0000-0000-0000-000000000002'

// ── Time elapsed ──────────────────────────────────────────────────────────────
function elapsed(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1)  return 'ahora'
  if (diff < 60) return `${diff}m`
  return `${Math.floor(diff / 60)}h${diff % 60 > 0 ? ` ${diff % 60}m` : ''}`
}

// ── Station card ──────────────────────────────────────────────────────────────
function StationCard({
  label, href, icon, pending, received, accentColor, bgColor,
}: {
  label: string; href: string; icon: string;
  pending: number; received: number;
  accentColor: string; bgColor: string;
}) {
  return (
    <Link
      href={href}
      className="relative rounded-2xl border border-[#E8E4DC] bg-white p-4 press-scale card-shadow transition-all hover:border-[#D4CFC5] block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: bgColor }}>
          {icon}
        </div>
        {pending > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: accentColor + '15', color: accentColor }}>
            <span className="w-1.5 h-1.5 rounded-full dot-pulse-amber" style={{ background: accentColor }} />
            {pending}
          </span>
        )}
      </div>
      <p className="font-bold text-[#252525] text-sm">{label}</p>
      <div className="flex gap-3 mt-1.5">
        {pending > 0 && (
          <span className="text-[11px] text-[#8A8278]">
            <span className="font-semibold" style={{ color: accentColor }}>{pending}</span> pend.
          </span>
        )}
        {received > 0 && (
          <span className="text-[11px] text-[#8A8278]">
            <span className="font-semibold text-[#6D9EEB]">{received}</span> prep.
          </span>
        )}
        {pending === 0 && received === 0 && (
          <span className="text-[11px] text-[#B0AB9F]">Sin actividad</span>
        )}
      </div>
    </Link>
  )
}

// ── Table status dot ──────────────────────────────────────────────────────────
const TABLE_DOT: Record<string, { dot: string; chip: string }> = {
  free:     { dot: 'bg-[#9DAA7D]',  chip: 'bg-[#C9D4C2]/50 text-[#4A6B4E] border-[#C9D4C2]' },
  occupied: { dot: 'bg-[#7A9E7E] dot-pulse', chip: 'bg-[#7A9E7E]/15 text-[#3D6B42] border-[#7A9E7E]/30' },
  cleaning: { dot: 'bg-[#C8B8AA]',  chip: 'bg-[#C8B8AA]/30 text-[#7C5640] border-[#C8B8AA]/40' },
}

export default function AdminPage() {
  const { data: tables = [] }       = useTables()
  const { data: barCards = [] }     = useAreaCards(BAR_AREA_ID)
  const { data: kitchenCards = [] } = useAreaCards(KITCHEN_AREA_ID)

  const { data: openOrders = [] } = useQuery<Order[]>({
    queryKey: ['orders', 'open'],
    queryFn: async () => {
      const res = await fetch('/api/orders?status=open')
      return res.json()
    },
    refetchInterval: 15000,
  })

  const freeTables     = tables.filter((t) => t.status === 'free').length
  const occupiedTables = tables.filter((t) => t.status === 'occupied').length
  const cleaningTables = tables.filter((t) => t.status === 'cleaning').length
  const barPending     = barCards.filter((c) => c.status === 'pending').length
  const barReceived    = barCards.filter((c) => c.status === 'received').length
  const kitchenPending = kitchenCards.filter((c) => c.status === 'pending').length
  const kitchenReceived= kitchenCards.filter((c) => c.status === 'received').length

  const tablesByZone: Record<string, Table[]> = {}
  tables.forEach((t) => {
    if (!tablesByZone[t.zone]) tablesByZone[t.zone] = []
    tablesByZone[t.zone].push(t)
  })

  // Recent open orders (most recent first, max 5)
  const recentOrders = [...openOrders]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-[#F6F2EA]">

      {/* Header */}
      <div className="px-5 pt-10 pb-4">
        <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Centro operativo</p>
        <h1 className="text-[#252525] text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <div className="px-4 pb-10 space-y-5">

        {/* ── Table summary ──────────────────────────────────────────────────── */}
        <div className="bg-white border border-[#E8E4DC] rounded-2xl p-4 card-shadow">
          <p className="text-[#8A8278] text-[10px] uppercase tracking-widest font-semibold mb-3">Estado de mesas</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#3D6B42]">{occupiedTables}</p>
              <p className="text-[10px] text-[#8A8278] mt-0.5 font-medium">Ocupadas</p>
            </div>
            <div className="text-center border-x border-[#F0EDE8]">
              <p className="text-2xl font-bold text-[#4A6B4E]">{freeTables}</p>
              <p className="text-[10px] text-[#8A8278] mt-0.5 font-medium">Libres</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#7C5640]">{cleaningTables}</p>
              <p className="text-[10px] text-[#8A8278] mt-0.5 font-medium">Limpieza</p>
            </div>
          </div>
        </div>

        {/* ── Station status ─────────────────────────────────────────────────── */}
        <div>
          <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.15em] font-semibold mb-2.5 px-1">Estaciones</p>
          <div className="grid grid-cols-2 gap-2.5">
            <StationCard
              label="Salón" href="/tables" icon="🗺️"
              pending={0} received={0}
              accentColor="#7A9E7E" bgColor="#F2F7F3"
            />
            <StationCard
              label="Barra" href="/bar" icon="☕"
              pending={barPending} received={barReceived}
              accentColor="#E08A50" bgColor="#FEF3E8"
            />
            <StationCard
              label="Cocina" href="/kitchen" icon="🍳"
              pending={kitchenPending} received={kitchenReceived}
              accentColor="#C76868" bgColor="#FEF0F0"
            />
            <StationCard
              label="Delivery" href="/delivery" icon="📦"
              pending={0} received={0}
              accentColor="#6D9EEB" bgColor="#EEF4FC"
            />
          </div>
        </div>

        {/* ── Active orders ──────────────────────────────────────────────────── */}
        {recentOrders.length > 0 && (
          <div>
            <div className="flex items-center justify-between px-1 mb-2.5">
              <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.15em] font-semibold">
                Pedidos activos
              </p>
              <Link href="/admin/orders" className="text-[#0F3A43] text-xs font-semibold hover:underline">
                Ver todos →
              </Link>
            </div>
            <div className="bg-white border border-[#E8E4DC] rounded-2xl overflow-hidden card-shadow">
              {recentOrders.map((order, idx) => (
                <div key={order.id}
                     className={cn('px-4 py-3 flex items-center justify-between', idx < recentOrders.length - 1 && 'border-b border-[#F0EDE8]')}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#F6F2EA] flex items-center justify-center shrink-0 text-sm">
                      {order.type === 'takeaway' ? '🥡' : order.table ? '🪑' : '📦'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#252525] text-sm leading-none truncate">
                        {order.type === 'takeaway' ? 'Para llevar' : order.table ? `Mesa ${order.table.code}` : 'Delivery'}
                      </p>
                      <p className="text-[#B0AB9F] text-[11px] mt-0.5">
                        {elapsed(order.created_at)} · {order.items?.length ?? 0} ítem{(order.items?.length ?? 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Table grid by zone ─────────────────────────────────────────────── */}
        <div>
          <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.15em] font-semibold mb-2.5 px-1">Mapa rápido</p>
          <div className="bg-white border border-[#E8E4DC] rounded-2xl overflow-hidden card-shadow">
            {Object.entries(tablesByZone).map(([zone, zoneTables], idx, arr) => (
              <div key={zone} className={idx < arr.length - 1 ? 'border-b border-[#F0EDE8]' : ''}>
                <div className="px-4 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-[#B0AB9F] uppercase tracking-widest">{ZONE_LABELS[zone]}</p>
                </div>
                <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                  {zoneTables.map((table) => {
                    const cfg = TABLE_DOT[table.status]
                    return (
                      <div key={table.id} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold', cfg.chip)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                        {table.code}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Config shortcuts ───────────────────────────────────────────────── */}
        <div>
          <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.15em] font-semibold mb-2.5 px-1">Gestión</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { href: '/admin/orders',        label: 'Historial',  icon: '📋' },
              { href: '/admin/reservations',  label: 'Reservas',   icon: '📅' },
              { href: '/admin/reports',       label: 'Reportes',   icon: '📊' },
              { href: '/admin/logs',          label: 'Actividad',  icon: '🗂️' },
              { href: '/admin/products',      label: 'Productos',  icon: '🍽' },
              { href: '/admin/modifiers',     label: 'Modif.',     icon: '🧩' },
              { href: '/staff',               label: 'Personal',   icon: '👥' },
              { href: '/settings',            label: 'Ajustes',    icon: '⚙️' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white border border-[#E8E4DC] rounded-xl px-3 py-3.5 flex flex-col items-center gap-1.5 text-sm font-semibold text-[#3A3630] press-scale hover:border-[#D4CFC5] hover:bg-[#F9F7F3] transition-all card-shadow"
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[11px] text-[#8A8278] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
