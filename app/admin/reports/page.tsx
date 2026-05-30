'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShiftStat { orders: number; avgTime: number }

interface AnalyticsData {
  period: number
  totalOrders: number
  avgOrderTime: number
  peakHour: { hour: number; count: number }
  ordersByDay: { date: string; count: number }[]
  ordersByHour: { hour: number; count: number }[]
  stationTimes: { name: string; type: string; avgMinutes: number; count: number }[]
  topItems: { name: string; am: number; pm: number; weekend: number; total: number }[]
  slowestItems: { name: string; avgMinutes: number }[]
  shiftStats: { am: ShiftStat; pm: ShiftStat; weekend: ShiftStat }
}

const PERIODS = [
  { label: '7 días',  value: 7  },
  { label: '30 días', value: 30 },
  { label: '90 días', value: 90 },
]

function fmtHour(h: number) {
  if (h === 0)  return '12am'
  if (h < 12)   return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function fmtMins(m: number) {
  if (m < 1)  return '<1 min'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = Math.round(m % 60)
  return r > 0 ? `${h}h ${r}m` : `${h}h`
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function Heatmap({ ordersByDay }: { ordersByDay: { date: string; count: number }[] }) {
  const max = Math.max(...ordersByDay.map((d) => d.count), 1)

  const weeks: typeof ordersByDay[] = []
  for (let i = 0; i < ordersByDay.length; i += 7) {
    weeks.push(ordersByDay.slice(i, i + 7))
  }

  const DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  function cellColor(count: number) {
    if (count === 0) return '#162B2F'
    const intensity = count / max
    if (intensity < 0.25) return '#1C3828'
    if (intensity < 0.5)  return '#2A5038'
    if (intensity < 0.75) return '#3D7050'
    return '#A7B897'
  }

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        <div className="flex flex-col gap-1 shrink-0 mr-0.5">
          {DOW.map((d) => (
            <div key={d} className="w-5 h-5 flex items-center justify-end">
              <span className="text-[9px] text-[#8A8278] font-medium">{d}</span>
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => {
          const firstDate = week[0]?.date
          const weekLabel = firstDate
            ? new Date(firstDate + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
            : ''
          return (
            <div key={wi} className="flex flex-col gap-1 shrink-0">
              {DOW.map((_, di) => {
                const entry = week[di]
                if (!entry) return <div key={di} className="w-5 h-5" />
                return (
                  <div
                    key={di}
                    title={`${entry.date}: ${entry.count} pedidos`}
                    className="w-5 h-5 rounded-sm transition-all"
                    style={{ background: cellColor(entry.count) }}
                  />
                )
              })}
              <span className="text-[8px] text-[#B0AB9F] text-center mt-0.5 leading-none">{weekLabel}</span>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span className="text-[9px] text-[#8A8278]">Menos</span>
        {[0, 0.25, 0.5, 0.75, 1].map((i) => (
          <div key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: cellColor(Math.round(i * max)) }} />
        ))}
        <span className="text-[9px] text-[#8A8278]">Más</span>
      </div>
    </div>
  )
}

// ── Bar chart (hourly) — colors follow shift boundaries ───────────────────────
function HourlyChart({ ordersByHour }: { ordersByHour: { hour: number; count: number }[] }) {
  const max = Math.max(...ordersByHour.map((h) => h.count), 1)

  function barColor(hour: number) {
    if (hour >= 7  && hour < 14) return '#EAD9B1'  // Turno AM
    if (hour >= 14 && hour < 21) return '#8BA0BE'  // Turno PM
    if (hour === 21)              return '#8BA0BE'  // cierre (~21:30)
    return '#D4CFC5'                               // fuera de turno
  }

  return (
    <div className="flex items-end gap-0.5 h-28">
      {ordersByHour.map(({ hour, count }) => {
        const pct = count === 0 ? 2 : Math.max(4, Math.round((count / max) * 100))
        return (
          <div key={hour} className="flex-1 flex flex-col items-center gap-1 group">
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{ height: `${pct}%`, background: barColor(hour), opacity: count === 0 ? 0.2 : 1 }}
              title={`${fmtHour(hour)}: ${count} pedidos`}
            />
            {(hour % 3 === 0) && (
              <span className="text-[8px] text-[#B0AB9F] leading-none shrink-0">{fmtHour(hour)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
function HBar({ label, value, max, color, sub }: {
  label: string; value: number; max: number; color: string; sub?: string
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 2
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[#3A3630] text-xs font-semibold truncate">{label}</p>
        {sub && <p className="text-[#B0AB9F] text-[10px]">{sub}</p>}
      </div>
      <div className="w-28 shrink-0">
        <div className="h-2 bg-[#F0EDE8] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <span className="text-[#3A3630] text-xs font-bold shrink-0 w-12 text-right">{fmtMins(value)}</span>
    </div>
  )
}

// ── Top items list ────────────────────────────────────────────────────────────
function TopItemsList({
  items,
  field,
  color,
}: {
  items: AnalyticsData['topItems']
  field: 'am' | 'pm' | 'weekend'
  color: string
}) {
  const top = [...items].sort((a, b) => b[field] - a[field]).slice(0, 6)
  const max = Math.max(...top.map((i) => i[field]), 1)
  return (
    <div className="space-y-2.5">
      {top.map((item, idx) => {
        const pct = Math.max(3, (item[field] / max) * 100)
        return (
          <div key={item.name} className="flex items-center gap-2.5">
            <span className="text-[10px] text-[#B0AB9F] font-bold w-4 shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[#3A3630] text-xs font-semibold truncate">{item.name}</p>
              <div className="mt-1 h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
              </div>
            </div>
            <span className="text-xs font-bold shrink-0" style={{ color }}>{item[field]}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }: {
  label: string; value: string; sub?: string; accent?: string
}) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3.5 border border-[#E8E4DC] card-shadow">
      <p className="text-[#8A8278] text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight" style={{ color: accent ?? '#0F3A43' }}>{value}</p>
      {sub && <p className="text-[#B0AB9F] text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Shift row ─────────────────────────────────────────────────────────────────
function ShiftRow({ label, hours, orders, avgTime, color, max }: {
  label: string; hours: string; orders: number; avgTime: number; color: string; max: number
}) {
  const pct = max > 0 ? Math.round((orders / max) * 100) : 0
  return (
    <div className="flex items-start gap-3">
      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[#3A3630] text-xs font-semibold">{label}</span>
            <span className="text-[#B0AB9F] text-[10px]">{hours}</span>
          </div>
          <span className="text-[#3A3630] text-xs font-bold shrink-0 ml-2">
            {orders} ped.
          </span>
        </div>
        <div className="h-1.5 bg-[#F0EDE8] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
        </div>
        <p className="text-[#B0AB9F] text-[10px] mt-0.5 text-right">
          {avgTime > 0 ? `Ø ${fmtMins(avgTime)} / pedido` : '—'}
        </p>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [period, setPeriod] = useState(30)

  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?period=${period}`)
      if (!res.ok) throw new Error('Error cargando métricas')
      return res.json()
    },
    staleTime: 60000,
  })

  const stationMax  = data ? Math.max(...data.stationTimes.map((s) => s.avgMinutes), 1) : 1
  const slowestMax  = data ? Math.max(...data.slowestItems.map((s) => s.avgMinutes), 1) : 1
  const shiftMax    = data?.shiftStats
    ? Math.max(data.shiftStats.am.orders, data.shiftStats.pm.orders, data.shiftStats.weekend.orders, 1)
    : 1

  return (
    <div className="min-h-screen bg-[#F6F2EA]">

      {/* Header */}
      <div className="px-5 pt-8 pb-5">
        <p className="text-[#8A8278] text-[10px] uppercase tracking-[0.2em] font-medium mb-1">Administración</p>
        <h1 className="text-[#252525] text-2xl font-bold tracking-tight">Flujo de Trabajo</h1>
        <p className="text-[#8A8278] text-xs mt-1">Métricas operacionales</p>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 px-5 mb-6">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-bold transition-all press-scale',
              period === p.value
                ? 'bg-[#0F3A43] text-white'
                : 'bg-white border border-[#E8E4DC] text-[#8A8278]'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-[#E8E4DC] border-t-[#0F3A43] rounded-full animate-spin" />
          <p className="text-[#8A8278] text-sm">Calculando métricas…</p>
        </div>
      ) : !data ? null : (
        <div className="px-5 space-y-5 pb-10">

          {/* ── Stat cards ── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Pedidos totales"
              value={String(data.totalOrders)}
              sub={`últimos ${data.period} días`}
              accent="#0F3A43"
            />
            <StatCard
              label="Tiempo promedio"
              value={fmtMins(data.avgOrderTime)}
              sub="pedido abierto → cerrado"
              accent="#A7B897"
            />
            <StatCard
              label="Hora pico"
              value={fmtHour(data.peakHour.hour)}
              sub={`${data.peakHour.count} pedidos`}
              accent="#EAD9B1"
            />
            <StatCard
              label="Estaciones"
              value={String(data.stationTimes.length)}
              sub={data.stationTimes.map((s) => s.name).join(' · ') || '—'}
              accent="#8BA0BE"
            />
          </div>

          {/* ── Turnos ── */}
          {data.shiftStats && <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] card-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[#252525] text-sm font-bold">Turnos</p>
                <p className="text-[#8A8278] text-xs mt-0.5">Pedidos y tiempo promedio por turno</p>
              </div>
              <span className="text-[10px] font-bold bg-[#F0EDE8] text-[#8A8278] px-2.5 py-1 rounded-full uppercase tracking-wider">
                {data.period} días
              </span>
            </div>
            <div className="space-y-4">
              <ShiftRow
                label="Turno AM"
                hours="L–V · 7:30–14:00"
                orders={data.shiftStats.am.orders}
                avgTime={data.shiftStats.am.avgTime}
                color="#EAD9B1"
                max={shiftMax}
              />
              <div className="h-px bg-[#F0EDE8]" />
              <ShiftRow
                label="Turno PM"
                hours="L–V · 14:00–21:30"
                orders={data.shiftStats.pm.orders}
                avgTime={data.shiftStats.pm.avgTime}
                color="#8BA0BE"
                max={shiftMax}
              />
              <div className="h-px bg-[#F0EDE8]" />
              <ShiftRow
                label="Fin de semana"
                hours="Sa–Do · 8:00–21:30"
                orders={data.shiftStats.weekend.orders}
                avgTime={data.shiftStats.weekend.avgTime}
                color="#A7B897"
                max={shiftMax}
              />
            </div>
          </div>}

          {/* ── Termómetro semanal ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] card-shadow">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[#252525] text-sm font-bold">Termómetro semanal</p>
                <p className="text-[#8A8278] text-xs mt-0.5">Volumen de pedidos por día</p>
              </div>
            </div>
            <Heatmap ordersByDay={data.ordersByDay} />
          </div>

          {/* ── Actividad por hora ── */}
          <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] card-shadow">
            <div className="mb-4">
              <p className="text-[#252525] text-sm font-bold">Actividad por hora</p>
              <p className="text-[#8A8278] text-xs mt-0.5">Distribución de pedidos a lo largo del día</p>
            </div>
            <HourlyChart ordersByHour={data.ordersByHour} />
            <div className="flex gap-4 mt-3">
              {[
                { label: 'Turno AM (7:30–14h)', color: '#EAD9B1' },
                { label: 'Turno PM (14–21:30h)', color: '#8BA0BE' },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[10px] text-[#8A8278]">{l.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Rendimiento por estación ── */}
          {data.stationTimes.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] card-shadow">
              <div className="mb-4">
                <p className="text-[#252525] text-sm font-bold">Rendimiento por estación</p>
                <p className="text-[#8A8278] text-xs mt-0.5">Tiempo promedio desde que llega la comanda hasta entrega</p>
              </div>
              <div className="space-y-3">
                {data.stationTimes.map((s) => (
                  <HBar
                    key={s.name}
                    label={s.name}
                    value={s.avgMinutes}
                    max={stationMax}
                    color={s.type === 'bar' ? '#A7B897' : '#C46F4E'}
                    sub={`${s.count} comandas`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Items por turno (AM vs PM) ── */}
          {data.topItems.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] card-shadow">
              <div className="mb-4">
                <p className="text-[#252525] text-sm font-bold">Turno AM vs Turno PM</p>
                <p className="text-[#8A8278] text-xs mt-0.5">Qué se vende más en cada turno</p>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#EAD9B1]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A8278]">AM</span>
                  </div>
                  <TopItemsList items={data.topItems} field="am" color="#D4A847" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#8BA0BE]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#8A8278]">PM</span>
                  </div>
                  <TopItemsList items={data.topItems} field="pm" color="#5A7A9E" />
                </div>
              </div>
            </div>
          )}

          {/* ── Items más lentos ── */}
          {data.slowestItems.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-[#E8E4DC] card-shadow">
              <div className="mb-4">
                <p className="text-[#252525] text-sm font-bold">Items más lentos</p>
                <p className="text-[#8A8278] text-xs mt-0.5">Tiempo promedio desde que la comanda llega a la estación</p>
              </div>
              <div className="space-y-3">
                {data.slowestItems.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="text-[10px] text-[#B0AB9F] font-bold w-4 shrink-0">{i + 1}</span>
                    <HBar label={item.name} value={item.avgMinutes} max={slowestMax} color="#C46F4E" />
                  </div>
                ))}
              </div>
              <p className="text-[#B0AB9F] text-[10px] mt-4">
                * Basado en tiempo de comanda por estación. Mínimo 2 muestras.
              </p>
            </div>
          )}

          {data.slowestItems.length === 0 && data.stationTimes.length === 0 && (
            <div className="flex flex-col items-center py-10">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-[#8A8278] text-sm font-medium">Sin suficientes datos aún</p>
              <p className="text-[#B0AB9F] text-xs mt-1">Las métricas se generan a medida que se completan pedidos</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
