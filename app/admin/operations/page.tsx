'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useActiveShift } from '@/hooks/useActiveShift'
import { useRealtimeKPIs } from '@/hooks/useRealtimeKPIs'
import { useQuery } from '@tanstack/react-query'
import { ShiftCloseModal } from '@/components/admin/ShiftCloseModal'
import { cn } from '@/lib/utils'
import type { ShiftSummary } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number | null | undefined) {
  if (n == null) return '—'
  return `${n.toFixed(1)} min`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

function elapsed(startedAt: string): string {
  const diffMs = Date.now() - new Date(startedAt).getTime()
  const totalMin = Math.floor(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

// Returns next automatic transition label based on Lima time (UTC-5)
function nextTransition(): { label: string; time: string } {
  const now = new Date()
  const limaHour = (now.getUTCHours() - 5 + 24) % 24
  if (limaHour < 7)  return { label: 'Turno AM',  time: '07:00' }
  if (limaHour < 14) return { label: 'Turno PM',  time: '14:00' }
  if (limaHour < 22) return { label: 'Cierre',    time: '22:00' }
  return { label: 'Turno AM', time: '07:00' }
}

function shiftLabel(notes: string | null): { name: string; isAuto: boolean } {
  if (!notes) return { name: 'Turno', isAuto: false }
  const isAuto = notes.includes('Automático')
  if (notes.includes('AM')) return { name: 'Turno AM', isAuto }
  if (notes.includes('PM')) return { name: 'Turno PM', isAuto }
  return { name: notes.split('·')[0].trim(), isAuto }
}

const AREA_META: Record<string, { label: string; icon: string }> = {
  bar:      { label: 'Barra',    icon: '☕' },
  kitchen:  { label: 'Cocina',   icon: '🍳' },
  cocina:   { label: 'Cocina',   icon: '🍳' },
  salon:    { label: 'Salón',    icon: '🪑' },
  delivery: { label: 'Delivery', icon: '📦' },
}

function areaStatus(avgWait: number | null, baseline: number | null): 'ok' | 'warn' | 'critical' {
  if (avgWait == null) return 'ok'
  if (baseline != null && baseline > 0) {
    const ratio = avgWait / baseline
    if (ratio >= 1.6) return 'critical'
    if (ratio >= 1.3) return 'warn'
    return 'ok'
  }
  if (avgWait >= 15) return 'critical'
  if (avgWait >= 8)  return 'warn'
  return 'ok'
}

const STATUS_COLORS = {
  ok:       { bg: '#F0F5EE', text: '#3E6033', dot: '#6D8A5C', border: '#BDD4B5', label: 'OK' },
  warn:     { bg: '#FDF4E7', text: '#8A5A20', dot: '#C98933', border: '#E8CDA0', label: 'Lento' },
  critical: { bg: '#FDF1F0', text: '#7A3232', dot: '#B8574E', border: '#E8B5B2', label: 'Crítico' },
}

// ── Area tile ─────────────────────────────────────────────────────────────────
function AreaTile({ area_type, pending, avg_wait_min, baseline }: {
  area_type: string; pending: number; avg_wait_min: number | null; baseline: number | null
}) {
  const meta   = AREA_META[area_type] ?? { label: area_type, icon: '📍' }
  const status = areaStatus(avg_wait_min, baseline)
  const colors = STATUS_COLORS[status]

  return (
    <div className="flex-1 rounded-2xl px-3.5 py-3.5 border" style={{ background: colors.bg, borderColor: colors.border }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-lg leading-none">{meta.icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{ color: colors.text, background: colors.dot + '22' }}>
          {colors.label}
        </span>
      </div>
      <p className="text-[#1F1F1F] text-xs font-bold">{meta.label}</p>
      <p className="text-xl font-bold leading-tight mt-0.5" style={{ color: colors.text }}>
        {pending}
        <span className="text-[10px] font-semibold ml-1 opacity-70">pend.</span>
      </p>
      <p className="text-[10px] mt-1 opacity-60" style={{ color: colors.text }}>
        {avg_wait_min != null ? `Ø ${avg_wait_min.toFixed(0)} min` : 'Sin datos'}
      </p>
    </div>
  )
}

// ── Alert row ─────────────────────────────────────────────────────────────────
function AlertRow({ alert }: { alert: { type: string; area?: string; minutes: number; table_code?: string } }) {
  const isCritical = alert.minutes > 12
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#F0EDE8] last:border-0">
      <span className="w-2 h-2 rounded-full shrink-0 flex-shrink-0"
            style={{ background: isCritical ? '#B8574E' : '#C98933' }} />
      <div className="flex-1 min-w-0">
        {alert.type === 'card_unattended' && (
          <p className="text-[#1F1F1F] text-sm">
            <span className="font-bold">{AREA_META[alert.area ?? '']?.label ?? alert.area}</span>
            {' '}— comanda sin recibir
          </p>
        )}
        {alert.type === 'table_long' && (
          <p className="text-[#1F1F1F] text-sm">
            Mesa <span className="font-bold">{alert.table_code}</span> — abierta demasiado tiempo
          </p>
        )}
      </div>
      <span className={cn(
        'text-xs font-bold px-2.5 py-1 rounded-full shrink-0',
        isCritical ? 'bg-[#B8574E]/12 text-[#7A3232]' : 'bg-[#C98933]/12 text-[#8A5A20]'
      )}>
        {alert.minutes} min
      </span>
    </div>
  )
}

// ── Hourly load bar ───────────────────────────────────────────────────────────
function HourlyLoad({ loads }: { loads: Array<{ hour: number; cards: number; avg_prep_min: number | null }> }) {
  const max = Math.max(...loads.map(l => l.cards), 1)
  return (
    <div className="flex gap-1 items-end" style={{ height: 48 }}>
      {loads.map(l => {
        const pct = l.cards / max
        const color = pct > 0.7 ? '#B8574E' : pct > 0.4 ? '#C98933' : '#6D8A5C'
        return (
          <div key={l.hour} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full rounded-sm" style={{
              height: `${Math.max(pct * 36, l.cards > 0 ? 3 : 0)}px`,
              background: color,
              opacity: l.cards > 0 ? 1 : 0.15,
            }} />
            {l.hour % 2 === 0 && (
              <span className="text-[9px] text-[#A9A39C] leading-none">{l.hour}h</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Shift KPI chip ────────────────────────────────────────────────────────────
function ShiftKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#F7F5F0] rounded-xl px-3 py-3 text-center">
      <p className="section-label mb-1.5">{label}</p>
      <p className="text-[#1E3541] text-base font-bold leading-none">{value}</p>
    </div>
  )
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function OperationsPage() {
  const { shift, isActive, isLoading, startShift, endShift } = useActiveShift()
  const { data: kpis } = useRealtimeKPIs(30_000)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [, tick] = useState(0)

  useEffect(() => {
    if (!isActive) return
    const id = setInterval(() => tick(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [isActive])

  const { data: shiftAnalytics } = useQuery<ShiftSummary | null>({
    queryKey: ['analytics', 'shift', shift?.started_at],
    queryFn: async () => {
      if (!shift) return null
      const res = await fetch(`/api/analytics/shift?from=${shift.started_at}`)
      if (!res.ok) return null
      const json = await res.json()
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

  function handleStartNamed(notes: string) {
    startShift.mutate(notes, {
      onSuccess: () => toast.success('Turno iniciado'),
      onError:   (e) => toast.error(e.message),
    })
  }

  function handleClose(id: string) {
    endShift.mutate(id, {
      onSuccess: () => { setShowCloseModal(false); toast.success('Turno cerrado') },
      onError:   (e) => toast.error(e.message),
    })
  }

  function baselineForArea(type: string): number | null {
    return shiftAnalytics?.by_area?.find(
      (a: { area_type: string; avg_total_min: number | null }) => a.area_type === type
    )?.avg_total_min ?? null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F7F5F0]">
        <div className="w-8 h-8 border-2 border-[#E7E1D8] border-t-[#1E3541] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0]">

      {/* ── Dark hero ── */}
      <div className="bg-[#1E3541] px-5 pt-8 pb-6">
        <p className="section-label text-[#6D9EAA] mb-2">Centro Operativo</p>

        <div className="flex items-start justify-between gap-3">
          <div>
            {isActive && shift ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-white text-2xl font-bold tracking-tight">
                    {shiftLabel(shift.notes).name}
                  </h1>
                  {shiftLabel(shift.notes).isAuto && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6D8A5C]/25 text-[#A8D0A0] border border-[#6D8A5C]/30 shrink-0">
                      Auto
                    </span>
                  )}
                </div>
                <p className="text-[#9BBAC4] text-xs mt-1">
                  Desde las {fmtTime(shift.started_at)}
                  {shift.started_by_user && ` · ${shift.started_by_user.name}`}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-white text-2xl font-bold tracking-tight">Operaciones</h1>
                <p className="text-[#9BBAC4] text-xs mt-1">Sin turno activo</p>
              </>
            )}
          </div>

          {isActive ? (
            <button
              onClick={() => setShowCloseModal(true)}
              className="flex items-center gap-1.5 bg-[#B8574E]/20 text-[#FFBCB8] border border-[#B8574E]/30 text-xs font-bold px-3.5 py-2 rounded-xl press-scale shrink-0 mt-1"
            >
              Cerrar turno
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={startShift.isPending}
              className="flex items-center gap-1.5 bg-[#6D8A5C]/25 text-[#A8D0A0] border border-[#6D8A5C]/35 text-xs font-bold px-3.5 py-2 rounded-xl press-scale shrink-0 mt-1 disabled:opacity-50"
            >
              {startShift.isPending ? 'Abriendo…' : 'Abrir turno'}
            </button>
          )}
        </div>

        {/* Live indicators + next transition */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {isActive && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6D8A5C] dot-pulse shrink-0" />
                <span className="text-white/55 text-xs">{elapsed(shift!.started_at)}</span>
              </div>
              <span className="text-white/20 text-xs">·</span>
            </>
          )}
          {kpis && (
            <span className="text-white/55 text-xs">
              {kpis.tables_occupied}/{kpis.tables_total} mesas activas
            </span>
          )}
          {kpis && shiftAnalytics && (
            <>
              <span className="text-white/20 text-xs">·</span>
              <span className="text-white/55 text-xs">{shiftAnalytics.cards_total} comandas</span>
            </>
          )}
          <span className="text-white/20 text-xs">·</span>
          <span className="text-white/35 text-xs">
            Próximo: <strong className="text-white/50">{nextTransition().label}</strong> {nextTransition().time}
          </span>
        </div>
      </div>

      <div className="px-4 pt-4 pb-14 space-y-5">

        {/* ── No shift CTA ── */}
        {!isActive && (
          <div className="bg-white border-2 border-dashed border-[#E7E1D8] rounded-2xl p-8 text-center card-shadow">
            <div className="w-14 h-14 rounded-2xl bg-[#F7F5F0] flex items-center justify-center text-2xl mx-auto mb-4">⏸</div>
            <p className="text-[#1F1F1F] text-base font-bold">Sin turno activo</p>
            <p className="text-[#7A756D] text-xs mt-2 max-w-[220px] mx-auto leading-relaxed">
              Los turnos se abren automáticamente: AM a las 07:00 y PM a las 14:00. Puedes abrirlo manualmente si es necesario.
            </p>
            <div className="flex gap-2 justify-center mt-5">
              <button
                onClick={() => handleStartNamed('Turno AM · Manual')}
                disabled={startShift.isPending}
                className="bg-[#1E3541]/8 text-[#1E3541] border border-[#1E3541]/15 font-bold px-5 py-3 rounded-xl text-xs btn-primary disabled:opacity-50"
              >
                Abrir AM
              </button>
              <button
                onClick={() => handleStartNamed('Turno PM · Manual')}
                disabled={startShift.isPending}
                className="bg-[#1E3541] text-white font-bold px-5 py-3 rounded-xl text-xs btn-primary disabled:opacity-50"
              >
                {startShift.isPending ? 'Abriendo…' : 'Abrir PM'}
              </button>
            </div>
          </div>
        )}

        {/* ── Realtime: area tiles ── */}
        {kpis && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Ahora mismo</p>
              {kpis.longest_table_min > 0 && (
                <span className="text-[10px] text-[#7A756D]">
                  Mesa más larga: <strong className="text-[#1F1F1F]">{kpis.longest_table_min} min</strong>
                </span>
              )}
            </div>

            {kpis.area_stats.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {kpis.area_stats.map(a => (
                  <AreaTile
                    key={a.area_type}
                    area_type={a.area_type}
                    pending={a.pending}
                    avg_wait_min={a.avg_wait_min}
                    baseline={baselineForArea(a.area_type)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#E7E1D8] rounded-2xl p-5 text-center card-shadow">
                <p className="text-xl mb-1.5">✓</p>
                <p className="text-[#1F1F1F] text-sm font-semibold">Todas las estaciones libres</p>
                <p className="text-[#A9A39C] text-xs mt-1">Sin comandas pendientes</p>
              </div>
            )}
          </div>
        )}

        {/* ── Alert center ── */}
        {kpis && kpis.alerts.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label">Alertas</p>
              <span className="text-[10px] font-bold bg-[#B8574E]/10 text-[#7A3232] px-2 py-0.5 rounded-full border border-[#B8574E]/15">
                {kpis.alerts.length}
              </span>
            </div>
            <div className="bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden card-shadow">
              {kpis.alerts.map((al, i) => (
                <AlertRow key={i} alert={al} />
              ))}
            </div>
          </div>
        )}

        {/* ── Shift summary ── */}
        {isActive && shiftAnalytics && (
          <div>
            <p className="section-label mb-3">Resumen del turno</p>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <ShiftKpi label="Comandas"   value={String(shiftAnalytics.cards_total)} />
              <ShiftKpi label="Pedidos"    value={String(shiftAnalytics.orders_closed)} />
              <ShiftKpi label="Reacción"   value={fmt(shiftAnalytics.avg_reaction_time_min)} />
              <ShiftKpi label="Prep."      value={fmt(shiftAnalytics.avg_prep_time_min)} />
              <ShiftKpi label="Total"      value={fmt(shiftAnalytics.avg_total_time_min)} />
              <ShiftKpi label="Ciclo mesa" value={fmt(shiftAnalytics.avg_table_cycle_min)} />
            </div>

            {/* By area */}
            {shiftAnalytics.by_area.length > 0 && (
              <div className="bg-white border border-[#E7E1D8] rounded-2xl p-4 card-shadow mb-3">
                <p className="section-label mb-3">Por área</p>
                <div className="space-y-4">
                  {shiftAnalytics.by_area.map((a: { area_id: string; area_name: string; area_type: string; avg_reaction_min: number | null; avg_prep_min: number | null; avg_total_min: number | null; cards: number }) => (
                    <div key={a.area_id}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[#1F1F1F] text-xs font-bold">
                          {AREA_META[a.area_type]?.icon} {AREA_META[a.area_type]?.label ?? a.area_name}
                        </span>
                        <span className="text-[#A9A39C] text-[10px]">{a.cards} cmd.</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { l: 'Reacción', v: fmt(a.avg_reaction_min) },
                          { l: 'Prep.',    v: fmt(a.avg_prep_min) },
                          { l: 'Total',    v: fmt(a.avg_total_min) },
                        ].map(({ l, v }) => (
                          <div key={l} className="bg-[#F7F5F0] rounded-lg px-2 py-2 text-center">
                            <p className="section-label mb-1">{l}</p>
                            <p className="text-[#1E3541] text-xs font-bold">{v}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hourly load */}
            {shiftAnalytics.hourly_load.length > 0 && (
              <div className="bg-white border border-[#E7E1D8] rounded-2xl p-4 card-shadow mb-3">
                <p className="section-label mb-3">Carga por hora</p>
                <HourlyLoad loads={shiftAnalytics.hourly_load} />
              </div>
            )}

            {/* Staff leaderboard */}
            {shiftAnalytics.by_staff.length > 0 && (
              <div className="bg-white border border-[#E7E1D8] rounded-2xl overflow-hidden card-shadow">
                <div className="px-4 pt-3.5 pb-2.5">
                  <p className="section-label">Equipo — T. reacción</p>
                </div>
                {shiftAnalytics.by_staff.map((s: { user_id: string; name: string; cards_handled: number; avg_reaction_min: number | null }, i: number) => (
                  <div key={s.user_id} className="flex items-center gap-3 px-4 py-3 border-t border-[#F0EDE8]">
                    <span className="text-[#A9A39C] text-xs font-bold w-5 shrink-0 text-center">{i + 1}</span>
                    <div className="w-8 h-8 rounded-xl bg-[#1E3541]/8 flex items-center justify-center shrink-0">
                      <span className="text-[#1E3541] text-xs font-bold">{s.name[0]?.toUpperCase()}</span>
                    </div>
                    <span className="flex-1 text-[#1F1F1F] text-sm font-medium truncate">{s.name}</span>
                    <span className="text-[#A9A39C] text-xs shrink-0">{s.cards_handled} cmd.</span>
                    <span className="text-[#1E3541] text-sm font-bold shrink-0">{fmt(s.avg_reaction_min)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── History link ── */}
        <Link
          href="/admin/operations/history"
          className="flex items-center justify-between bg-white border border-[#E7E1D8] rounded-2xl px-4 py-3.5 card-shadow press-scale"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F7F5F0] flex items-center justify-center text-sm shrink-0">📊</div>
            <div>
              <p className="text-[#1F1F1F] text-sm font-semibold">Historial de turnos</p>
              <p className="text-[#A9A39C] text-xs">Turnos anteriores y métricas por período</p>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#A9A39C] shrink-0">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Link>

      </div>

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
