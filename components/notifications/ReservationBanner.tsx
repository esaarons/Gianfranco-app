'use client'

import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import type { Reservation } from '@/types'

const ZONE_LABELS: Record<string, string> = {
  salon1: 'Salón 1', salon2: 'Salón 2', terrace: 'Terraza',
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

// How many minutes until a reservation starts (negative = already started)
function minutesUntil(dateStr: string, timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const target = new Date(dateStr + 'T' + timeStr)
  target.setHours(h, m, 0, 0)
  return Math.floor((target.getTime() - Date.now()) / 60000)
}

// Urgency level based on time until start
type Urgency = 'imminent' | 'soon' | 'today'

function urgency(min: number): Urgency | null {
  if (min < -120) return null       // started more than 2h ago → ignore
  if (min < 0)    return 'today'    // already started
  if (min <= 30)  return 'imminent' // ≤30 min
  if (min <= 120) return 'soon'     // ≤2 h
  return 'today'                    // later today — still show subtly
}

const CFG: Record<Urgency, { bar: string; bg: string; text: string; dot: string; dotAnim: string; label: string }> = {
  imminent: {
    bar:     'bg-[#B8574E]',
    bg:      'bg-[#FEF2F2] border-[#B8574E]/20',
    text:    'text-[#7A2B2B]',
    dot:     'bg-[#B8574E]',
    dotAnim: 'dot-pulse-rust',
    label:   'Inminente',
  },
  soon: {
    bar:     'bg-[#C98933]',
    bg:      'bg-[#FEF3E8] border-[#C98933]/20',
    text:    'text-[#7C5010]',
    dot:     'bg-[#C98933]',
    dotAnim: 'dot-pulse-amber',
    label:   'Próxima',
  },
  today: {
    bar:     'bg-[#6D9EEB]',
    bg:      'bg-[#EFF6FF] border-[#6D9EEB]/20',
    text:    'text-[#2A5FA0]',
    dot:     'bg-[#6D9EEB]',
    dotAnim: '',
    label:   'Hoy',
  },
}

interface ReservationBannerProps {
  /** Compact single-line version for embedding inside other layouts */
  compact?: boolean
}

export function ReservationBanner({ compact = false }: ReservationBannerProps) {
  const today = todayStr()

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ['reservations', 'banner', today],
    queryFn: async () => {
      const res = await fetch(
        `/api/reservations?date=${today}&status=pending,confirmed,in_progress`
      )
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
    staleTime: 2 * 60 * 1000,
  })

  // Annotate each reservation with urgency, sort by urgency then time
  const annotated = reservations
    .map((r) => ({ r, min: minutesUntil(r.date, r.start_time) }))
    .map(({ r, min }) => ({ r, min, u: urgency(min) }))
    .filter(({ u }) => u !== null)
    .sort((a, b) => {
      const order: Record<Urgency, number> = { imminent: 0, soon: 1, today: 2 }
      const diff = order[a.u!] - order[b.u!]
      return diff !== 0 ? diff : a.min - b.min
    })

  if (!annotated.length) return null

  if (compact) {
    // Single-line pill for headers
    const { r, min, u } = annotated[0]
    const cfg = CFG[u!]
    const label = min < 0 ? 'En curso' : min < 60 ? `${min}m` : `${Math.floor(min / 60)}h`
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 border text-xs font-semibold fade-in',
        cfg.bg, cfg.text
      )}>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot, cfg.dotAnim)} />
        <span>
          Reserva {r.customer_name} · {r.party_size} pers. · {r.start_time.slice(0, 5)}
        </span>
        <span className="font-bold opacity-70">{label}</span>
      </div>
    )
  }

  return (
    <div className="mx-4 mb-2 space-y-2 fade-in">
      {annotated.slice(0, 3).map(({ r, min, u }) => {
        const cfg = CFG[u!]
        const timeLabel = min < 0
          ? 'En curso'
          : min === 0 ? 'Ahora'
          : min < 60  ? `En ${min} min`
          : `En ${Math.floor(min / 60)}h ${min % 60}m`

        return (
          <div key={r.id} className={cn(
            'flex items-stretch rounded-2xl border overflow-hidden card-shadow',
            cfg.bg
          )}>
            {/* Colored stripe */}
            <div className={cn('w-1 shrink-0', cfg.bar)} />

            <div className="flex-1 flex items-center gap-3 px-3.5 py-2.5">
              {/* Dot */}
              <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot, cfg.dotAnim)} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold leading-snug', cfg.text)}>
                  {r.customer_name}
                  <span className="font-normal opacity-60"> · {r.party_size} personas</span>
                </p>
                <p className={cn('text-xs opacity-60 mt-0.5', cfg.text)}>
                  {ZONE_LABELS[r.zone ?? ''] ?? r.zone ?? 'Sin zona'}
                  {r.menu_type ? ` · ${r.menu_type}` : ''}
                  {r.notes ? ` · ${r.notes}` : ''}
                </p>
              </div>

              {/* Time */}
              <div className="flex flex-col items-end shrink-0 gap-0.5">
                <span className={cn('text-sm font-bold', cfg.text)}>{r.start_time.slice(0, 5)}</span>
                <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cfg.bg, cfg.text)}>
                  {cfg.label} · {timeLabel}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
