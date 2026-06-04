'use client'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/utils'
import type { Table } from '@/types'

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  free: {
    label:   'Libre',
    card:    'bg-white border-[#E8E4DC]',
    code:    'text-[#3A3630]',
    badge:   'bg-[#C9D4C2]/50 text-[#4A6B4E]',
    dot:     'bg-[#9DAA7D]',
    glow:    '',
    dotAnim: '',
  },
  occupied: {
    label:   'Ocupada',
    card:    'bg-[#F2F7F3] border-[#7A9E7E]/40',
    code:    'text-[#252525]',
    badge:   'bg-[#7A9E7E]/20 text-[#3D6B42]',
    dot:     'bg-[#7A9E7E]',
    glow:    'glow-occupied',
    dotAnim: 'dot-pulse',
  },
  cleaning: {
    label:   'Limpieza',
    card:    'bg-[#FAF7F4] border-[#C8B8AA]/50',
    code:    'text-[#7C5640]',
    badge:   'bg-[#C8B8AA]/35 text-[#7C5640]/90',
    dot:     'bg-[#C8B8AA]',
    glow:    'glow-cleaning',
    dotAnim: '',
  },
}

function elapsed(updatedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000)
  if (diff < 1)  return 'ahora'
  if (diff < 60) return `${diff}m`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

// ── Single table card ─────────────────────────────────────────────────────────

interface TableCardProps {
  table: Table
  onClick?: (table: Table) => void
  selected?: boolean
  joinSource?: boolean
  joinTarget?: boolean
  joinPulse?: boolean
  orderTotal?: number
  orderStatus?: 'ready' | 'preparing'
}

export function TableCard({
  table, onClick, selected, joinSource, joinTarget, joinPulse, orderTotal, orderStatus,
}: TableCardProps) {
  const cfg = STATUS_CONFIG[table.status]
  const isReady     = table.status === 'occupied' && orderStatus === 'ready'
  const isPreparing = table.status === 'occupied' && orderStatus === 'preparing'

  return (
    <button
      onClick={() => onClick?.(table)}
      className={cn(
        'relative flex flex-col items-center justify-between rounded-2xl border p-2.5 w-full aspect-square min-h-[72px]',
        'select-none card-shadow',
        joinPulse
          ? cn('bg-[#FEF3E8] border-[#D79A57]/60 join-pulse')
          : joinSource
            ? 'bg-[#FEF3E8] border-[#D79A57]/70 glow-pendiente scale-[1.06] transition-all duration-200'
            : joinTarget
              ? 'bg-white border-[#0F3A43]/20 opacity-75 hover:opacity-100 hover:border-[#0F3A43]/40 transition-all duration-200'
              : isReady
                ? cn('bg-[#EEF7EE] border-[#5A9E60]/40 glow-occupied press-scale transition-all duration-200', selected && 'glow-selected scale-[1.06]')
                : cn(cfg.card, cfg.glow, 'press-scale transition-all duration-200', selected && 'glow-selected scale-[1.06]'),
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {/* Top: seat dots */}
      <div className="flex gap-0.5 self-start">
        {Array.from({ length: Math.min(table.capacity, 6) }).map((_, i) => (
          <div key={i} className={cn(
            'w-1.5 h-1.5 rounded-full',
            joinSource
              ? 'bg-[#D79A57]'
              : isReady
                ? (i === 0 ? 'bg-[#5A9E60] dot-pulse' : 'bg-[#5A9E60]')
                : cfg.dot,
            !joinSource && !isReady && i === 0 && table.status === 'occupied' ? cfg.dotAnim : ''
          )} />
        ))}
      </div>

      {/* Center: table code */}
      <span className={cn(
        'text-[22px] font-bold tracking-tight leading-none',
        joinSource ? 'text-[#D79A57]' : isReady ? 'text-[#1E4D22]' : cfg.code
      )}>
        {table.code}
      </span>

      {/* Bottom: status badge */}
      <span className={cn(
        'text-[9px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase w-full text-center',
        joinSource
          ? 'bg-[#D79A57]/20 text-[#D79A57]'
          : joinTarget
            ? 'bg-[#0F3A43]/8 text-[#0F3A43]/50'
            : isReady
              ? 'bg-[#5A9E60]/20 text-[#1E4D22]'
              : isPreparing
                ? 'bg-[#C98933]/15 text-[#7A4E10]'
                : cfg.badge
      )}>
        {joinSource
          ? 'Origen'
          : joinTarget
            ? 'Unir'
            : isReady
              ? 'Listo ✓'
              : isPreparing
                ? (orderTotal != null && orderTotal > 0 ? formatPrice(orderTotal) : 'Prep.')
                : (table.status === 'occupied' && orderTotal != null && orderTotal > 0)
                  ? formatPrice(orderTotal)
                  : table.status === 'occupied'
                    ? elapsed(table.updated_at)
                    : cfg.label}
      </span>

      {table.parent_table_id && !joinSource && !joinTarget && (
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0F3A43]/20" title="Unida" />
      )}
    </button>
  )
}

// ── Group table card — N tables merged into one ───────────────────────────────
// Shows "8 + 9 + 10" with capacity badge. Spans 2 columns for 1 child,
// 3 columns for 2+ children so the whole row is consumed at mobile width.

interface GroupTableCardProps {
  parent: Table
  children: Table[]
  onClick?: (table: Table) => void
  selected?: boolean
  orderTotal?: number
  orderStatus?: 'ready' | 'preparing'
  isMergeNew?: boolean
}

export function GroupTableCard({
  parent, children, onClick, selected, orderTotal, orderStatus, isMergeNew,
}: GroupTableCardProps) {
  const cfg = STATUS_CONFIG[parent.status]
  const all  = [parent, ...children]
  const totalCapacity = all.reduce((s, t) => s + t.capacity, 0)
  const colSpan = children.length >= 2 ? 'col-span-3' : 'col-span-2'
  const isReady     = parent.status === 'occupied' && orderStatus === 'ready'
  const isPreparing = parent.status === 'occupied' && orderStatus === 'preparing'

  return (
    <button
      onClick={() => onClick?.(parent)}
      className={cn(
        colSpan,
        'relative rounded-2xl border px-4 py-3 w-full min-h-[72px]',
        'select-none press-scale transition-all duration-200 card-shadow',
        isMergeNew ? 'merge-pop' : 'fade-scale-in',
        isReady ? 'bg-[#EEF7EE] border-[#5A9E60]/40 glow-occupied' : cn(cfg.card, cfg.glow),
        selected && 'glow-selected scale-[1.02]',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between gap-2">

        {/* Left: codes + seat row */}
        <div className="flex-1 min-w-0">
          {/* Seat dots — all tables combined, max 10 shown */}
          <div className="flex gap-0.5 mb-1.5">
            {Array.from({ length: Math.min(totalCapacity, 10) }).map((_, i) => (
              <div key={i} className={cn(
                'w-1.5 h-1.5 rounded-full',
                isReady
                  ? (i === 0 ? 'bg-[#5A9E60] dot-pulse' : 'bg-[#5A9E60]')
                  : cfg.dot,
                !isReady && i === 0 && parent.status === 'occupied' ? cfg.dotAnim : ''
              )} />
            ))}
          </div>
          {/* Table codes joined with + */}
          <div className="flex items-baseline gap-1 flex-wrap">
            {all.map((t, i) => (
              <span key={t.id} className="flex items-baseline gap-1">
                {i > 0 && (
                  <span className="text-[13px] font-bold leading-none" style={{ color: 'rgba(37,37,37,0.2)' }}>+</span>
                )}
                <span className={cn(
                  'text-xl font-bold tracking-tight leading-none',
                  isReady ? 'text-[#1E4D22]' : cfg.code
                )}>
                  {t.code}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: status / total badge */}
        <span className={cn(
          'text-[9px] font-bold px-2.5 py-1 rounded-full tracking-widest uppercase shrink-0 mt-0.5',
          isReady
            ? 'bg-[#5A9E60]/20 text-[#1E4D22]'
            : isPreparing
              ? 'bg-[#C98933]/15 text-[#7A4E10]'
              : cfg.badge
        )}>
          {isReady
            ? 'Listo ✓'
            : isPreparing
              ? (orderTotal != null && orderTotal > 0 ? formatPrice(orderTotal) : 'Prep.')
              : parent.status === 'occupied' && orderTotal != null && orderTotal > 0
                ? formatPrice(orderTotal)
                : parent.status === 'occupied'
                  ? elapsed(parent.updated_at)
                  : cfg.label}
        </span>
      </div>

      {/* Bottom metadata: group size + total capacity */}
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-[10px] font-semibold" style={{ color: 'rgba(37,37,37,0.3)' }}>
          {all.length} mesas · {totalCapacity} personas
        </span>
      </div>
    </button>
  )
}
