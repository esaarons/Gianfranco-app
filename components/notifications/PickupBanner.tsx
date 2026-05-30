'use client'

import { useState } from 'react'
import { usePickupCards } from '@/hooks/usePickupCards'
import { cn } from '@/lib/utils'
import { AREA_IDS } from '@/lib/constants'

function elapsed(ts: string | null): string {
  if (!ts) return ''
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1)  return 'ahora'
  if (diff < 60) return `${diff}m`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

export function PickupBanner() {
  const { data: cards = [] } = usePickupCards()
  const [open, setOpen] = useState(false)

  if (cards.length === 0) return null

  return (
    <div className="mx-4 mb-3 shrink-0 fade-in">
      {/* Header pill */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 bg-[#F0FDF4] border border-[#86EFAC]/60 rounded-2xl px-4 py-3 press-scale transition-all"
      >
        <span className="flex items-center gap-1 text-base shrink-0">
          {cards.some(c => c.area_id === AREA_IDS.BAR)     && '☕'}
          {cards.some(c => c.area_id === AREA_IDS.KITCHEN) && '🍳'}
        </span>
        <div className="flex-1 text-left">
          <p className="text-[#166534] text-sm font-bold leading-none">
            {cards.length === 1 ? '1 pedido listo para recoger' : `${cards.length} pedidos listos para recoger`}
          </p>
        </div>
        <span className="text-[#166534]/60 text-xs font-medium shrink-0">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded list */}
      {open && (
        <div className="mt-1.5 space-y-1.5">
          {cards.map((card) => {
            const isBar    = card.area_id === AREA_IDS.BAR
            const icon     = isBar ? '☕' : '🍳'
            const areaName = isBar ? 'Barra' : 'Cocina'
            const order    = card.order
            const table    = order?.table
            const isTakeaway = order?.type === 'takeaway'

            // Items for this specific area
            const areaType  = isBar ? 'bar' : 'kitchen'
            const areaItems = order?.items?.filter(i => i.area?.type === areaType) ?? []
            const itemNames = areaItems
              .map(i => `${i.quantity > 1 ? i.quantity + '× ' : ''}${i.product?.name ?? ''}`)
              .filter(Boolean)
              .join(' · ')

            return (
              <div
                key={card.id}
                className="bg-white border border-[#D1FAE5] rounded-xl px-4 py-3 flex items-start gap-3"
              >
                <span className="text-xl mt-0.5 shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[#252525] text-sm font-bold">
                      {areaName}
                      {table ? ` · Mesa ${table.code}` : isTakeaway ? ' · Para llevar' : ''}
                    </p>
                    <span className="text-[#6B9CA8] text-[10px] font-medium shrink-0">
                      {elapsed(card.delivered_at ?? card.created_at)}
                    </span>
                  </div>
                  {itemNames && (
                    <p className="text-[#6A6460] text-xs mt-0.5 truncate">{itemNames}</p>
                  )}
                </div>
                <span className="text-[#86EFAC] text-lg shrink-0">✓</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
