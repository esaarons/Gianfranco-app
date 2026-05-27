'use client'

import { useAreaCards } from '@/hooks/useCards'
import { AreaCardComponent } from '@/components/cards/AreaCard'
import { SoundEnabler } from '@/components/notifications/SoundEnabler'

const BAR_AREA_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

export default function BarPage() {
  const { data: cards = [], isLoading } = useAreaCards(BAR_AREA_ID)

  const pending = cards.filter((c) => c.status === 'pending')
  const received = cards.filter((c) => c.status === 'received')
  const delivered = cards.filter((c) => c.status === 'delivered')

  return (
    <div className="bg-stone-100 min-h-screen">
      <SoundEnabler />

      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-800">Barra / Servicio</h1>
          {pending.length > 0 && (
            <p className="text-orange-600 font-semibold text-sm">{pending.length} pendiente{pending.length > 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex gap-2 text-xs">
          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">{pending.length} pend.</span>
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">{received.length} rec.</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48 text-stone-400">Cargando...</div>
      ) : cards.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-stone-400">
          <span className="text-4xl mb-2">☕</span>
          <p className="text-sm">Sin pedidos pendientes</p>
        </div>
      ) : (
        <div className="px-4 pb-8 space-y-3">
          {/* Pending first */}
          {pending.map((card) => (
            <AreaCardComponent key={card.id} card={card} myAreaType="bar" />
          ))}
          {/* Received */}
          {received.map((card) => (
            <AreaCardComponent key={card.id} card={card} myAreaType="bar" />
          ))}
          {/* Delivered — collapsed at bottom */}
          {delivered.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-2">
                Entregados ({delivered.length})
              </p>
              {delivered.slice(0, 5).map((card) => (
                <AreaCardComponent key={card.id} card={card} myAreaType="bar" />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
