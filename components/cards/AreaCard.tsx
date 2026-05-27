'use client'

import { useUpdateCardStatus } from '@/hooks/useCards'
import { CARD_STATUS_CONFIG } from '@/lib/constants'
import { formatPrice, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AreaCard } from '@/types'

interface AreaCardProps {
  card: AreaCard
  myAreaType: 'bar' | 'kitchen'
}

export function AreaCardComponent({ card, myAreaType }: AreaCardProps) {
  const updateStatus = useUpdateCardStatus()
  const statusConfig = CARD_STATUS_CONFIG[card.status]

  const order = card.order
  const tableCode = order?.table?.code ?? null

  // Split items by area
  const myItems = order?.items?.filter((i) => i.area?.type === myAreaType) ?? []
  const otherItems = order?.items?.filter((i) => i.area?.type !== myAreaType) ?? []
  const otherAreaLabel = myAreaType === 'bar' ? 'COCINA' : 'BARRA / SERVICIO'
  const myAreaLabel = myAreaType === 'bar' ? 'BEBIDAS / TU ÁREA' : 'COMIDA / TU ÁREA'

  // Delivery/task card (no order)
  const isTask = !order

  function handleReceive() {
    if (card.status !== 'pending') return
    updateStatus.mutate(
      { id: card.id, status: 'received' },
      {
        onSuccess: () => toast.success('Pedido recibido'),
        onError: () => toast.error('Error'),
      }
    )
  }

  function handleDeliver() {
    if (card.status === 'delivered') return
    updateStatus.mutate(
      { id: card.id, status: 'delivered' },
      {
        onSuccess: () => toast.success('Pedido entregado'),
        onError: () => toast.error('Error'),
      }
    )
  }

  return (
    <div
      className={cn(
        'rounded-2xl border-2 overflow-hidden shadow-sm transition-opacity',
        card.status === 'delivered' && 'opacity-60',
        card.status === 'pending' && 'border-orange-300 bg-orange-50',
        card.status === 'received' && 'border-blue-300 bg-blue-50',
        card.status === 'delivered' && 'border-emerald-300 bg-emerald-50',
      )}
    >
      {/* Card header */}
      <div className={cn(
        'px-4 py-3 flex items-center justify-between',
        card.status === 'pending' && 'bg-orange-500',
        card.status === 'received' && 'bg-blue-500',
        card.status === 'delivered' && 'bg-emerald-500',
      )}>
        <div>
          <h3 className="text-white font-bold text-lg leading-none">
            {isTask ? (card.title ?? 'Tarea') : `PEDIDO MESA ${tableCode}`}
          </h3>
          <p className="text-white/70 text-xs mt-0.5">
            {formatTime(card.created_at)}
          </p>
        </div>
        <span className={cn(
          'text-xs font-bold px-2 py-1 rounded-full bg-white/20 text-white'
        )}>
          {statusConfig.label.toUpperCase()}
        </span>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {isTask ? (
          <div>
            {card.notes && <p className="text-sm text-stone-600">{card.notes}</p>}
            {card.assignee && (
              <p className="text-xs text-stone-500 mt-1">Asignado: {card.assignee.name}</p>
            )}
          </div>
        ) : (
          <>
            {/* My area items — highlighted */}
            {myItems.length > 0 && (
              <div>
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">
                  {myAreaLabel}
                </p>
                <ul className="space-y-1">
                  {myItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="font-bold text-stone-800 w-5 text-sm shrink-0">{item.quantity}×</span>
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-stone-800">{item.product?.name}</span>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <span className="text-xs text-stone-500 ml-1">
                            ({item.modifiers.map((m) => m.modifier?.name).join(', ')})
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-xs text-amber-600 italic">"{item.notes}"</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Other area items — dimmed */}
            {otherItems.length > 0 && (
              <div className="opacity-50">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wide mb-1.5">
                  {otherAreaLabel}
                </p>
                <ul className="space-y-1">
                  {otherItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <span className="text-stone-400 w-5 text-sm shrink-0">{item.quantity}×</span>
                      <span className="text-sm text-stone-400">{item.product?.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      {card.status !== 'delivered' && (
        <div className="px-4 pb-4 flex gap-2">
          {card.status === 'pending' && (
            <button
              onClick={handleReceive}
              disabled={updateStatus.isPending}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-xl text-sm min-h-[44px] transition-colors"
            >
              Recibido
            </button>
          )}
          <button
            onClick={handleDeliver}
            disabled={updateStatus.isPending}
            className={cn(
              'flex-1 font-bold py-3 rounded-xl text-sm min-h-[44px] transition-colors text-white',
              card.status === 'received'
                ? 'bg-emerald-500 hover:bg-emerald-600'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            )}
          >
            Entregado
          </button>
        </div>
      )}
    </div>
  )
}
