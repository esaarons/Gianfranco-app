'use client'

import { useState } from 'react'
import { useAreaCardsByType } from '@/hooks/useCards'
import { useUnattendedAlerts } from '@/hooks/useUnattendedAlerts'
import { useProducts } from '@/hooks/useProducts'
import { useSound, MODE_CFG } from '@/hooks/useSound'
import { useWakeLock } from '@/hooks/useWakeLock'
import { AreaCardComponent } from '@/components/cards/AreaCard'
import { StockPanel } from '@/components/cards/StockPanel'
import { SoundEnabler } from '@/components/notifications/SoundEnabler'
import { cn } from '@/lib/utils'

type Tab = 'pending' | 'received' | 'delivered'

const TABS: { key: Tab; label: string; emptyMsg: string }[] = [
  { key: 'pending',   label: 'Pendientes', emptyMsg: 'Sin pedidos nuevos' },
  { key: 'received',  label: 'Preparando', emptyMsg: 'Nada en preparación' },
  { key: 'delivered', label: 'Listos',     emptyMsg: 'Nada listo aún' },
]

export default function KitchenPage() {
  const { data: cards = [], isLoading } = useAreaCardsByType('kitchen')
  const { data: products = [] }         = useProducts()
  const { mode, setMode, enabled, onShift } = useSound()
  useUnattendedAlerts(cards, 'Cocina')
  useWakeLock(enabled && onShift)  // keep screen on while on shift

  const [tab, setTab]             = useState<Tab>('pending')
  const [stockOpen, setStockOpen] = useState(false)
  const isRush = mode === 'cocina_ruidosa'

  const kitchenProducts = products.filter((p) => p.active && p.primary_area?.type === 'kitchen')
  const stockAlertCount = kitchenProducts.filter((p) => p.stock_status === 'out' || p.stock_status === 'low').length

  const pending   = cards.filter((c) => c.status === 'pending')
  const received  = cards.filter((c) => c.status === 'received')
  const delivered = cards.filter((c) => c.status === 'delivered')

  // Cards with active delay — shown first within each group
  const sortByDelay = (list: typeof cards) =>
    [...list].sort((a, b) => (b.delay_minutes ?? 0) - (a.delay_minutes ?? 0))

  const counts: Record<Tab, number> = { pending: pending.length, received: received.length, delivered: delivered.length }
  const rawVisible = tab === 'pending' ? pending : tab === 'received' ? received : delivered.slice(0, 8)
  const visible = isRush ? sortByDelay(rawVisible) : rawVisible

  function toggleRush() {
    setMode(isRush ? 'normal' : 'cocina_ruidosa')
  }

  return (
    <div className={cn('min-h-screen pt-safe', isRush ? 'bg-[#1A1208]' : 'bg-[#F7F5F0]')}>
      <SoundEnabler />

      {/* Header */}
      <div className="px-5 pt-8 pb-3">
        <p className={cn('section-label mb-1', isRush && 'text-[#EAD9B1]/50')}>Estación</p>
        <div className="flex items-center justify-between">
          <h1 className={cn('text-2xl font-bold tracking-tight', isRush ? 'text-[#EAD9B1]' : 'text-[#1F1F1F]')}>
            Cocina {isRush && <span className="text-lg ml-1">🔥</span>}
          </h1>
          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <span className={cn(
                'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border',
                isRush
                  ? 'bg-[#B8574E]/40 text-[#EAD9B1] border-[#B8574E]/50'
                  : 'bg-[#B8574E]/10 text-[#8B3A3A] border-[#B8574E]/20'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full bg-[#B8574E]', isRush ? 'dot-pulse-amber' : 'dot-pulse-rust')} />
                {pending.length} nuevo{pending.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={() => setStockOpen(true)}
              className={cn(
                'flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-all press-scale',
                stockAlertCount > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : isRush
                    ? 'bg-white/10 text-[#EAD9B1]/60 border-white/10'
                    : 'bg-white text-[#7A756D] border-[#E7E1D8]'
              )}
            >
              Stock
              {stockAlertCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center">{stockAlertCount}</span>
              )}
            </button>

            {/* Rush mode toggle */}
            {enabled && (
              <button
                onClick={toggleRush}
                title={isRush ? `Rush activo — ${MODE_CFG.cocina_ruidosa.label}` : 'Activar modo Rush'}
                className={cn(
                  'flex items-center justify-center w-9 h-9 rounded-xl border text-base transition-all press-scale',
                  isRush
                    ? 'bg-[#B8574E] border-[#B8574E] text-white'
                    : 'bg-white border-[#E7E1D8] text-[#7A756D]'
                )}
              >
                🔥
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-5 pb-3">
        <div className={cn(
          'flex rounded-xl p-1 gap-1',
          isRush ? 'bg-white/10 border border-white/10' : 'bg-white border border-[#E7E1D8]'
        )}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 press-scale',
                tab === t.key
                  ? isRush
                    ? 'bg-[#B8574E] text-white shadow-sm'
                    : 'bg-[#1E3541] text-white shadow-sm'
                  : isRush
                    ? 'text-[#EAD9B1]/60 hover:text-[#EAD9B1] hover:bg-white/5'
                    : 'text-[#7A756D] hover:text-[#1F1F1F] hover:bg-[#F7F5F0]'
              )}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={cn(
                  'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none',
                  tab === t.key
                    ? t.key === 'pending' ? 'bg-[#B8574E] text-white' : 'bg-white/20 text-white'
                    : isRush
                      ? 'bg-[#B8574E]/40 text-[#EAD9B1]'
                      : 'bg-[#B8574E]/12 text-[#8B3A3A]'
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
          <div className={cn('w-8 h-8 border-2 rounded-full animate-spin', isRush ? 'border-white/20 border-t-[#B8574E]' : 'border-[#E7E1D8] border-t-[#1E3541]')} />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40">
          <p className="text-3xl mb-2 opacity-40">🍳</p>
          <p className={cn('text-sm font-medium', isRush ? 'text-[#EAD9B1]/50' : 'text-[#7A756D]')}>
            {TABS.find((t) => t.key === tab)?.emptyMsg}
          </p>
        </div>
      ) : (
        <div className="px-4 pb-nav space-y-2.5">
          {visible.map((card) => (
            <AreaCardComponent key={card.id} card={card} myAreaType="kitchen" />
          ))}
        </div>
      )}

      {stockOpen && <StockPanel areaType="kitchen" onClose={() => setStockOpen(false)} />}
    </div>
  )
}
