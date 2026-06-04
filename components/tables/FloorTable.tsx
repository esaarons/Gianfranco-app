'use client'

import { cn } from '@/lib/utils'
import { useNow } from '@/hooks/useNow'

// ── Visual state system ───────────────────────────────────────────────────────

export type FloorState = 'libre' | 'ocupada' | 'preparando' | 'listo' | 'limpieza' | 'reservada'

export const FLOOR_STATE = {
  libre:      { bg: '#EFF7EF', border: '#6DBF70', chair: '#C8E6C9', dot: '#4CAF50', label: 'Libre',      dotAnim: '' },
  ocupada:    { bg: '#EBF3FD', border: '#5BA3E8', chair: '#BBDEFB', dot: '#2196F3', label: 'Ocupada',    dotAnim: '' },
  preparando: { bg: '#FFF8F0', border: '#FFB347', chair: '#FFE0B2', dot: '#FF9800', label: 'Preparando', dotAnim: 'dot-pulse-amber' },
  listo:      { bg: '#F5F0FA', border: '#BA68C8', chair: '#E1BEE7', dot: '#9C27B0', label: 'Listo ✓',   dotAnim: 'dot-pulse' },
  limpieza:   { bg: '#F5F5F5', border: '#BDBDBD', chair: '#E0E0E0', dot: '#9E9E9E', label: 'Limpieza',   dotAnim: '' },
  reservada:  { bg: '#FFFDF0', border: '#FFD740', chair: '#FFF9C4', dot: '#FFC107', label: 'Reservada',  dotAnim: '' },
} as const

function elapsedMin(iso: string, now: number): number {
  return Math.floor((now - new Date(iso).getTime()) / 60_000)
}

function elapsedLabel(min: number): string {
  if (min < 1)  return 'ahora'
  if (min < 60) return `${min}m`
  return `${Math.floor(min / 60)}h${min % 60 > 0 ? `${min % 60}m` : ''}`
}

// ── Chair layout helpers ──────────────────────────────────────────────────────

interface ChairLayout { top: number; bottom: number; left: number; right: number }

function chairLayout(capacity: number): ChairLayout {
  if (capacity <= 2) return { top: 1, bottom: 1, left: 0, right: 0 }
  if (capacity <= 4) return { top: 2, bottom: 2, left: 0, right: 0 }
  if (capacity <= 6) return { top: 2, bottom: 2, left: 1, right: 1 }
  return { top: 3, bottom: 3, left: 1, right: 1 }
}

function Chairs({ count, color, horizontal }: { count: number; color: string; horizontal?: boolean }) {
  if (!count) return null
  return (
    <div className={cn('flex items-center justify-center', horizontal ? 'flex-col gap-1' : 'flex-row gap-1')}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('rounded-sm border transition-colors duration-300', horizontal ? 'w-2.5 h-4' : 'w-4 h-2.5')}
          style={{ backgroundColor: color, borderColor: color + 'cc' }}
        />
      ))}
    </div>
  )
}

// ── Single table visual ───────────────────────────────────────────────────────

interface FloorTableProps {
  code: string
  capacity: number
  state: FloorState
  occupiedSince?: string
  items?: number
  persons?: number
  selected?: boolean
  joinPulse?: boolean
  isMergeNew?: boolean
  onClick?: () => void
}

export function FloorTable({
  code, capacity, state, occupiedSince,
  items, persons, selected, joinPulse, onClick,
}: FloorTableProps) {
  const now      = useNow(60_000)
  const cfg      = FLOOR_STATE[state]
  const layout   = chairLayout(capacity)
  const isActive = state !== 'libre' && state !== 'limpieza' && state !== 'reservada'
  const elapsed  = isActive && occupiedSince ? elapsedMin(occupiedSince, now) : null

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-1 select-none transition-transform duration-200 active:scale-95',
        selected && 'scale-[1.06]',
        joinPulse && 'join-pulse',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {/* Top chairs */}
      <Chairs count={layout.top} color={cfg.chair} />

      {/* Middle row: side chairs + table body */}
      <div className="flex items-center gap-1">
        <Chairs count={layout.left} color={cfg.chair} horizontal />

        {/* Table body */}
        <div
          className="relative rounded-2xl flex flex-col items-center justify-center transition-all duration-300"
          style={{
            width: capacity <= 2 ? 72 : capacity <= 4 ? 84 : 96,
            height: capacity <= 2 ? 60 : capacity <= 4 ? 72 : 80,
            backgroundColor: cfg.bg,
            borderWidth: selected ? 2.5 : 1.5,
            borderStyle: 'solid',
            borderColor: selected ? cfg.dot : cfg.border,
            boxShadow: selected
              ? `0 0 0 3px ${cfg.dot}40, 0 4px 16px ${cfg.dot}25`
              : `0 2px 8px rgba(0,0,0,0.06)`,
          }}
        >
          {/* Status dot */}
          <div
            className={cn('absolute top-2 right-2 w-1.5 h-1.5 rounded-full', cfg.dotAnim)}
            style={{ backgroundColor: cfg.dot }}
          />

          {/* Table code */}
          <p className="font-bold text-[13px] leading-none tracking-tight" style={{ color: '#1F1F1F' }}>
            {code}
          </p>

          {/* Time + info */}
          {elapsed !== null && (
            <p className={cn(
              'text-[10px] font-semibold mt-1 leading-none',
              elapsed >= 30 ? 'text-[#B8574E]' : elapsed >= 15 ? 'text-[#C98933]' : 'text-[#8A8278]'
            )}>
              {elapsedLabel(elapsed)}
            </p>
          )}

          {state === 'reservada' && (
            <p className="text-[10px] font-semibold mt-1 leading-none" style={{ color: cfg.dot }}>
              Reservada
            </p>
          )}

          {/* Person + items row */}
          {(persons || items) ? (
            <div className="flex items-center gap-1.5 mt-1">
              {persons != null && persons > 0 && (
                <span className="text-[9px] text-[#8A8278] flex items-center gap-0.5">
                  <span>👤</span>{persons}
                </span>
              )}
              {items != null && items > 0 && (
                <span className="text-[9px] text-[#8A8278] flex items-center gap-0.5">
                  <span>🍽</span>{items}
                </span>
              )}
            </div>
          ) : null}
        </div>

        <Chairs count={layout.right} color={cfg.chair} horizontal />
      </div>

      {/* Bottom chairs */}
      <Chairs count={layout.bottom} color={cfg.chair} />
    </button>
  )
}

// ── Merged / joined table visual ──────────────────────────────────────────────

interface FloorGroupTableProps {
  codes: string[]
  totalCapacity: number
  state: FloorState
  occupiedSince?: string
  items?: number
  persons?: number
  selected?: boolean
  isMergeNew?: boolean
  onClick?: () => void
}

export function FloorGroupTable({
  codes, totalCapacity, state, occupiedSince,
  items, persons, selected, isMergeNew, onClick,
}: FloorGroupTableProps) {
  const now     = useNow(60_000)
  const cfg     = FLOOR_STATE[state]
  const isActive = state !== 'libre' && state !== 'limpieza'
  const elapsed  = isActive && occupiedSince ? elapsedMin(occupiedSince, now) : null
  const topChairs = Math.min(totalCapacity, codes.length * 2 + 1)
  const bodyWidth = 72 + codes.length * 44

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center gap-1 select-none transition-transform duration-200 active:scale-95',
        selected && 'scale-[1.04]',
        isMergeNew && 'merge-pop',
        onClick ? 'cursor-pointer' : 'cursor-default'
      )}
    >
      {/* Top chairs row */}
      <div className="flex gap-1 justify-center">
        {Array.from({ length: Math.min(topChairs, 6) }).map((_, i) => (
          <div key={i} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: cfg.chair, borderColor: cfg.chair + 'cc', borderWidth: 1 }} />
        ))}
      </div>

      {/* Wide table body */}
      <div
        className="rounded-2xl flex flex-col items-center justify-center transition-all duration-300 px-4 py-3"
        style={{
          width: bodyWidth,
          minHeight: 72,
          backgroundColor: cfg.bg,
          borderWidth: selected ? 2.5 : 1.5,
          borderStyle: 'solid',
          borderColor: selected ? cfg.dot : cfg.border,
          boxShadow: selected ? `0 0 0 3px ${cfg.dot}40, 0 4px 16px ${cfg.dot}25` : `0 2px 8px rgba(0,0,0,0.06)`,
        }}
      >
        <div className="flex items-center gap-1">
          {codes.map((c, i) => (
            <span key={c} className="flex items-center gap-1">
              {i > 0 && <span className="text-[10px] font-bold" style={{ color: cfg.dot + '80' }}>+</span>}
              <span className="font-bold text-[13px] tracking-tight" style={{ color: '#1F1F1F' }}>{c}</span>
            </span>
          ))}
        </div>
        {elapsed !== null && (
          <p className={cn(
            'text-[10px] font-semibold mt-1',
            elapsed >= 30 ? 'text-[#B8574E]' : elapsed >= 15 ? 'text-[#C98933]' : 'text-[#8A8278]'
          )}>
            {elapsedLabel(elapsed)}
          </p>
        )}
        {(persons || items) ? (
          <div className="flex items-center gap-2 mt-1">
            {persons != null && persons > 0 && <span className="text-[9px] text-[#8A8278]">👤{persons}</span>}
            {items != null && items > 0   && <span className="text-[9px] text-[#8A8278]">🍽{items}</span>}
          </div>
        ) : null}
      </div>

      {/* Bottom chairs */}
      <div className="flex gap-1 justify-center">
        {Array.from({ length: Math.min(topChairs, 6) }).map((_, i) => (
          <div key={i} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: cfg.chair, borderWidth: 1 }} />
        ))}
      </div>
    </button>
  )
}
