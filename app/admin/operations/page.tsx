'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useActiveShift } from '@/hooks/useActiveShift'
import { useRealtimeKPIs } from '@/hooks/useRealtimeKPIs'
import { useQuery } from '@tanstack/react-query'
import { ShiftCloseModal } from '@/components/admin/ShiftCloseModal'
import { Button } from '@/components/ui/button'
import type { Shift, ShiftSummary } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined, unit = 'min') {
  if (n == null) return '—'
  return `${n.toFixed(1)} ${unit}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function trafficLight(avg: number | null, baseline: number | null): 'green' | 'yellow' | 'red' {
  if (avg == null || baseline == null || baseline === 0) return 'green'
  const ratio = avg / baseline
  if (ratio >= 1.6) return 'red'
  if (ratio >= 1.3) return 'yellow'
  return 'green'
}

const LIGHT_COLORS = {
  green:  'bg-emerald-500',
  yellow: 'bg-amber-400',
  red:    'bg-red-500',
}

// ── subcomponents ─────────────────────────────────────────────────────────────

function KPICard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-[#252525]">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

function AreaRow({ name, pending, avgWait, baseline }: {
  name: string; pending: number; avgWait: number | null; baseline: number | null
}) {
  const light = trafficLight(avgWait, baseline)
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${LIGHT_COLORS[light]}`} />
      <span className="flex-1 text-sm font-medium capitalize">{name}</span>
      <span className="text-sm text-muted-foreground">{pending} pend.</span>
      <span className="text-sm font-semibold">{fmt(avgWait)}</span>
    </div>
  )
}

function HourlyBar({ hour, cards, maxCards }: { hour: number; cards: number; maxCards: number }) {
  const pct = maxCards > 0 ? (cards / maxCards) * 100 : 0
  const intensity = pct > 70 ? 'bg-red-400' : pct > 40 ? 'bg-amber-400' : 'bg-emerald-400'
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-7 bg-muted rounded-sm overflow-hidden" style={{ height: 48 }}>
        <div className={`w-full ${intensity} rounded-sm transition-all`} style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{hour}h</span>
      <span className="text-[10px] font-medium">{cards}</span>
    </div>
  )
}

function StaffRow({ rank, name, cards, reaction }: { rank: number; name: string; cards: number; reaction: number | null }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <span className="text-sm font-bold text-muted-foreground w-5">{rank}</span>
      <span className="flex-1 text-sm">{name}</span>
      <span className="text-xs text-muted-foreground">{cards} cmd.</span>
      <span className="text-sm font-semibold">{fmt(reaction)}</span>
    </div>
  )
}

// ── shift summary panel ───────────────────────────────────────────────────────

function ShiftSummaryPanel({ summary, startedAt }: { summary: ShiftSummary; startedAt: string }) {
  const loads    = summary.hourly_load  ?? []
  const byArea   = summary.by_area      ?? []
  const byStaff  = summary.by_staff     ?? []
  const maxCards = loads.length ? Math.max(...loads.map(h => h.cards)) : 1

  return (
    <div className="space-y-6">
      {/* Overview KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard label="Comandas"        value={String(summary.cards_total)} sub={`desde las ${fmtTime(startedAt)}`} />
        <KPICard label="Pedidos cerrados" value={String(summary.orders_closed)} />
        <KPICard label="T. reacción prom." value={fmt(summary.avg_reaction_time_min)} />
        <KPICard label="T. prep. prom."   value={fmt(summary.avg_prep_time_min)} />
        <KPICard label="T. total prom."   value={fmt(summary.avg_total_time_min)} />
        <KPICard label="Ciclo mesa prom." value={fmt(summary.avg_table_cycle_min)} />
      </div>

      {/* By area */}
      {byArea.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-3">Por área</p>
          {byArea.map(a => (
            <div key={a.area_id} className="py-2 border-b last:border-0">
              <p className="text-sm font-medium capitalize">{a.area_name}</p>
              <div className="flex gap-4 mt-1">
                <span className="text-xs text-muted-foreground">Reacción: <strong>{fmt(a.avg_reaction_min)}</strong></span>
                <span className="text-xs text-muted-foreground">Prep: <strong>{fmt(a.avg_prep_min)}</strong></span>
                <span className="text-xs text-muted-foreground">{a.cards} cmd.</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Heatmap */}
      {loads.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-4">Carga por hora</p>
          <div className="flex gap-2 items-end overflow-x-auto pb-1">
            {loads.map(h => (
              <HourlyBar key={h.hour} hour={h.hour} cards={h.cards} maxCards={maxCards} />
            ))}
          </div>
        </div>
      )}

      {/* Staff leaderboard */}
      {byStaff.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Equipo — T. reacción</p>
          {byStaff.map((s, i) => (
            <StaffRow key={s.user_id} rank={i + 1} name={s.name} cards={s.cards_handled} reaction={s.avg_reaction_min} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const { shift, isActive, isLoading, startShift, endShift } = useActiveShift()
  const { data: kpis } = useRealtimeKPIs(30_000)
  const [showCloseModal, setShowCloseModal] = useState(false)

  const { data: shiftAnalytics } = useQuery<ShiftSummary | null>({
    queryKey: ['analytics', 'shift', shift?.started_at],
    queryFn: async () => {
      if (!shift) return null
      const res = await fetch(`/api/analytics/shift?from=${shift.started_at}`)
      if (!res.ok) return null
      const json = await res.json()
      // Guard against error response objects
      if (!Array.isArray(json?.by_area)) return null
      return json as ShiftSummary
    },
    enabled: !!shift,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  function handleStart() {
    startShift.mutate(undefined, {
      onSuccess: () => toast.success('Turno iniciado'),
      onError:   (e) => toast.error(e.message),
    })
  }

  function handleClose(id: string) {
    endShift.mutate(id, {
      onSuccess: () => {
        setShowCloseModal(false)
        toast.success('Turno cerrado')
      },
      onError: (e) => toast.error(e.message),
    })
  }

  const baselines = shiftAnalytics?.by_area ?? []
  function baselineForArea(type: string): number | null {
    return baselines.find((a: { area_type: string; avg_total_min: number | null }) => a.area_type === type)?.avg_total_min ?? null
  }

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Cargando...</div>

  return (
    <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#252525]">Operaciones</h1>
          {shift && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Turno desde las {fmtTime(shift.started_at)}
              {shift.started_by_user && ` · ${shift.started_by_user.name}`}
            </p>
          )}
        </div>
        {isActive ? (
          <Button variant="destructive" size="sm" onClick={() => setShowCloseModal(true)}>
            Cerrar turno
          </Button>
        ) : (
          <Button size="sm" onClick={handleStart} disabled={startShift.isPending}>
            {startShift.isPending ? 'Abriendo...' : 'Abrir turno'}
          </Button>
        )}
      </div>

      {/* Realtime snapshot */}
      {kpis && (
        <div className="rounded-xl border bg-white p-4 space-y-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Ahora mismo</p>
            <span className="text-xs text-muted-foreground">
              {kpis.tables_occupied}/{kpis.tables_total} mesas
            </span>
          </div>

          {kpis.area_stats.length > 0 ? (
            kpis.area_stats.map(a => (
              <AreaRow
                key={a.area_type}
                name={a.area_type}
                pending={a.pending}
                avgWait={a.avg_wait_min}
                baseline={baselineForArea(a.area_type)}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-2">Sin comandas pendientes</p>
          )}

          {kpis.longest_table_min > 0 && (
            <p className="text-xs text-muted-foreground pt-2">
              Mesa mas larga: <strong>{kpis.longest_table_min} min</strong>
            </p>
          )}

          {/* Alerts */}
          {kpis.alerts.length > 0 && (
            <div className="mt-3 pt-3 border-t space-y-1.5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Alertas</p>
              {kpis.alerts.map((al, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                  {al.type === 'card_unattended' && (
                    <span>{al.area} — comanda sin recibir hace <strong>{al.minutes} min</strong></span>
                  )}
                  {al.type === 'table_long' && (
                    <span>Mesa <strong>{al.table_code}</strong> abierta hace <strong>{al.minutes} min</strong></span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shift KPIs from start */}
      {isActive && shiftAnalytics && (
        <ShiftSummaryPanel summary={shiftAnalytics} startedAt={shift!.started_at} />
      )}

      {/* No shift state */}
      {!isActive && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">No hay turno activo.</p>
          <p className="text-xs text-muted-foreground mt-1">Abre un turno para empezar a registrar métricas del equipo.</p>
        </div>
      )}

      {/* History link */}
      <Link href="/admin/operations/history" className="block text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Ver historial de turnos →
      </Link>

      {/* Close modal */}
      {showCloseModal && shift && (
        <ShiftCloseModal
          shift={shift}
          onClose={handleClose}
          onCancel={() => setShowCloseModal(false)}
          loading={endShift.isPending}
        />
      )}
    </div>
  )
}
