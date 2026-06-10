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

const TABS: { key: Tab; label: string; emptyMsg: string; emptyIcon: string }[] = [
  { key: 'pending',   label: 'Nuevos',     emptyMsg: 'Sin pedidos nuevos',  emptyIcon: '🍳' },
  { key: 'received',  label: 'Preparando', emptyMsg: 'Nada en preparación', emptyIcon: '⏳' },
  { key: 'delivered', label: 'Listos',     emptyMsg: 'Nada listo aún',      emptyIcon: '✓'  },
]

const ACCENT = '#C46F4E'

export default function KitchenPage() {
  const { data: cards = [], isLoading } = useAreaCardsByType('kitchen')
  const { data: products = [] }         = useProducts()
  const { mode, setMode, enabled, onShift } = useSound()
  useUnattendedAlerts(cards, 'Cocina')
  useWakeLock(enabled && onShift)

  const [tab, setTab]             = useState<Tab>('pending')
  const [stockOpen, setStockOpen] = useState(false)
  const isRush = mode === 'cocina_ruidosa'

  const kitchenProducts = products.filter(p => p.active && p.primary_area?.type === 'kitchen')
  const stockAlertCount = kitchenProducts.filter(p => p.stock_status === 'out' || p.stock_status === 'low').length

  const pending   = cards.filter(c => c.status === 'pending')
  const received  = cards.filter(c => c.status === 'received')
  const delivered = cards.filter(c => c.status === 'delivered')

  const sortByDelay = (list: typeof cards) =>
    [...list].sort((a, b) => (b.delay_minutes ?? 0) - (a.delay_minutes ?? 0))

  const counts: Record<Tab, number> = { pending: pending.length, received: received.length, delivered: delivered.length }
  const rawVisible = tab === 'pending' ? pending : tab === 'received' ? received : delivered.slice(0, 8)
  const visible = isRush ? sortByDelay(rawVisible) : rawVisible

  return (
    <div
      className="min-h-screen pt-safe"
      style={{ background: isRush ? '#180D09' : '#1B3428', paddingTop: 'env(safe-area-inset-top)' }}
    >
      <SoundEnabler />

      {/* Rush stripe */}
      {isRush && (
        <div className="h-0.5 w-full" style={{ background: ACCENT }} />
      )}

      {/* ── Header ── */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-start justify-between">

          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: ACCENT, boxShadow: `0 0 5px ${ACCENT}` }}
              />
              <p className="text-white/35 text-[10px] font-bold uppercase tracking-[0.22em]">
                Estación · Cocina
              </p>
              {isRush && (
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                  style={{ background: `${ACCENT}25`, color: ACCENT }}
                >
                  Rush 🔥
                </span>
              )}
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight leading-none">
              Comandas
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {pending.length > 0 && (
              <div
                className="flex flex-col items-center justify-center w-14 h-14 rounded-2xl"
                style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35` }}
              >
                <span className="text-white text-xl font-bold leading-none">{pending.length}</span>
                <span className="text-white/45 text-[9px] uppercase tracking-wide mt-0.5">
                  nuevo{pending.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            <button
              onClick={() => setStockOpen(true)}
              className={cn(
                'flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-bold press-scale transition-all',
                stockAlertCount > 0
                  ? 'border-[#C46F4E]/40 text-[#C46F4E]'
                  : 'border-white/12 text-white/40',
              )}
              style={{ background: stockAlertCount > 0 ? `${ACCENT}12` : 'rgba(255,255,255,0.05)' }}
            >
              Stock
              {stockAlertCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#C46F4E] text-white text-[9px] font-bold flex items-center justify-center">
                  {stockAlertCount}
                </span>
              )}
            </button>

            {enabled && (
              <button
                onClick={() => setMode(isRush ? 'normal' : 'cocina_ruidosa')}
                title={isRush ? MODE_CFG.cocina_ruidosa.label : 'Activar modo Rush'}
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center text-base press-scale border transition-all',
                  isRush ? 'border-[#C46F4E]' : 'border-white/12',
                )}
                style={{ background: isRush ? ACCENT : 'rgba(255,255,255,0.06)' }}
              >
                🔥
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab selector ── */}
      <div className="px-5 pb-5">
        <div
          className="flex rounded-2xl p-1 gap-1 border"
          style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 press-scale',
                tab === t.key ? 'text-white' : 'text-white/35',
              )}
              style={tab === t.key ? { background: ACCENT, boxShadow: `0 2px 12px ${ACCENT}40` } : {}}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span
                  className={cn(
                    'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center leading-none',
                    tab === t.key
                      ? 'bg-white/20 text-white'
                      : 'bg-white/10 text-white/50',
                  )}
                >
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-2 border-white/10 rounded-full animate-spin" style={{ borderTopColor: ACCENT }} />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center text-2xl"
            style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}20` }}
          >
            {TABS.find(t => t.key === tab)?.emptyIcon}
          </div>
          <p className="text-white/35 text-sm font-medium">{TABS.find(t => t.key === tab)?.emptyMsg}</p>
        </div>
      ) : (
        <div className="px-4 pb-nav space-y-3">
          {visible.map(card => (
            <AreaCardComponent key={card.id} card={card} myAreaType="kitchen" />
          ))}
        </div>
      )}

      {stockOpen && <StockPanel areaType="kitchen" onClose={() => setStockOpen(false)} />}
    </div>
  )
}
