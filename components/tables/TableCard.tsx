'use client'

import { cn } from '@/lib/utils'
import { TABLE_STATUS_CONFIG, ZONE_LABELS } from '@/lib/constants'
import type { Table } from '@/types'

interface TableCardProps {
  table: Table
  onClick?: (table: Table) => void
  selected?: boolean
  showZone?: boolean
}

const STATUS_STYLES = {
  free:     'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200',
  occupied: 'bg-emerald-50 border-emerald-400 text-emerald-800 hover:bg-emerald-100',
  cleaning: 'bg-gray-600 border-gray-500 text-white hover:bg-gray-700',
}

export function TableCard({ table, onClick, selected, showZone }: TableCardProps) {
  const config = TABLE_STATUS_CONFIG[table.status]

  return (
    <button
      onClick={() => onClick?.(table)}
      className={cn(
        'relative flex flex-col items-center justify-center rounded-2xl border-2 p-3 transition-all duration-150 select-none',
        'w-full aspect-square min-h-[80px]',
        STATUS_STYLES[table.status],
        selected && 'ring-4 ring-amber-400 ring-offset-2 scale-95',
        onClick && 'cursor-pointer active:scale-95',
        !onClick && 'cursor-default'
      )}
    >
      {/* Mesa code */}
      <span className="text-2xl font-bold leading-none">{table.code}</span>

      {/* Capacity */}
      <span className="text-xs mt-1 opacity-70">
        {'●'.repeat(table.capacity)}
      </span>

      {/* Status badge */}
      <span className={cn(
        'absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-medium px-1.5 py-0.5 rounded-full',
        table.status === 'cleaning' ? 'bg-gray-500 text-white' : 'bg-white/60 text-current'
      )}>
        {config.label}
      </span>

      {/* Joined indicator */}
      {table.parent_table_id && (
        <span className="absolute top-1 right-1 text-[9px] bg-amber-400 text-stone-900 px-1 rounded">
          UNIDA
        </span>
      )}
    </button>
  )
}
