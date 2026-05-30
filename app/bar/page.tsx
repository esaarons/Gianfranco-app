'use client'

import { useState } from 'react'
import { useAreaCards } from '@/hooks/useCards'
import { AreaCardComponent } from '@/components/cards/AreaCard'
import { SoundEnabler } from '@/components/notifications/SoundEnabler'
import { cn } from '@/lib/utils'

const BAR_AREA_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

type Tab = 'pending' | 'received' | 'delivered'

const TABS: { key: Tab; label: string; emptyMsg: string }[] = [
  { key: 'pending',   label: 'Pendientes',  emptyMsg: 'Sin pedidos nuevos' },
  { key: 'received',  label: 'Preparando',  emptyMsg: 'Nada en preparación' },
  { key: 'delivered', label: 'Listos',      emptyMsg: 'Nada listo aún' },
]

export default function BarPage() {
  const { data: cards = [], isLoading } = useAreaCards(BAR_AREA_ID)
  const [tab, setTab] = useState<Tab>('pending')

  const pending   = cards.filter((c) => c.status === 'pending')
  const received  = cards.filter((c) => c.status === 'received')
  const delivered = cards.filter((c) => c.status === 'delivered')

  const counts: Record<Tab, number> = { pending: pending.length, received: received.length, delivered: delivered.length }
  const visible = tab === 'pending' ? pending : tab === 'received' ? received : delivered.slice(0, 8)

  return (
    <div className="min-h-screen bg-[#F6F2EA]">
      <SoundEnabler />

      {/* Header */}
      <div className="px-5 pt-8 pb-3">
        <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Estación</p>
        <div className="flex items-center justify-between">
          <h1 className="text-[#252525] text-2xl font-bold tracking-tight">Barra</h1>
          {pending.length > 0 && (
            <span className="flex items-center gap-1.5 bg-[#E08A50]/12 text-[#A05A28] text-xs font-bold px-3 py-1.5 rounded-full border border-[#E08A50]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E08A50] dot-pulse-amber" />
              {pending.length} nuevo{pending.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pb-3">
        <div className="flex bg-white border border-[#E8E4DC] rounded-xl p-1 gap-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 press-scale',
                tab === t.key
                  ? 'bg-[#0F3A43] text-white shadow-sm'
                  : 'text-[#8A8278] hover:text-[#3A3630] hover:bg-[#F6F2EA]'
              )}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={cn(
                  'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none',
                  tab === t.key
                    ? t.key === 'pending' ? 'bg-[#E08A50] text-white' : 'bg-white/20 text-white'
                    : 'bg-[#E08A50]/15 text-[#A05A28]'
                )}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-[#E8E4DC] border-t-[#0F3A43] rounded-full animate-spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40">
          <p className="text-3xl mb-2 opacity-40">☕</p>
          <p className="text-[#8A8278] text-sm font-medium">{TABS.find((t) => t.key === tab)?.emptyMsg}</p>
        </div>
      ) : (
        <div className="px-4 pb-8 space-y-2.5">
          {visible.map((card) => (
            <AreaCardComponent key={card.id} card={card} myAreaType="bar" />
          ))}
        </div>
      )}
    </div>
  )
}
