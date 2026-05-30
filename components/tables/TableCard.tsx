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

// ── Time elapsed helper ───────────────────────────────────────────────────────

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
  animSend?: boolean
  animReceive?: boolean
  orderTotal?: number
}

export function TableCard({
  table, onClick, selected, joinSource, joinTarget, animSend, animReceive, orderTotal,
}: TableCardProps) {
  const cfg = STATUS_CONFIG[table.status]

  return (
    <button
      onClick={() => onClick?.(table)}
      className={cn(
        'relative flex flex-col items-center justify-between rounded-2xl border p-2.5 w-full aspect-square min-h-[72px]',
        'select-none card-shadow',
        animSend    && 'join-send',
        animReceive && 'join-receive',
        !animSend && !animReceive && (
          joinSource
            ? 'bg-[#FEF3E8] border-[#D79A57]/70 glow-pendiente scale-[1.06] transition-all duration-200'
            : joinTarget
              ? 'bg-white border-[#0F3A43]/20 opacity-75 hover:opacity-100 hover:border-[#0F3A43]/40 transition-all duration-200'
              : cn(cfg.card, cfg.glow, 'press-scale transition-all duration-200', selected && 'glow-selected scale-[1.06]')
        ),
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {/* Top: seat dots */}
      <div className="flex gap-0.5 self-start">
        {Array.from({ length: Math.min(table.capacity, 6) }).map((_, i) => (
          <div key={i} className={cn(
            'w-1.5 h-1.5 rounded-full',
            joinSource ? 'bg-[#D79A57]' : cfg.dot,
            i === 0 && table.status === 'occupied' && !joinSource ? cfg.dotAnim : ''
          )} />
        ))}
      </div>

      {/* Center: table code */}
      <span className={cn(
        'text-[22px] font-bold tracking-tight leading-none',
        joinSource ? 'text-[#D79A57]' : cfg.code
      )}>
        {table.code}
      </span>

      {/* Bottom: status badge OR total */}
      <span className={cn(
        'text-[9px] font-bold px-2 py-0.5 rounded-full tracking-widest uppercase w-full text-center',
        joinSource
          ? 'bg-[#D79A57]/20 text-[#D79A57]'
          : joinTarget
            ? 'bg-[#0F3A43]/8 text-[#0F3A43]/50'
            : cfg.badge
      )}>
        {joinSource
          ? 'Origen'
          : joinTarget
            ? 'Unir'
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

// ── Merged table card (col-span-2) ────────────────────────────────────────────

interface MergedTableCardProps {
  parent: Table
  child: Table
  onClick?: (table: Table) => void
  selected?: boolean
  orderTotal?: number
}

export function MergedTableCard({ parent, child, onClick, selected, orderTotal }: MergedTableCardProps) {
  const cfg = STATUS_CONFIG[parent.status]
  const totalCapacity = parent.capacity + child.capacity

  return (
    <button
      onClick={() => onClick?.(parent)}
      className={cn(
        'col-span-2 relative flex items-center justify-center rounded-2xl border px-4 py-3 w-full',
        'select-none press-scale transition-all duration-200 fade-scale-in card-shadow',
        cfg.card, cfg.glow,
        selected && 'glow-selected scale-[1.03]',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
      style={{ minHeight: '72px' }}
    >
      {/* Left: parent code */}
      <div className="flex flex-col items-center gap-1 flex-1">
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(parent.capacity, 4) }).map((_, i) => (
            <div key={i} className={cn('w-1.5 h-1.5 rounded-full', cfg.dot, i === 0 && parent.status === 'occupied' ? cfg.dotAnim : '')} />
          ))}
        </div>
        <span className={cn('text-xl font-bold tracking-tight leading-none', cfg.code)}>{parent.code}</span>
      </div>

      {/* Center: link icon */}
      <div className="flex flex-col items-center gap-0.5 px-2">
        <div className="flex items-center gap-1">
          <div className="w-3 h-px bg-[#252525]/15" />
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#252525]/25">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <div className="w-3 h-px bg-[#252525]/15" />
        </div>
        <span className="text-[8px] text-[#252525]/30 font-bold uppercase tracking-wider">
          {totalCapacity}p
        </span>
      </div>

      {/* Right: child code */}
      <div className="flex flex-col items-center gap-1 flex-1">
        <div className="flex gap-0.5">
          {Array.from({ length: Math.min(child.capacity, 4) }).map((_, i) => (
            <div key={i} className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
          ))}
        </div>
        <span className={cn('text-xl font-bold tracking-tight leading-none', cfg.code)}>{child.code}</span>
      </div>

      {/* Status badge — absolute bottom center */}
      <span className={cn(
        'absolute bottom-1.5 text-[9px] font-bold px-2.5 py-0.5 rounded-full tracking-widest uppercase',
        cfg.badge
      )}>
        {(parent.status === 'occupied' && orderTotal != null && orderTotal > 0)
          ? formatPrice(orderTotal)
          : parent.status === 'occupied'
            ? elapsed(parent.updated_at)
            : cfg.label}
      </span>
    </button>
  )
}
