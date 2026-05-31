'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { Shift } from '@/types'

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return `${n.toFixed(1)} min`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' })
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

function ShiftCard({ shift }: { shift: Shift }) {
  const s = shift.summary
  const ended = !!shift.ended_at

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#252525] text-sm">{fmtDate(shift.started_at)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {fmtTime(shift.started_at)}
            {shift.ended_at ? ` → ${fmtTime(shift.ended_at)} · ${duration(shift.started_at, shift.ended_at)}` : ' — en curso'}
          </p>
        </div>
        {!ended && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">activo</span>
        )}
      </div>

      {/* KPIs */}
      {s ? (
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Comandas"  value={String(s.cards_total)} />
          <Stat label="Reacción"  value={fmt(s.avg_reaction_time_min)} />
          <Stat label="Prep."     value={fmt(s.avg_prep_time_min)} />
          <Stat label="Total"     value={fmt(s.avg_total_time_min)} />
          <Stat label="Ciclo mesa" value={fmt(s.avg_table_cycle_min)} />
          <Stat label="Pedidos"   value={String(s.orders_closed)} />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Sin datos de resumen</p>
      )}

      {/* By area */}
      {s?.by_area && s.by_area.length > 0 && (
        <div className="border-t pt-3 space-y-1">
          {s.by_area.map(a => (
            <div key={a.area_id} className="flex items-center justify-between text-xs">
              <span className="capitalize text-muted-foreground">{a.area_name}</span>
              <span className="text-muted-foreground">{a.cards} cmd.</span>
              <span>Reac: <strong>{fmt(a.avg_reaction_min)}</strong></span>
              <span>Prep: <strong>{fmt(a.avg_prep_min)}</strong></span>
            </div>
          ))}
        </div>
      )}

      {/* Staff */}
      {s?.by_staff && s.by_staff.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Equipo</p>
          <div className="space-y-1">
            {s.by_staff.map((st, i) => (
              <div key={st.user_id} className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground w-4">{i + 1}.</span>
                <span className="flex-1">{st.name}</span>
                <span className="text-muted-foreground">{st.cards_handled} cmd.</span>
                <span className="font-semibold">{fmt(st.avg_reaction_min)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hourly heatmap */}
      {s?.hourly_load && s.hourly_load.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-2">Carga por hora</p>
          <HeatmapRow loads={s.hourly_load} />
        </div>
      )}

      {shift.started_by_user && (
        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Abierto por {shift.started_by_user.name}
          {shift.ended_by_user ? ` · Cerrado por ${shift.ended_by_user.name}` : ''}
        </p>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  )
}

function HeatmapRow({ loads }: { loads: Array<{ hour: number; cards: number; avg_prep_min: number | null }> }) {
  const max = Math.max(...loads.map(l => l.cards), 1)
  return (
    <div className="flex gap-1.5 items-end">
      {loads.map(l => {
        const pct = l.cards / max
        const bg  = pct > 0.7 ? 'bg-red-300' : pct > 0.4 ? 'bg-amber-300' : 'bg-emerald-300'
        return (
          <div key={l.hour} className="flex flex-col items-center gap-0.5">
            <div className={`w-6 rounded-sm ${bg}`} style={{ height: `${Math.max(pct * 32, 4)}px` }} />
            <span className="text-[9px] text-muted-foreground">{l.hour}h</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ShiftHistoryPage() {
  const { data: shifts, isLoading } = useQuery<Shift[]>({
    queryKey: ['shifts'],
    queryFn: async () => {
      const res = await fetch('/api/shifts')
      return res.json()
    },
    staleTime: 60_000,
  })

  return (
    <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/admin/operations" className="text-muted-foreground text-sm">← Operaciones</Link>
        <h1 className="text-xl font-bold text-[#252525]">Historial de turnos</h1>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

      {!isLoading && (!shifts || shifts.length === 0) && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No hay turnos registrados.</p>
        </div>
      )}

      {shifts?.map(s => <ShiftCard key={s.id} shift={s} />)}
    </div>
  )
}
