'use client'

import { useUpdateCardStatus } from '@/hooks/useCards'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AreaCard } from '@/types'

interface AreaCardProps {
  card: AreaCard
  myAreaType: 'bar' | 'kitchen'
}

const STATUS_STYLES = {
  pending: {
    card:      'bg-white border-[#E8E4DC]',
    stripe:    'bg-[#E08A50]',
    label:     'PENDIENTE',
    labelBg:   'bg-[#E08A50]/12 text-[#A05A28]',
    dotAnim:   'dot-pulse-amber',
    dot:       'bg-[#E08A50]',
    textTitle: 'text-[#252525]',
  },
  received: {
    card:      'bg-white border-[#E8E4DC]',
    stripe:    'bg-[#6D9EEB]',
    label:     'PREPARANDO',
    labelBg:   'bg-[#6D9EEB]/12 text-[#2A5FA0]',
    dotAnim:   '',
    dot:       'bg-[#6D9EEB]',
    textTitle: 'text-[#252525]',
  },
  delivered: {
    card:      'bg-[#F9F7F3] border-[#E8E4DC]',
    stripe:    'bg-[#9DAA7D]',
    label:     'LISTO',
    labelBg:   'bg-[#9DAA7D]/12 text-[#4A6B3A]',
    dotAnim:   '',
    dot:       'bg-[#9DAA7D]',
    textTitle: 'text-[#3A3630]/70',
  },
}

// Elapsed time since card was created
function elapsed(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (diff < 1)  return 'ahora'
  if (diff < 60) return `${diff}m`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

export function AreaCardComponent({ card, myAreaType }: AreaCardProps) {
  const updateStatus = useUpdateCardStatus(card.area_id)
  const st = STATUS_STYLES[card.status]

  const order      = card.order
  const tableCode  = order?.table?.code ?? null
  const isTakeaway = order?.type === 'takeaway'
  const isTask     = !order && !isTakeaway

  const myItems    = order?.items?.filter((i) => i.area?.type === myAreaType) ?? []
  const otherItems = order?.items?.filter((i) => i.area?.type !== myAreaType) ?? []
  const myLabel    = myAreaType === 'bar' ? 'Tu área · Barra' : 'Tu área · Cocina'
  const otherLabel = myAreaType === 'bar' ? 'Cocina' : 'Barra'

  function handle(status: 'received' | 'delivered') {
    updateStatus.mutate(
      { id: card.id, status },
      {
        onSuccess: () => toast.success(status === 'received' ? 'Recibido ✓' : 'Listo ✓'),
        onError:   () => toast.error('Error al actualizar'),
      }
    )
  }

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden fade-scale-in transition-all duration-300 card-shadow',
      st.card,
      card.status === 'delivered' && 'opacity-55'
    )}>

      {/* Colored left stripe + header */}
      <div className="flex items-stretch">
        <div className={cn('w-1 shrink-0', st.stripe)} />
        <div className="flex-1 px-3.5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={cn('w-2 h-2 rounded-full shrink-0', st.dot, st.dotAnim)} />
            <div>
              <h3 className={cn('font-bold text-[15px] leading-none tracking-tight', st.textTitle)}>
                {isTakeaway ? '🥡 Para llevar' : isTask ? (card.title ?? 'Tarea') : `Mesa ${tableCode}`}
              </h3>
              <p className="text-[#8A8278] text-[11px] mt-0.5 font-medium">
                {isTask ? 'Delivery / Tarea' : elapsed(card.created_at)}
              </p>
            </div>
          </div>
          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider', st.labelBg)}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#F0EDE8] mx-3.5" />

      {/* Body */}
      <div className="px-3.5 py-3 space-y-3">
        {isTask ? (
          <div className="space-y-1">
            {card.notes && <p className="text-sm text-[#3A3630]">{card.notes}</p>}
            {card.assignee && (
              <p className="text-xs text-[#8A8278]">Asignado: <span className="text-[#3A3630] font-medium">{card.assignee.name}</span></p>
            )}
          </div>
        ) : (
          <>
            {myItems.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8278] mb-2">{myLabel}</p>
                <ul className="space-y-2">
                  {myItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-2.5">
                      <span className="text-sm font-bold text-[#8A8278] w-6 shrink-0">{item.quantity}×</span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-[#252525]">{item.product?.name}</span>
                        {item.modifiers && item.modifiers.length > 0 && (
                          <span className="text-xs text-[#8A8278] ml-1.5">
                            {item.modifiers.map((m) => m.modifier?.name).join(' · ')}
                          </span>
                        )}
                        {item.notes && (
                          <p className="text-xs text-[#E08A50] italic mt-0.5">"{item.notes}"</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {otherItems.length > 0 && (
              <div className="opacity-35 mt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8278] mb-1.5">{otherLabel}</p>
                <ul className="space-y-1">
                  {otherItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5">
                      <span className="text-xs text-[#8A8278] w-6 shrink-0">{item.quantity}×</span>
                      <span className="text-xs text-[#3A3630]">{item.product?.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {card.status !== 'delivered' && (
        <div className="px-3.5 pb-3.5 flex gap-2">
          {card.status === 'pending' && (
            <button
              onClick={() => handle('received')}
              disabled={updateStatus.isPending}
              className="flex-1 bg-[#F9F7F3] border border-[#E8E4DC] text-[#3A3630] font-bold py-2.5 rounded-xl text-sm btn-primary hover:bg-[#F0EDE8] transition-colors"
            >
              Recibir
            </button>
          )}
          <button
            onClick={() => handle('delivered')}
            disabled={updateStatus.isPending || card.status === 'pending'}
            className={cn(
              'flex-1 font-bold py-2.5 rounded-xl text-sm transition-all',
              card.status === 'received'
                ? 'bg-[#0F3A43] text-white btn-primary'
                : 'bg-[#F0EDE8] text-[#B0AB9F] cursor-not-allowed'
            )}
          >
            Listo ✓
          </button>
        </div>
      )}
    </div>
  )
}
