'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Shift } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return `${n.toFixed(1)} min`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function duration(from: string, to: string) {
  const min = Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 60000)
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

const AREA_META: Record<string, { label: string; icon: string }> = {
  bar:      { label: 'Barra',    icon: '☕' },
  kitchen:  { label: 'Cocina',   icon: '🍳' },
  cocina:   { label: 'Cocina',   icon: '🍳' },
  salon:    { label: 'Salón',    icon: '🪑' },
  delivery: { label: 'Delivery', icon: '📦' },
}

// ── Stat box ──────────────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F7F5F0] rounded-xl px-3 py-3 text-center">
      <p className="section-label mb-1.5">{label}</p>
      <p className="text-[#1B3428] text-sm font-bold leading-none">{value}</p>
    </div>
  )
}

// ── Hourly heatmap ────────────────────────────────────────────────────────────
function HeatmapRow({ loads }: { loads: Array<{ hour: number; cards: number; avg_prep_min: number | null }> }) {
  const max = Math.max(...loads.map(l => l.cards), 1)
  return (
    <div className="flex gap-1 items-end" style={{ height: 36 }}>
      {loads.map(l => {
        const pct = l.cards / max
        const color = pct > 0.7 ? '#B8574E' : pct > 0.4 ? '#C98933' : '#6D8A5C'
        return (
          <div key={l.hour} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full rounded-sm" style={{
              height: `${Math.max(pct * 28, l.cards > 0 ? 3 : 0)}px`,
              background: color,
              opacity: l.cards > 0 ? 1 : 0.12,
            }} />
            {l.hour % 3 === 0 && (
              <span className="text-[9px] text-[#A9A39C]">{l.hour}h</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Shift card ────────────────────────────────────────────────────────────────
function ShiftCard({ shift }: { shift: Shift }) {
  const s     = shift.summary
  const ended = !!shift.ended_at

  return (
    <div className="bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden card-shadow">

      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[#1F1F1F] text-sm font-bold capitalize">{fmtDate(shift.started_at)}</p>
          <p className="text-[#7A756D] text-xs mt-0.5">
            {fmtTime(shift.started_at)}
            {shift.ended_at
              ? ` → ${fmtTime(shift.ended_at)} · ${duration(shift.started_at, shift.ended_at)}`
              : ' — en curso'}
          </p>
          {(shift.started_by_user || shift.ended_by_user) && (
            <p className="text-[#A9A39C] text-[10px] mt-0.5">
              Abierto por {shift.started_by_user?.name ?? '—'}
              {shift.ended_by_user ? ` · Cerrado por ${shift.ended_by_user.name}` : ''}
            </p>
          )}
        </div>
        {!ended ? (
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#6D8A5C]/12 text-[#3E6033] border border-[#6D8A5C]/20 shrink-0">
            Activo
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#EDE9E2] text-[#7A756D] shrink-0">
            Cerrado
          </span>
        )}
      </div>

      {/* KPIs */}
      {s ? (
        <div className="px-4 pb-3">
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            <Stat label="Comandas"   value={String(s.cards_total)} />
            <Stat label="Pedidos"    value={String(s.orders_closed)} />
            <Stat label="Reacción"   value={fmt(s.avg_reaction_time_min)} />
            <Stat label="Prep."      value={fmt(s.avg_prep_time_min)} />
            <Stat label="Total"      value={fmt(s.avg_total_time_min)} />
            <Stat label="Ciclo mesa" value={fmt(s.avg_table_cycle_min)} />
          </div>

          {/* By area */}
          {s.by_area && s.by_area.length > 0 && (
            <div className="border-t border-[#EDE9E2] pt-3 mb-3">
              <p className="section-label mb-2">Por área</p>
              <div className="space-y-2">
                {s.by_area.map((a: { area_id: string; area_name: string; area_type: string; avg_reaction_min: number | null; avg_prep_min: number | null; cards: number }) => (
                  <div key={a.area_id} className="flex items-center justify-between">
                    <span className="text-[#1F1F1F] text-xs font-medium">
                      {AREA_META[a.area_type]?.icon} {AREA_META[a.area_type]?.label ?? a.area_name}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#A9A39C] text-[10px]">{a.cards} cmd.</span>
                      <span className="text-[#7A756D] text-[10px]">Reac: <strong className="text-[#1F1F1F]">{fmt(a.avg_reaction_min)}</strong></span>
                      <span className="text-[#7A756D] text-[10px]">Prep: <strong className="text-[#1F1F1F]">{fmt(a.avg_prep_min)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hourly heatmap */}
          {s.hourly_load && s.hourly_load.length > 0 && (
            <div className="border-t border-[#EDE9E2] pt-3 mb-3">
              <p className="section-label mb-2">Carga por hora</p>
              <HeatmapRow loads={s.hourly_load} />
            </div>
          )}

          {/* Staff */}
          {s.by_staff && s.by_staff.length > 0 && (
            <div className="border-t border-[#EDE9E2] pt-3">
              <p className="section-label mb-2">Equipo</p>
              <div className="space-y-1.5">
                {s.by_staff.map((st: { user_id: string; name: string; cards_handled: number; avg_reaction_min: number | null }, i: number) => (
                  <div key={st.user_id} className="flex items-center gap-2.5">
                    <span className="text-[#A9A39C] text-[10px] font-bold w-4 text-center">{i + 1}</span>
                    <div className="w-6 h-6 rounded-lg bg-[#1B3428]/8 flex items-center justify-center shrink-0">
                      <span className="text-[#1B3428] text-[9px] font-bold">{st.name[0]?.toUpperCase()}</span>
                    </div>
                    <span className="flex-1 text-[#1F1F1F] text-xs truncate">{st.name}</span>
                    <span className="text-[#A9A39C] text-[10px]">{st.cards_handled} cmd.</span>
                    <span className="text-[#1B3428] text-xs font-bold">{fmt(st.avg_reaction_min)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <p className="text-[#A9A39C] text-xs">Sin datos de resumen disponibles</p>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShiftHistoryPage() {
  const router = useRouter()

  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await fetch('/api/shifts')
      if (!res.ok) return []
      return res.json()
    },
    staleTime: 60_000,
  })

  return (
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* Header */}
      <div className="bg-[#1B3428] px-5 pt-8 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 text-white/60 press-scale shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <p className="section-label text-[#6D9EAA] mb-1">Inteligencia Operacional</p>
            <h1 className="text-white text-2xl font-bold tracking-tight">Historial de turnos</h1>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-14 space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-white border border-[#E7E1D8] rounded-2xl animate-pulse" />
          ))
        ) : !shifts || shifts.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#E7E1D8] rounded-2xl p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F7F5F0] flex items-center justify-center text-2xl mx-auto mb-3">📊</div>
            <p className="text-[#1F1F1F] text-sm font-semibold">Sin turnos registrados</p>
            <p className="text-[#A9A39C] text-xs mt-1.5">Los turnos cerrados aparecerán aquí</p>
          </div>
        ) : (
          shifts.map(s => <ShiftCard key={s.id} shift={s} />)
        )}
      </div>
    </div>
  )
}
