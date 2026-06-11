'use client'

import { useState, useEffect } from 'react'
import { useUpdateCardStatus, useUpdateCardNote } from '@/hooks/useCards'
import { useNow } from '@/hooks/useNow'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { AreaCard, OrderItem } from '@/types'

interface AreaCardProps {
  card: AreaCard
  myAreaType: 'bar' | 'kitchen' | 'delivery'
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

const DELAY_OPTIONS = [
  { label: '+5 min',         minutes: 5,  reason: null },
  { label: '+10 min',        minutes: 10, reason: null },
  { label: '+15 min',        minutes: 15, reason: null },
  { label: 'Prod. complejo', minutes: 15, reason: 'Producto complejo' },
  { label: 'Falta insumo',   minutes: 20, reason: 'Falta insumo' },
]

const QUICK_NOTES = [
  'Confirmar término',
  'Sin cebolla',
  'Falta insumo',
  'Producto agotado',
  'Demora 15 min',
  'Confirmar si es frío/caliente',
]

function elapsedFrom(ts: string, now: number): string {
  const diff = Math.floor((now - new Date(ts).getTime()) / 60000)
  if (diff < 1)  return 'ahora'
  if (diff < 60) return `${diff}m`
  return `${Math.floor(diff / 60)}h ${diff % 60}m`
}

// Thresholds in minutes per status
const URGENCY = {
  pending:  { warning: 5, urgent: 8  },
  received: { warning: 10, urgent: 15 },
  delivered: { warning: Infinity, urgent: Infinity },
}

type UrgencyLevel = 'onTime' | 'warning' | 'urgent'

function getUrgency(card: AreaCard, now: number): UrgencyLevel {
  if (card.status === 'delivered') return 'onTime'
  const ref = card.status === 'received' && card.received_at
    ? new Date(card.received_at).getTime()
    : new Date(card.created_at).getTime()
  const min = (now - ref) / 60_000
  const thresholds = URGENCY[card.status]
  if (min >= thresholds.urgent)  return 'urgent'
  if (min >= thresholds.warning) return 'warning'
  return 'onTime'
}

const URGENCY_STYLES: Record<UrgencyLevel, {
  card: string; stripe: string; timeText: string; badge: string; showPulse: boolean
}> = {
  onTime:  { card: '', stripe: '', timeText: 'text-[#8A8278]',               badge: '',                                          showPulse: false },
  warning: { card: 'border-[#C98933]/40', stripe: 'bg-[#C98933]',            timeText: 'text-[#9A6520] font-bold',               badge: 'bg-[#C98933]/12 text-[#9A6520]', showPulse: false },
  urgent:  { card: 'border-[#B8574E]/50 bg-[#FFF8F8]', stripe: 'bg-[#B8574E]', timeText: 'text-[#8B3A3A] font-bold',             badge: 'bg-[#B8574E]/12 text-[#8B3A3A]', showPulse: true  },
}

function groupByGuest(items: OrderItem[]): Map<string | null, OrderItem[]> {
  const map = new Map<string | null, OrderItem[]>()
  for (const item of items) {
    const key = item.guest_label?.trim() || null
    const list = map.get(key) ?? []
    list.push(item)
    map.set(key, list)
  }
  return map
}

function ItemRow({ item }: { item: OrderItem }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="text-sm font-bold text-[#8A8278] w-6 shrink-0">{item.quantity}×</span>
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-[#252525]">
          {item.product?.name ?? (
            <span className="text-[#E08A50] italic">✦ {item.notes ?? 'Pedido libre'}</span>
          )}
        </span>
        {item.modifiers && item.modifiers.length > 0 && (
          <span className="text-xs text-[#8A8278] ml-1.5">
            {item.modifiers.map((m) => m.modifier?.name).join(' · ')}
          </span>
        )}
        {item.notes && item.product && (
          <p className="text-xs text-[#E08A50] italic mt-0.5">"{item.notes}"</p>
        )}
      </div>
    </li>
  )
}

function ItemList({ items }: { items: OrderItem[] }) {
  const groups = groupByGuest(items)
  const hasGuests = groups.size > 1 || !groups.has(null)

  if (!hasGuests) {
    return (
      <ul className="space-y-2">
        {items.map((item) => <ItemRow key={item.id} item={item} />)}
      </ul>
    )
  }

  return (
    <div className="space-y-3">
      {Array.from(groups.entries()).map(([guest, gItems]) => (
        <div key={guest ?? '__none__'}>
          <p className="text-[10px] font-bold text-[#8A8278]/70 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full bg-[#F0EDE8] flex items-center justify-center text-[8px]">👤</span>
            {guest ?? 'Sin asignar'}
          </p>
          <ul className="space-y-1.5 pl-5">
            {gItems.map((item) => <ItemRow key={item.id} item={item} />)}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function AreaCardComponent({ card, myAreaType }: AreaCardProps) {
  const updateStatus = useUpdateCardStatus(card.area_id)
  const updateNote   = useUpdateCardNote(card.area_id)
  const now          = useNow(30_000)  // ticks every 30s — shared across all cards
  const st           = STATUS_STYLES[card.status]

  // Urgency — only for active (non-delivered, non-task) cards
  const order      = card.order
  const tableCode  = order?.table?.code ?? null
  const isTakeaway = order?.type === 'takeaway'
  const isTask     = !order && !isTakeaway
  const isOrder    = !isTask

  const urgency    = isOrder && card.status !== 'delivered' ? getUrgency(card, now) : 'onTime'
  const urg        = URGENCY_STYLES[urgency]

  const myItems    = order?.items?.filter((i) => i.area?.type === myAreaType) ?? []
  const otherItems = order?.items?.filter((i) => i.area?.type !== myAreaType) ?? []
  const myLabel    = myAreaType === 'bar' ? 'Tu área · Barra' : myAreaType === 'kitchen' ? 'Tu área · Cocina' : 'Tu área'
  const otherLabel = myAreaType === 'bar' ? 'Cocina' : myAreaType === 'kitchen' ? 'Barra' : ''

  const hasDelay   = card.delay_minutes != null && card.delay_minutes > 0
  const hasNote    = !!(card.operator_note?.trim())

  const [noteOpen,   setNoteOpen]   = useState(false)
  const [delayOpen,  setDelayOpen]  = useState(false)
  const [noteText,   setNoteText]   = useState(card.operator_note ?? '')

  // Sync noteText if card prop changes (e.g. after realtime update)
  useEffect(() => { setNoteText(card.operator_note ?? '') }, [card.operator_note])

  function handleStatus(status: 'received' | 'delivered') {
    updateStatus.mutate(
      { id: card.id, status },
      {
        onSuccess: () => toast.success(status === 'received' ? 'Recibido ✓' : 'Listo ✓'),
        onError:   () => toast.error('Error al actualizar'),
      }
    )
  }

  function handleSaveNote() {
    updateNote.mutate(
      { id: card.id, operator_note: noteText.trim() || undefined },
      {
        onSuccess: () => { toast.success('Nota enviada a Salón'); setNoteOpen(false) },
        onError:   () => toast.error('Error al guardar la nota'),
      }
    )
  }

  function handleDelay(minutes: number, reason: string | null) {
    updateNote.mutate(
      { id: card.id, delay_minutes: minutes, delay_reason: reason },
      {
        onSuccess: () => { toast.success(`Demora marcada: +${minutes} min`); setDelayOpen(false) },
        onError:   () => toast.error('Error al marcar demora'),
      }
    )
  }

  function handleClearDelay() {
    updateNote.mutate(
      { id: card.id, delay_minutes: null, delay_reason: null },
      {
        onSuccess: () => toast.success('Demora eliminada'),
        onError:   () => toast.error('Error al actualizar'),
      }
    )
  }

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden fade-scale-in transition-all duration-300 card-shadow',
      st.card,
      urg.card,
      card.status === 'delivered' && 'opacity-55'
    )}>

      {/* Header: stripe + identidad + badge */}
      <div className="flex items-stretch">
        <div className={cn('w-[3px] shrink-0', urg.stripe || st.stripe)} />
        <div className="flex-1 px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn('w-2.5 h-2.5 rounded-full shrink-0',
              urgency === 'urgent'  ? 'bg-[#B8574E] dot-pulse-rust' :
              urgency === 'warning' ? 'bg-[#C98933] dot-pulse-amber' :
              st.dot, st.dotAnim
            )} />
            <div className="min-w-0">
              <h3 className={cn('font-bold text-base leading-none tracking-tight truncate', st.textTitle)}>
                {isTakeaway ? 'Para llevar' : isTask ? (card.title ?? 'Tarea') : `Mesa ${tableCode}`}
              </h3>
              <p className={cn('text-[11px] mt-1 font-medium flex items-center gap-1', urg.timeText || 'text-[#8A8278]')}>
                {isTask ? 'Delivery / Tarea' : elapsedFrom(card.created_at, now)}
                {urg.showPulse && <span className="text-[#B8574E] ml-0.5">!</span>}
              </p>
            </div>
          </div>
          <span className={cn(
            'text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wider shrink-0',
            urgency !== 'onTime' && card.status !== 'delivered' ? urg.badge : st.labelBg
          )}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Delay banner */}
      {hasDelay && (
        <div className="mx-3.5 mt-2.5 flex items-center justify-between bg-[#FEF3E8] border border-[#C98933]/25 rounded-xl px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-base">⏳</span>
            <div>
              <p className="text-xs font-bold text-[#7A4E10]">Demora ~{card.delay_minutes} min</p>
              {card.delay_reason && <p className="text-[10px] text-[#9A6020]">{card.delay_reason}</p>}
            </div>
          </div>
          {card.status !== 'delivered' && (
            <button onClick={handleClearDelay} className="text-[10px] text-[#C98933] font-bold press-scale">✕</button>
          )}
        </div>
      )}

      {/* Operator note banner */}
      {hasNote && !noteOpen && (
        <div className="mx-3.5 mt-2 flex items-start gap-2 bg-[#F0EDF8] border border-[#9B7EC8]/20 rounded-xl px-3 py-2">
          <span className="text-sm mt-0.5">💬</span>
          <p className="text-xs text-[#5B3E8A] font-medium flex-1">{card.operator_note}</p>
        </div>
      )}

      <div className="h-px bg-[#F0EDE8] mx-3.5 mt-2.5" />

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
                <ItemList items={myItems} />
              </div>
            )}

            {otherItems.length > 0 && (
              <div className="opacity-35 mt-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8278] mb-1.5">{otherLabel}</p>
                <ul className="space-y-1">
                  {otherItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2.5">
                      <span className="text-xs text-[#8A8278] w-6 shrink-0">{item.quantity}×</span>
                      <span className="text-xs text-[#3A3630]">
                        {item.product?.name ?? item.notes ?? 'Pedido libre'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Primary actions */}
      {card.status !== 'delivered' && (
        <div className="px-3.5 pb-3 flex gap-2">
          {card.status === 'pending' && (
            <button
              onClick={() => handleStatus('received')}
              disabled={updateStatus.isPending}
              className="flex-1 bg-[#F4F2EE] border border-[#E4DED8] text-[#3A3630] font-bold py-3 rounded-xl text-sm btn-primary hover:bg-[#EDEBE5] transition-colors"
            >
              Recibir
            </button>
          )}
          <button
            onClick={() => handleStatus('delivered')}
            disabled={updateStatus.isPending || card.status === 'pending'}
            className={cn(
              'flex-1 font-bold py-3 rounded-xl text-sm transition-all',
              card.status === 'received'
                ? 'bg-[#1B3428] text-white btn-primary'
                : 'bg-[#EDEBE5] text-[#C0BAB4] cursor-not-allowed'
            )}
          >
            Listo ✓
          </button>
        </div>
      )}

      {/* Secondary actions — only for order cards in active states */}
      {isOrder && card.status !== 'delivered' && (
        <div className="px-3.5 pb-3.5 flex gap-2">
          <button
            onClick={() => { setNoteOpen(v => !v); setDelayOpen(false) }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all press-scale',
              noteOpen || hasNote
                ? 'bg-[#F0EDF8] border-[#9B7EC8]/30 text-[#5B3E8A]'
                : 'bg-[#F7F5F0] border-[#E8E4DC] text-[#7A756D]'
            )}
          >
            <span>💬</span> Nota a Salón
          </button>
          <button
            onClick={() => { setDelayOpen(v => !v); setNoteOpen(false) }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition-all press-scale',
              delayOpen || hasDelay
                ? 'bg-[#FEF3E8] border-[#C98933]/30 text-[#7A4E10]'
                : 'bg-[#F7F5F0] border-[#E8E4DC] text-[#7A756D]'
            )}
          >
            <span>⏳</span> Demora
          </button>
        </div>
      )}

      {/* Note input panel */}
      {noteOpen && (
        <div className="px-3.5 pb-3.5 space-y-2 fade-in">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_NOTES.map((q) => (
              <button
                key={q}
                onClick={() => setNoteText(q)}
                className="text-[11px] bg-[#F0EDE8] text-[#5A5450] px-2.5 py-1 rounded-lg border border-[#E8E4DC] press-scale font-medium"
              >
                {q}
              </button>
            ))}
          </div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Escribe una nota para Salón…"
            rows={2}
            className="w-full bg-[#F7F5F0] border border-[#E8E4DC] rounded-xl px-3 py-2.5 text-sm text-[#252525] placeholder:text-[#B0AB9F] outline-none focus:ring-1 focus:ring-[#9B7EC8]/30 resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setNoteOpen(false)}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[#7A756D] bg-[#F7F5F0] border border-[#E8E4DC] press-scale"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveNote}
              disabled={updateNote.isPending}
              className="flex-1 bg-[#5B3E8A] text-white font-bold py-2 rounded-xl text-xs btn-primary disabled:opacity-50"
            >
              Enviar a Salón
            </button>
          </div>
        </div>
      )}

      {/* Delay quick-select panel */}
      {delayOpen && (
        <div className="px-3.5 pb-3.5 fade-in">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8A8278] mb-2">Seleccionar demora</p>
          <div className="grid grid-cols-3 gap-1.5">
            {DELAY_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => handleDelay(opt.minutes, opt.reason)}
                disabled={updateNote.isPending}
                className="flex flex-col items-center bg-[#FEF8F0] border border-[#C98933]/20 rounded-xl py-2.5 px-1 press-scale disabled:opacity-50"
              >
                <span className="text-base">⏳</span>
                <span className="text-[11px] font-bold text-[#7A4E10] mt-1 text-center leading-tight">{opt.label}</span>
                {opt.reason && <span className="text-[9px] text-[#9A6020] mt-0.5 text-center leading-tight">{opt.reason}</span>}
              </button>
            ))}
          </div>
          <button
            onClick={() => setDelayOpen(false)}
            className="w-full mt-2 py-2 rounded-xl text-xs font-semibold text-[#7A756D] bg-[#F7F5F0] border border-[#E8E4DC] press-scale"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}
