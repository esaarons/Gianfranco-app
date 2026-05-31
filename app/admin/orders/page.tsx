'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Order, OrderType } from '@/types'

// ── Period helpers ────────────────────────────────────────────────────────────
type Period = 'today' | 'yesterday' | 'week'

function getPeriodRange(period: Period): { from: string; to: string } {
  const now = new Date()
  const startOfDay = (d: Date) => {
    const x = new Date(d); x.setHours(0, 0, 0, 0); return x
  }
  const endOfDay = (d: Date) => {
    const x = new Date(d); x.setHours(23, 59, 59, 999); return x
  }

  if (period === 'today') {
    return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString() }
  }
  if (period === 'yesterday') {
    const y = new Date(now); y.setDate(y.getDate() - 1)
    return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString() }
  }
  // week
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 6)
  return { from: startOfDay(weekAgo).toISOString(), to: endOfDay(now).toISOString() }
}

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  table:    { icon: '🪑', label: 'Mesa',       color: 'text-[#A7B897]' },
  takeaway: { icon: '🥡', label: 'Para llevar', color: 'text-[#EAD9B1]' },
  delivery: { icon: '📦', label: 'Delivery',    color: 'text-[#C46F4E]' },
  task:     { icon: '📋', label: 'Tarea',       color: 'text-[#7A756D]' },
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}
function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
}

// ── Order card ────────────────────────────────────────────────────────────────
function OrderCard({ order, showDate }: { order: Order; showDate: boolean }) {
  const [open, setOpen] = useState(false)
  const cfg = TYPE_CONFIG[order.type] ?? TYPE_CONFIG.table

  const itemTotal = order.items?.reduce((s, item) => {
    const modTotal = item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0
    return s + (item.unit_price + modTotal) * item.quantity
  }, 0) ?? order.total ?? 0

  const title = order.type === 'table'
    ? `Mesa ${order.table?.code ?? '?'}`
    : cfg.label

  return (
    <div className={cn(
      'bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden transition-all card-shadow',
      open && 'border-[#D4CFC5]'
    )}>
      {/* Main row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left press-scale"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] flex items-center justify-center shrink-0 text-xl">
          {cfg.icon}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[#1F1F1F] text-sm font-bold truncate">{title}</p>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7A756D]">
              {cfg.label}
            </span>
          </div>
          <p className="text-[#7A756D] text-xs mt-0.5">
            {showDate ? `${formatDay(order.created_at)} · ` : ''}{formatHour(order.created_at)}
            {order.closed_at && ` → ${formatHour(order.closed_at)}`}
            {' · '}{order.items?.length ?? 0} producto{(order.items?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total */}
        <div className="shrink-0 text-right">
          <p className="text-[#1E3541] font-bold text-sm">{formatPrice(itemTotal)}</p>
          <p className="text-[10px] mt-0.5 text-[#A9A39C]">
            {open ? '▲ cerrar' : '▼ ver'}
          </p>
        </div>
      </button>

      {/* Items detail */}
      {open && (
        <div className="border-t border-[#EDE9E2] px-4 py-3 space-y-2">
          {order.items?.map(item => {
            const modTotal = item.modifiers?.reduce((s, m) => s + m.price, 0) ?? 0
            const lineTotal = (item.unit_price + modTotal) * item.quantity
            return (
              <div key={item.id} className="flex items-start gap-3">
                <span className="text-[#7A756D] text-xs font-bold w-6 shrink-0 pt-0.5">{item.quantity}×</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[#1F1F1F] text-xs font-medium">{item.product?.name}</p>
                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-[#A9A39C] text-[10px] mt-0.5">
                      {item.modifiers.map(m => m.modifier?.name).join(' · ')}
                    </p>
                  )}
                  {item.notes && (
                    <p className="text-[#C98933] text-[10px] italic mt-0.5">"{item.notes}"</p>
                  )}
                </div>
                <span className="text-[#1F1F1F] text-xs font-semibold shrink-0">{formatPrice(lineTotal)}</span>
              </div>
            )
          })}
          <div className="flex justify-between pt-2 border-t border-[#EDE9E2] mt-1">
            <span className="text-[#7A756D] text-xs">Total</span>
            <span className="text-[#1E3541] text-sm font-bold">{formatPrice(itemTotal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
const PERIOD_LABELS: Record<Period, string> = {
  today:     'Hoy',
  yesterday: 'Ayer',
  week:      '7 días',
}

const TYPE_FILTERS: Array<{ value: OrderType | 'all'; label: string }> = [
  { value: 'all',      label: 'Todos'       },
  { value: 'table',    label: 'Mesa'        },
  { value: 'takeaway', label: 'Para llevar' },
  { value: 'delivery', label: 'Delivery'    },
]

export default function OrderHistoryPage() {
  const router = useRouter()
  const [period, setPeriod]     = useState<Period>('today')
  const [typeFilter, setType]   = useState<OrderType | 'all'>('all')

  const { from, to } = getPeriodRange(period)

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders-history', period],
    queryFn: async () => {
      const res = await fetch(`/api/orders?status=closed&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      if (!res.ok) return []
      return res.json()
    },
  })

  const filtered = useMemo(() =>
    typeFilter === 'all' ? orders : orders.filter(o => o.type === typeFilter),
    [orders, typeFilter]
  )

  const totalRevenue = filtered.reduce((s, o) => {
    const t = o.items?.reduce((sum, item) => {
      const modTotal = item.modifiers?.reduce((m, mod) => m + mod.price, 0) ?? 0
      return sum + (item.unit_price + modTotal) * item.quantity
    }, 0) ?? o.total ?? 0
    return s + t
  }, 0)

  return (
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* Header */}
      <div className="px-5 pt-8 pb-5 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-white border border-[#E7E1D8] text-[#1F1F1F] press-scale shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <p className="section-label mb-0.5">Administración</p>
            <h1 className="text-[#1F1F1F] text-2xl font-bold tracking-tight leading-tight">Historial de Pedidos</h1>
          </div>
        </div>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 px-5 mb-4">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-bold transition-all press-scale',
              period === p
                ? 'bg-[#1E3541] text-white'
                : 'bg-white border border-[#E7E1D8] text-[#7A756D]'
            )}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 px-5 mb-5 overflow-x-auto scrollbar-hide">
        {TYPE_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all press-scale',
              typeFilter === f.value
                ? 'bg-[#1E3541] text-white'
                : 'bg-white border border-[#E7E1D8] text-[#7A756D]'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary card */}
      {!isLoading && (
        <div className="mx-5 mb-5 bg-white border border-[#E7E1D8] rounded-2xl px-5 py-4 flex items-center justify-between card-shadow">
          <div>
            <p className="section-label mb-1">
              {filtered.length} pedido{filtered.length !== 1 ? 's' : ''}
            </p>
            <p className="text-[#1E3541] text-2xl font-bold tracking-tight">{formatPrice(totalRevenue)}</p>
          </div>
          <div className="text-4xl opacity-15">📋</div>
        </div>
      )}

      {/* List */}
      <div className="px-5 pb-10 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 bg-white border border-[#E7E1D8] rounded-2xl animate-pulse" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <p className="text-5xl mb-4 opacity-25">🧾</p>
            <p className="text-[#7A756D] text-sm font-medium">Sin pedidos en este período</p>
          </div>
        ) : (
          filtered.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              showDate={period === 'week'}
            />
          ))
        )}
      </div>
    </div>
  )
}
